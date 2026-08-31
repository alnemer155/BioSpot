import { makeSupa, ensureDefaultPage } from "../_lib/supa.js";
import { getSupabaseUser, json } from "../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  try {
    const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const su = await getSupabaseUser(request, env);
    if (!su) return json(401, "Not authenticated");
    const supa = makeSupa(env, token);
    const page = await ensureDefaultPage(supa, su.id, su.user_metadata?.username);
    return Response.json({
      user: { id: su.id, email: su.email, page_id: page.id, slug: page.slug },
    });
  } catch (e) {
    console.error(e);
    return json(500, "Failed to load user.");
  }
}
