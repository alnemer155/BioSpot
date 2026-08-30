import { getSql, getUserByUsername, getProfile, getItems, addEvent } from "../_lib/db.js";
import { json } from "../_lib/auth.js";

export async function onRequestGet({ env, params }) {
  try {
    const uname = decodeURIComponent(params.username || "")
      .toLowerCase()
      .replace(/^@/, "");
    if (!uname) return json(404, "This BioSpot page does not exist.");
    const sql = await getSql(env);
    const user = await getUserByUsername(sql, uname);
    if (!user) return json(404, "This BioSpot page does not exist.");
    const profile = await getProfile(sql, user.id);
    const items = await getItems(sql, user.id, true);
    return Response.json({
      profile:
        profile || { name: user.username, title: null, bio: null, avatar_url: null },
      items,
    });
  } catch (e) {
    console.error(e);
    return json(500, "Failed to load page.");
  }
}

// Public tracking: { type: 'view' | 'click', itemId?, lang? }
export async function onRequestPost({ request, env, params }) {
  try {
    const uname = decodeURIComponent(params.username || "")
      .toLowerCase()
      .replace(/^@/, "");
    const body = await request.json().catch(() => ({}));
    const type = body.type === "click" ? "click" : "view";
    const sql = await getSql(env);
    const user = await getUserByUsername(sql, uname);
    if (!user) return json(404, "This BioSpot page does not exist.");
    if (type === "click" && !body.itemId) return json(400, "itemId required for click.");
    await addEvent(sql, user.id, type, body.itemId || null, body.lang || null);
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return json(500, "Failed to track.");
  }
}
