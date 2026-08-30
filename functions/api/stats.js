import { getSql, ensureUserRow, getStats } from "./_lib/db.js";
import { getSupabaseUser, json } from "./_lib/auth.js";

export async function onRequestGet({ request, env }) {
  try {
    const su = await getSupabaseUser(request, env);
    if (!su) return json(401, "Not authenticated");
    const sql = await getSql(env);
    const user = await ensureUserRow(sql, su);
    return Response.json(await getStats(sql, user.id));
  } catch (e) {
    console.error(e);
    return json(500, "Failed to load stats.");
  }
}
