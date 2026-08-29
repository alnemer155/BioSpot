import { getSql, getProfile, getItems, upsertProfile, replaceItems } from "../_lib/db.js";
import { getAuthUserId, json } from "../_lib/auth.js";

const MAX_DATA_URL = 700_000;

function tooLarge(v) {
  return typeof v === "string" && v.length > MAX_DATA_URL;
}

export async function onRequestGet({ request, env }) {
  try {
    const uid = await getAuthUserId(request, env);
    if (!uid) return json(401, "Not authenticated");
    const sql = await getSql(env);
    const profile = await getProfile(sql, uid);
    const items = await getItems(sql, uid);
    return Response.json({
      profile:
        profile || { user_id: uid, name: "Your Name", title: null, bio: null, avatar_url: null },
      items,
    });
  } catch (e) {
    console.error(e);
    return json(500, "Failed to load data.");
  }
}

export async function onRequestPut({ request, env }) {
  try {
    const uid = await getAuthUserId(request, env);
    if (!uid) return json(401, "Not authenticated");
    const body = await request.json().catch(() => null);
    if (!body || !body.profile || !Array.isArray(body.items)) {
      return json(400, "Invalid payload.");
    }
    if (tooLarge(body.profile.avatar_url) || body.items.some((it) => tooLarge(it.image_url))) {
      return json(400, "Image is too large. Please use one under 500KB.");
    }
    const sql = await getSql(env);
    await upsertProfile(sql, uid, body.profile);
    await replaceItems(sql, uid, body.items);
    const profile = await getProfile(sql, uid);
    const items = await getItems(sql, uid);
    return Response.json({ profile, items });
  } catch (e) {
    console.error(e);
    return json(500, "Failed to save.");
  }
}
