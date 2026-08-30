import { neon } from "@neondatabase/serverless";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

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
    password_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_id TEXT`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_supabase_idx ON users(supabase_id)`;

  await sql`CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Your Name',
    title TEXT,
    bio TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS font TEXT`;
  await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS translations JSONB`;

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

  await sql`CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('view','click')),
    item_id UUID,
    lang TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS events_user_idx ON events(user_id, created_at)`;
  return sql;
}

export { USERNAME_RE };

// Find-or-create the app user row for a verified Supabase auth user.
export async function ensureUserRow(sql, su) {
  const meta = su.user_metadata || {};
  let wanted = String(meta.username || "").toLowerCase();
  if (!USERNAME_RE.test(wanted)) wanted = "";
  if (!wanted) {
    const rows = await sql`SELECT id, username FROM users WHERE supabase_id = ${su.id}`;
    if (rows[0]) wanted = rows[0].username;
  }
  if (!wanted) {
    wanted = `user_${String(su.id).replace(/-/g, "").slice(0, 10)}`;
  }
  // If wanted username is taken by a different supabase account, fall back.
  const taken = await sql`SELECT supabase_id FROM users WHERE username = ${wanted}`;
  if (taken[0] && taken[0].supabase_id !== su.id) {
    const emailPrefix = String(su.email || "").split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
    wanted = USERNAME_RE.test(emailPrefix) && emailPrefix.length >= 3
      ? emailPrefix
      : `user_${String(su.id).replace(/-/g, "").slice(0, 10)}`;
    const taken2 = await sql`SELECT supabase_id FROM users WHERE username = ${wanted}`;
    if (taken2[0] && taken2[0].supabase_id !== su.id) {
      wanted = `${wanted.slice(0, 14)}_${String(su.id).replace(/[^a-z0-9]/g, "").slice(0, 4)}`;
    }
  }
  const rows = await sql`INSERT INTO users (supabase_id, username, email, password_hash)
    VALUES (${su.id}, ${wanted}, ${String(su.email || "").toLowerCase()}, null)
    ON CONFLICT (supabase_id) DO UPDATE SET email = EXCLUDED.email
    RETURNING id, username, email, created_at`;
  const user = rows[0];
  await sql`INSERT INTO profiles (user_id) VALUES (${user.id}) ON CONFLICT (user_id) DO NOTHING`;
  return user;
}

export async function getUserByUsername(sql, username) {
  const rows = await sql`SELECT * FROM users WHERE username = ${username} LIMIT 1`;
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
  await sql`INSERT INTO profiles (user_id, name, title, bio, avatar_url, font, translations, updated_at)
    VALUES (${userId}, ${p.name || "Your Name"}, ${p.title || null}, ${p.bio || null}, ${
    p.avatar_url || null
  }, ${p.font || null}, ${p.translations ? JSON.stringify(p.translations) : null}, now())
    ON CONFLICT (user_id) DO UPDATE SET
      name = EXCLUDED.name,
      title = EXCLUDED.title,
      bio = EXCLUDED.bio,
      avatar_url = EXCLUDED.avatar_url,
      font = EXCLUDED.font,
      translations = EXCLUDED.translations,
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

export async function addEvent(sql, userId, type, itemId, lang) {
  await sql`INSERT INTO events (user_id, type, item_id, lang)
    VALUES (${userId}, ${type}, ${itemId || null}, ${lang || null})`;
}

export async function getStats(sql, userId) {
  const totals = await sql`SELECT type, count(*)::int AS n FROM events
    WHERE user_id = ${userId} GROUP BY type`;
  const perItem = await sql`SELECT i.id, i.label, count(e.id)::int AS clicks
    FROM items i LEFT JOIN events e ON e.item_id = i.id AND e.type = 'click'
    WHERE i.user_id = ${userId} GROUP BY i.id, i.label, i.sort_order ORDER BY i.sort_order`;
  const daily = await sql`SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
    count(*) FILTER (WHERE type = 'view')::int AS views,
    count(*) FILTER (WHERE type = 'click')::int AS clicks
    FROM events WHERE user_id = ${userId} AND created_at > now() - interval '7 days'
    GROUP BY 1 ORDER BY 1`;
  return {
    views: totals.find((t) => t.type === "view")?.n || 0,
    clicks: totals.find((t) => t.type === "click")?.n || 0,
    perItem: perItem.filter((p) => p.clicks > 0),
    daily,
  };
}
