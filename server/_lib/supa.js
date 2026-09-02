import { createClient } from "@supabase/supabase-js";

let _adminClient = null;
let _createContextClient = null;

async function loadSupaServer() {
  if (!_createContextClient) {
    const mod = await import("@supabase/server/core");
    _createContextClient = mod.createContextClient;
  }
}

function getAdminClient() {
  if (!_adminClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");
    _adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _adminClient;
}

export async function makeSupa(_env, token, admin = false) {
  if (admin) {
    return getAdminClient();
  }
  await loadSupaServer();
  if (token) {
    return _createContextClient({ auth: { token } });
  }
  return _createContextClient();
}

export const SLUG_RE = /^[a-z0-9_-]{2,30}$/;

export async function ensureDefaultPage(supa, userId, wantedSlug) {
  const { data: existing } = await supa
    .from("pages")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();
  if (existing) return existing;

  let slug = SLUG_RE.test(wantedSlug || "") ? wantedSlug : `user_${String(userId).replace(/-/g, "").slice(0, 10)}`;
  const clash = await supa.from("pages").select("id").eq("slug", slug).maybeSingle();
  if (clash.data) slug = `${slug.slice(0, 24)}_${String(userId).replace(/[^a-z0-9]/g, "").slice(0, 5)}`;
  const { data: page, error } = await supa
    .from("pages")
    .insert({ user_id: userId, slug, is_default: true })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return page;
}

export async function getPageBySlug(supa, slug) {
  const { data } = await supa.from("pages").select("*").eq("slug", slug).maybeSingle();
  return data || null;
}

export async function getPageById(supa, pageId) {
  const { data } = await supa.from("pages").select("*").eq("id", pageId).maybeSingle();
  return data || null;
}

export async function listPages(supa, userId) {
  const { data } = await supa
    .from("pages")
    .select("id, slug, name, is_default, created_at")
    .eq("user_id", userId)
    .order("created_at");
  return data || [];
}

export async function getItems(supa, pageId, onlyVisible = false) {
  let q = supa.from("items").select("*").eq("page_id", pageId).order("sort_order");
  if (onlyVisible) q = q.eq("visible", true);
  const { data } = await q;
  return data || [];
}

export async function savePage(supa, pageId, patch) {
  const { error } = await supa.from("pages").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", pageId);
  if (error) throw new Error(error.message);
}

export async function replaceItems(supa, pageId, items) {
  // Fetch existing items as backup before delete
  const { data: existing } = await supa.from("items").select("id").eq("page_id", pageId);
  const existingIds = (existing || []).map((r) => r.id);

  if (!items.length) {
    // Just delete all
    if (existingIds.length) {
      const { error } = await supa.from("items").delete().eq("page_id", pageId);
      if (error) throw new Error(error.message);
    }
    return;
  }

  const rows = items.map((it, i) => ({
    id: it.id,
    page_id: pageId,
    type: it.type,
    label: it.label ?? null,
    url: it.url ?? null,
    description: it.description ?? null,
    image_url: it.image_url ?? null,
    meta: it.meta ?? null,
    sort_order: typeof it.sort_order === "number" ? it.sort_order : i + 1,
    visible: it.visible !== false,
  }));

  // Insert new items first, then delete old ones (safer than delete-then-insert)
  const { error: insertError } = await supa.from("items").insert(rows);
  if (insertError) throw new Error(insertError.message);

  // Delete items that are no longer in the list
  const newIds = new Set(rows.map((r) => r.id).filter(Boolean));
  const toDelete = existingIds.filter((id) => !newIds.has(id));
  if (toDelete.length) {
    const { error: delError } = await supa.from("items").delete().in("id", toDelete);
    if (delError) throw new Error(delError.message);
  }
}

export async function addEvent(supa, pageId, type, itemId, lang, referrer, country) {
  await supa.from("events").insert({ page_id: pageId, type, item_id: itemId || null, lang: lang || null, referrer: referrer || null, country: country || null });
}

export async function getStats(supa, pageId) {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const [views, clicks, perItem, daily, referrers, countries] = await Promise.all([
    supa.from("events").select("id", { count: "exact", head: true }).eq("page_id", pageId).eq("type", "view"),
    supa.from("events").select("id", { count: "exact", head: true }).eq("page_id", pageId).eq("type", "click"),
    supa.from("events").select("item_id", { count: "exact", head: true }).eq("page_id", pageId).eq("type", "click"),
    supa.from("items").select("id, label, sort_order").eq("page_id", pageId).order("sort_order"),
    supa.from("events").select("referrer").eq("page_id", pageId).eq("type", "view").gte("created_at", since),
    supa.from("events").select("country").eq("page_id", pageId).eq("type", "view").gte("created_at", since),
  ]);
  const clicksByItem = {};
  const clickRows = await supa.from("events").select("item_id").eq("page_id", pageId).eq("type", "click");
  for (const r of clickRows.data || []) if (r.item_id) clicksByItem[r.item_id] = (clicksByItem[r.item_id] || 0) + 1;

  const refCounts = {};
  for (const r of referrers.data || []) {
    let host = "direct";
    try { host = r.referrer ? new URL(r.referrer).hostname : "direct"; } catch { host = "other"; }
    refCounts[host] = (refCounts[host] || 0) + 1;
  }
  const cCounts = {};
  for (const r of countries.data || []) {
    const c = r.country || "??";
    cCounts[c] = (cCounts[c] || 0) + 1;
  }
  const dayMap = {};
  for (const r of [...(referrers.data || []), ...(countries.data || [])]) {
    const day = r.created_at ? r.created_at.slice(0, 10) : null;
    if (!day) continue;
    dayMap[day] = dayMap[day] || { day, views: 0, clicks: 0 };
    dayMap[day].views++;
  }
  const clickDaily = await supa.from("events").select("created_at").eq("page_id", pageId).eq("type", "click").gte("created_at", since);
  for (const r of clickDaily.data || []) {
    const day = r.created_at.slice(0, 10);
    dayMap[day] = dayMap[day] || { day, views: 0, clicks: 0 };
    dayMap[day].clicks++;
  }

  return {
    views: views.count || 0,
    clicks: clicks.count || 0,
    perItem: (perItem.data || [])
      .map((it) => ({ id: it.id, label: it.label, clicks: clicksByItem[it.id] || 0 }))
      .filter((p) => p.clicks > 0),
    daily: Object.values(dayMap).sort((a, b) => a.day.localeCompare(b.day)),
    referrers: Object.entries(refCounts).map(([source, n]) => ({ source, n })).sort((a, b) => b.n - a.n).slice(0, 8),
    countries: Object.entries(cCounts).map(([country, n]) => ({ country, n })).sort((a, b) => b.n - a.n).slice(0, 8),
  };
}
