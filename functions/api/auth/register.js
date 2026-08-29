import { getSql } from "../_lib/db.js";
import { hashPassword, createToken, sessionCookie, json } from "../_lib/auth.js";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const uname = String(body.username || "").toLowerCase().trim();
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");

    if (!USERNAME_RE.test(uname)) {
      return json(400, "Username must be 3-20 characters: letters, numbers or underscores.");
    }
    if (!EMAIL_RE.test(email)) {
      return json(400, "Please enter a valid email address.");
    }
    if (password.length < 8) {
      return json(400, "Password must be at least 8 characters.");
    }

    const sql = await getSql(env);
    const byName = await sql`SELECT username FROM users WHERE username = ${uname} LIMIT 1`;
    if (byName.length) return json(409, `bio.jaafar.app/@${uname} is already taken.`);
    const byEmail = await sql`SELECT id FROM users WHERE lower(email) = ${email} LIMIT 1`;
    if (byEmail.length) return json(409, "An account with this email already exists.");

    const hash = await hashPassword(password);
    const rows = await sql`INSERT INTO users (username, email, password_hash)
      VALUES (${uname}, ${email}, ${hash})
      RETURNING id, username, email, created_at`;
    const user = rows[0];
    await sql`INSERT INTO profiles (user_id, name) VALUES (${user.id}, 'Your Name')
      ON CONFLICT (user_id) DO NOTHING`;

    const token = await createToken(env.SESSION_SECRET, user.id);
    return new Response(JSON.stringify({ user }), {
      headers: { "Content-Type": "application/json", "Set-Cookie": sessionCookie(token) },
    });
  } catch (e) {
    console.error(e);
    return json(500, "Registration failed. Please try again.");
  }
}
