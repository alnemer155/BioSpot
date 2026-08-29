import { neon } from "@neondatabase/serverless";

// Lazily create the Neon HTTP client and ensure the schema exists once per isolate.
let sqlPromise = null;

export function getSql(env) {
  if (!sqlPromise) {
    sqlPromise = init(env.DATABASE_URL).catch((e) => {
      sqlPromise = null;
      throw e;
    });
  }
  return sqlPromise;
}

async function init(url) {
  if (!url) throw new Error("DATABASE_URL is not configured");
  const sql = neon(url);
  await sql`CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Your Name',
    title TEXT,
    bio TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('text','link','text_link','image')),
    label TEXT,
    url TEXT,
    description TEXT,
    image_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 1,
    visible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS items_user_idx ON items(user_id, sort_order)`;
  return sql;
}

export async function getUserByUsername(sql, username) {
  const rows = await sql`SELECT * FROM users WHERE username = ${username} LIMIT 1`;
  return rows[0] || null;
}

export async function getUserByEmail(sql, email) {
  const rows = await sql`SELECT * FROM users WHERE lower(email) = ${email.toLowerCase()} LIMIT 1`;
  return rows[0] || null;
}

export async function getProfile(sql, userId) {
  const rows = await sql`SELECT * FROM profiles WHERE user_id = ${userId} LIMIT 1`;
  return rows[0] || null;
}

export async function getItems(sql, userId, onlyVisible = false) {
  return onlyVisible
    ? sql`SELECT * FROM items WHERE user_id = ${userId} AND visible = true ORDER BY sort_order`
    : sql`SELECT * FROM items WHERE user_id = ${userId} ORDER BY sort_order`;
}

export async function upsertProfile(sql, userId, p) {
  await sql`INSERT INTO profiles (user_id, name, title, bio, avatar_url, updated_at)
    VALUES (${userId}, ${p.name || "Your Name"}, ${p.title || null}, ${p.bio || null}, ${
    p.avatar_url || null
  }, now())
    ON CONFLICT (user_id) DO UPDATE SET
      name = EXCLUDED.name,
      title = EXCLUDED.title,
      bio = EXCLUDED.bio,
      avatar_url = EXCLUDED.avatar_url,
      updated_at = now()`;
}

export async function replaceItems(sql, userId, items) {
  await sql`DELETE FROM items WHERE user_id = ${userId}`;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    await sql`INSERT INTO items (id, user_id, type, label, url, description, image_url, sort_order, visible)
      VALUES (${it.id}, ${userId}, ${it.type}, ${it.label ?? null}, ${it.url ?? null}, ${
      it.description ?? null
    }, ${it.image_url ?? null}, ${typeof it.sort_order === "number" ? it.sort_order : i + 1}, ${
      it.visible !== false
    })`;
  }
}
