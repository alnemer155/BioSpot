import {
  makeSupa,
  ensureDefaultPage,
  getPageById,
  getItems,
  savePage,
  replaceItems,
} from "../_lib/supa.js";
import { getSupabaseUser, json } from "../_lib/auth.js";

const MAX_DATA_URL = 700_000;
const tooLarge = (v) => typeof v === "string" && v.length > MAX_DATA_URL;

const PAGE_FIELDS = ["name", "title", "bio", "avatar_url", "font", "translations", "style"];

async function authPage(request, env, pageId) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const su = await getSupabaseUser(request, env);
  if (!su) return { error: json(401, "Not authenticated") };
  const supa = makeSupa(env, token);
  const page = pageId ? await getPageById(supa, pageId) : await ensureDefaultPage(supa, su.id, su.user_metadata?.username);
  if (!page || page.user_id !== su.id) return { error: json(403, "Page not found.") };
  return { supa, page };
}

export async function onRequestGet({ request, env, params }) {
  try {
    const pageId = new URL(request.url).searchParams.get("page") || undefined;
    const ctx = await authPage(request, env, pageId);
    if (ctx.error) return ctx.error;
    const items = await getItems(ctx.supa, ctx.page.id);
    return Response.json({ profile: ctx.page, items });
  } catch (e) {
    console.error(e);
    return json(500, "Failed to load data.");
  }
}

export async function onRequestPut({ request, env, params }) {
  try {
    const pageId = new URL(request.url).searchParams.get("page") || undefined;
    const ctx = await authPage(request, env, pageId);
    if (ctx.error) return ctx.error;
    const body = await request.json().catch(() => null);
    if (!body || !body.profile || !Array.isArray(body.items)) {
      return json(400, "Invalid payload.");
    }
    if (tooLarge(body.profile.avatar_url) || body.items.some((it) => tooLarge(it.image_url) || tooLarge(it.url))) {
      return json(400, "File is too large. Please use one under 500KB.");
    }
    const patch = {};
    for (const f of PAGE_FIELDS) if (f in body.profile) patch[f] = body.profile[f];
    await savePage(ctx.supa, ctx.page.id, patch);
    await replaceItems(ctx.supa, ctx.page.id, body.items);
    const items = await getItems(ctx.supa, ctx.page.id);
    const { data: profile } = await ctx.supa.from("pages").select("*").eq("id", ctx.page.id).maybeSingle();
    return Response.json({ profile, items });
  } catch (e) {
    console.error(e);
    return json(500, e.message || "Failed to save.");
  }
}
