import pg from "pg";

// Strip params node-postgres doesn't understand (e.g. channel_binding).
const raw = process.env.DATABASE_URL || "";
let connectionString = raw;
let ssl = false;
if (raw) {
  const url = new URL(raw);
  const sslmode = url.searchParams.get("sslmode");
  url.searchParams.delete("channel_binding");
  connectionString = url.toString();
  if (sslmode && sslmode !== "disable") {
    ssl = { rejectUnauthorized: false };
  }
}

export const pool = new pg.Pool({
  connectionString,
  ssl,
  max: 5,
});

export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS profiles (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT 'Your Name',
      title TEXT,
      bio TEXT,
      avatar_url TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS items (
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
    );

    CREATE INDEX IF NOT EXISTS items_user_idx ON items(user_id, sort_order);
  `);
}

export async function getUserByUsername(username) {
  const { rows } = await pool.query(
    "SELECT id, username, email, password_hash, created_at FROM users WHERE username = $1",
    [username]
  );
  return rows[0] || null;
}

export async function getUserByEmail(email) {
  const { rows } = await pool.query(
    "SELECT id, username, email, password_hash, created_at FROM users WHERE lower(email) = $1",
    [email.toLowerCase()]
  );
  return rows[0] || null;
}

export async function getProfile(userId) {
  const { rows } = await pool.query("SELECT * FROM profiles WHERE user_id = $1", [userId]);
  return rows[0] || null;
}

export async function getItems(userId, onlyVisible = false) {
  const q = onlyVisible
    ? "SELECT * FROM items WHERE user_id = $1 AND visible = true ORDER BY sort_order"
    : "SELECT * FROM items WHERE user_id = $1 ORDER BY sort_order";
  const { rows } = await pool.query(q, [userId]);
  return rows;
}

export async function upsertProfile(userId, p) {
  await pool.query(
    `INSERT INTO profiles (user_id, name, title, bio, avatar_url, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (user_id) DO UPDATE SET
       name = EXCLUDED.name,
       title = EXCLUDED.title,
       bio = EXCLUDED.bio,
       avatar_url = EXCLUDED.avatar_url,
       updated_at = now()`,
    [userId, p.name || "Your Name", p.title || null, p.bio || null, p.avatar_url || null]
  );
}

const ITEM_FIELDS = ["type", "label", "url", "description", "image_url", "sort_order", "visible"];

export async function replaceItems(userId, items) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM items WHERE user_id = $1", [userId]);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await client.query(
        `INSERT INTO items (id, user_id, type, label, url, description, image_url, sort_order, visible)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          it.id,
          userId,
          it.type,
          it.label ?? null,
          it.url ?? null,
          it.description ?? null,
          it.image_url ?? null,
          typeof it.sort_order === "number" ? it.sort_order : i + 1,
          it.visible !== false,
        ]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
