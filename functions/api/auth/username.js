import { makeSupa, ensureDefaultPage, SLUG_RE } from "../_lib/supa.js";
import { getSupabaseUser, json } from "../_lib/auth.js";

// Claim a username after Supabase signup. Body: { username }
export async function onRequestPost({ request, env }) {
  try {
    const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const su = await getSupabaseUser(request, env);
    if (!su) return json(401, "Not authenticated");
    const body = await request.json().catch(() => ({}));
    const slug = String(body.username || "").toLowerCase().trim();
    if (!SLUG_RE.test(slug)) {
      return json(400, "Username must be 2-30 characters: letters, numbers, underscores or dashes.");
    }
    const supa = makeSupa(env, token);
    const taken = await makeSupa(env)
      .from("pages")
      .select("id, user_id")
      .eq("slug", slug)
      .maybeSingle();
    if (taken.data && taken.data.user_id !== su.id) {
      return json(409, `linktroo.cc/@${slug} is already taken.`);
    }
    const current = await ensureDefaultPage(supa, su.id, su.user_metadata?.username);
    await supa.from("pages").update({ slug, is_default: true }).eq("id", current.id);
    return Response.json({ user: { id: su.id, email: su.email, page_id: current.id, slug } });
  } catch (e) {
    console.error(e);
    return json(500, e.message || "Could not set username. Please try again.");
  }
}
