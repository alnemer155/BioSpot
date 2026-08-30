import { getSql, ensureUserRow, USERNAME_RE } from "../_lib/db.js";
import { getSupabaseUser, json } from "../_lib/auth.js";

// Claim a username after Supabase signup. Body: { username }
export async function onRequestPost({ request, env }) {
  try {
    const su = await getSupabaseUser(request, env);
    if (!su) return json(401, "Not authenticated");
    const body = await request.json().catch(() => ({}));
    const uname = String(body.username || "").toLowerCase().trim();
    if (!USERNAME_RE.test(uname)) {
      return json(400, "Username must be 3-20 characters: letters, numbers or underscores.");
    }
    const sql = await getSql(env);
    const taken = await sql`SELECT supabase_id FROM users WHERE username = ${uname}`;
    if (taken[0] && taken[0].supabase_id !== su.id) {
      return json(409, `bio.jaafar.app/@${uname} is already taken.`);
    }
    await sql`UPDATE users SET username = ${uname} WHERE supabase_id = ${su.id}`;
    const user = await ensureUserRow(sql, { ...su, user_metadata: { username: uname } });
    return Response.json({ user });
  } catch (e) {
    console.error(e);
    return json(500, "Could not set username. Please try again.");
  }
}
