import { getSql } from "../_lib/db.js";
import { getAuthUserId, json } from "../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  try {
    const uid = await getAuthUserId(request, env);
    if (!uid) return json(401, "Not authenticated");
    const sql = await getSql(env);
    const rows = await sql`SELECT id, username, email, created_at FROM users WHERE id = ${uid}`;
    if (!rows[0]) return json(401, "Not authenticated");
    return Response.json({ user: rows[0] });
  } catch (e) {
    console.error(e);
    return json(500, "Failed to load user.");
  }
}
