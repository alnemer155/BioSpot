import { makeSupa, getPageBySlug, getItems, addEvent, ensureDefaultPage } from "../_lib/supa.js";
import { getSupabaseUser, json } from "../_lib/auth.js";

// Public bio by username — linktroo.cc/@username (the user's default page).
export async function onRequestGet({ env, params }) {
  try {
    const uname = decodeURIComponent(params.username || "")
      .toLowerCase()
      .replace(/^@/, "");
    if (!uname) return json(404, "This LinkTroo page does not exist.");
    const supa = makeSupa(env);
    let page = await getPageBySlug(supa, uname);
    if (!page) {
      // Legacy fallback: user signed up but never claimed a slug.
      const { data } = await supa.from("pages").select("*").eq("slug", `user_${uname}`).maybeSingle();
      page = data || null;
    }
    if (!page) return json(404, "This LinkTroo page does not exist.");
    const items = await getItems(supa, page.id, true);
    return Response.json({ profile: page, items });
  } catch (e) {
    console.error(e);
    return json(500, "Failed to load page.");
  }
}

// Public tracking: { type: 'view' | 'click', itemId?, lang?, referrer? }
export async function onRequestPost({ request, env, params }) {
  try {
    const uname = decodeURIComponent(params.username || "")
      .toLowerCase()
      .replace(/^@/, "");
    const body = await request.json().catch(() => ({}));
    const type = body.type === "click" ? "click" : "view";
    const supa = makeSupa(env);
    const page = await getPageBySlug(supa, uname);
    if (!page) return json(404, "This LinkTroo page does not exist.");
    if (type === "click" && !body.itemId) return json(400, "itemId required for click.");
    const country = request.headers.get("cf-ipcountry") || null;
    await addEvent(supa, page.id, type, body.itemId || null, body.lang || null, body.referrer || null, country);
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return json(500, "Failed to track.");
  }
}
