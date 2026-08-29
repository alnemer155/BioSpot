import { getSql, getUserByEmail, getUserByUsername } from "../_lib/db.js";
import { verifyPassword, createToken, sessionCookie, json } from "../_lib/auth.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");

    const sql = await getSql(env);
    const user = EMAIL_RE.test(id)
      ? await getUserByEmail(sql, id)
      : await getUserByUsername(sql, id);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return json(401, "Invalid email/username or password.");
    }
    const token = await createToken(env.SESSION_SECRET, user.id);
    return new Response(
      JSON.stringify({ user: { id: user.id, username: user.username, email: user.email } }),
      { headers: { "Content-Type": "application/json", "Set-Cookie": sessionCookie(token) } }
    );
  } catch (e) {
    console.error(e);
    return json(500, "Login failed. Please try again.");
  }
}
