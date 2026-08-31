import { makeSupa, getPageBySlug, getItems, addEvent } from "../_lib/supa.js";
import { json } from "../_lib/auth.js";

// Public page by slug — linktroo.cc/~/slug
export async function onRequestGet({ env, params }) {
  try {
    const slug = decodeURIComponent(params.slug || "").toLowerCase();
    if (!slug) return json(404, "This page does not exist.");
    const supa = makeSupa(env);
    const page = await getPageBySlug(supa, slug);
    if (!page) return json(404, "This page does not exist.");
    const items = await getItems(supa, page.id, true);
    return Response.json({
      profile: page,
      items,
    });
  } catch (e) {
    console.error(e);
    return json(500, "Failed to load page.");
  }
}

// Public tracking: { type: 'view' | 'click', itemId?, lang?, referrer? }
export async function onRequestPost({ request, env, params }) {
  try {
    const slug = decodeURIComponent(params.slug || "").toLowerCase();
    const body = await request.json().catch(() => ({}));
    const type = body.type === "click" ? "click" : "view";
    const supa = makeSupa(env);
    const page = await getPageBySlug(supa, slug);
    if (!page) return json(404, "This page does not exist.");
    if (type === "click" && !body.itemId) return json(400, "itemId required for click.");
    const country = request.headers.get("cf-ipcountry") || null;
    await addEvent(supa, page.id, type, body.itemId || null, body.lang || null, body.referrer || null, country);
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return json(500, "Failed to track.");
  }
}
