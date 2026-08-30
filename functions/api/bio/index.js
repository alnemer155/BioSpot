import { getSql, ensureUserRow, getProfile, getItems, upsertProfile, replaceItems } from "../_lib/db.js";
import { getSupabaseUser, json } from "../_lib/auth.js";

const MAX_DATA_URL = 700_000;
const tooLarge = (v) => typeof v === "string" && v.length > MAX_DATA_URL;

async function auth(request, env) {
  const su = await getSupabaseUser(request, env);
  if (!su) return null;
  const sql = await getSql(env);
  return { sql, user: await ensureUserRow(sql, su) };
}

export async function onRequestGet({ request, env }) {
  try {
    const ctx = await auth(request, env);
    if (!ctx) return json(401, "Not authenticated");
    const profile = await getProfile(ctx.sql, ctx.user.id);
    const items = await getItems(ctx.sql, ctx.user.id);
    return Response.json({
      profile:
        profile || { user_id: ctx.user.id, name: "Your Name", title: null, bio: null, avatar_url: null },
      items,
    });
  } catch (e) {
    console.error(e);
    return json(500, "Failed to load data.");
  }
}

export async function onRequestPut({ request, env }) {
  try {
    const ctx = await auth(request, env);
    if (!ctx) return json(401, "Not authenticated");
    const body = await request.json().catch(() => null);
    if (!body || !body.profile || !Array.isArray(body.items)) {
      return json(400, "Invalid payload.");
    }
    if (tooLarge(body.profile.avatar_url) || body.items.some((it) => tooLarge(it.image_url))) {
      return json(400, "Image is too large. Please use one under 500KB.");
    }
    await upsertProfile(ctx.sql, ctx.user.id, body.profile);
    await replaceItems(ctx.sql, ctx.user.id, body.items);
    const profile = await getProfile(ctx.sql, ctx.user.id);
    const items = await getItems(ctx.sql, ctx.user.id);
    return Response.json({ profile, items });
  } catch (e) {
    console.error(e);
    return json(500, "Failed to save.");
  }
}
