import { makeSupa, ensureDefaultPage, getPageById, getStats } from "./_lib/supa.js";
import { getSupabaseUser, json } from "./_lib/auth.js";

export async function onRequestGet({ request, env }) {
  try {
    const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const su = await getSupabaseUser(request, env);
    if (!su) return json(401, "Not authenticated");
    const supa = makeSupa(env, token);
    const pageId = new URL(request.url).searchParams.get("page");
    const page = pageId ? await getPageById(supa, pageId) : await ensureDefaultPage(supa, su.id, su.user_metadata?.username);
    if (!page || page.user_id !== su.id) return json(403, "Page not found.");
    return Response.json(await getStats(supa, page.id));
  } catch (e) {
    console.error(e);
    return json(500, "Failed to load stats.");
  }
}
