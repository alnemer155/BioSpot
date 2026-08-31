import { makeSupa, listPages, SLUG_RE } from "./_lib/supa.js";
import { getSupabaseUser, json } from "./_lib/auth.js";

// Multi-page accounts: list and create pages.
export async function onRequestGet({ request, env }) {
  try {
    const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const su = await getSupabaseUser(request, env);
    if (!su) return json(401, "Not authenticated");
    const pages = await listPages(makeSupa(env, token), su.id);
    return Response.json({ pages });
  } catch (e) {
    console.error(e);
    return json(500, "Failed to load pages.");
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const su = await getSupabaseUser(request, env);
    if (!su) return json(401, "Not authenticated");
    const body = await request.json().catch(() => ({}));
    const base = String(body.slug || "").toLowerCase().trim().replace(/[^a-z0-9_-]/g, "-");
    const slug = SLUG_RE.test(base) ? base : `page-${Date.now().toString(36).slice(-6)}`;
    const supa = makeSupa(env, token);
    const existing = await listPages(supa, su.id);
    if (existing.length >= 10) return json(400, "Page limit reached (10).");
    const taken = await makeSupa(env).from("pages").select("id").eq("slug", slug).maybeSingle();
    if (taken.data) return json(409, `linktroo.cc/~/${slug} is already taken.`);
    const { data, error } = await supa
      .from("pages")
      .insert({ user_id: su.id, slug, name: body.name || "New Page", is_default: existing.length === 0 })
      .select()
      .single();
    if (error) return json(400, error.message);
    return Response.json({ page: data });
  } catch (e) {
    console.error(e);
    return json(500, "Failed to create page.");
  }
}
