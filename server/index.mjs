import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getSql,
  ensureUserRow,
  getUserByUsername,
  getProfile,
  getItems,
  upsertProfile,
  replaceItems,
  addEvent,
  getStats,
  USERNAME_RE,
} from "../functions/api/_lib/db.js";
import { verifySupabaseToken, json as jsonError } from "../functions/api/_lib/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "2mb" }));

const env = process.env;

// Identity middleware: verify Supabase JWT, ensure app user row.
async function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const su = await verifySupabaseToken(token, env);
  if (!su) return res.status(401).json({ error: "Not authenticated" });
  try {
    req.user = await ensureUserRow(await getSql(env), su);
    next();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load user." });
  }
}

app.post("/api/auth/username", requireAuth, async (req, res) => {
  try {
    const uname = String(req.body?.username || "").toLowerCase().trim();
    if (!USERNAME_RE.test(uname)) {
      return res.status(400).json({ error: "Username must be 3-20 characters: letters, numbers or underscores." });
    }
    const sql = await getSql(env);
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const su = await verifySupabaseToken(token, env);
    const taken = await sql`SELECT supabase_id FROM users WHERE username = ${uname}`;
    if (taken[0] && taken[0].supabase_id !== su.id) {
      return res.status(409).json({ error: `bio.jaafar.app/@${uname} is already taken.` });
    }
    await sql`UPDATE users SET username = ${uname} WHERE supabase_id = ${su.id}`;
    res.json({ user: await ensureUserRow(sql, { ...su, user_metadata: { username: uname } }) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not set username." });
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => res.json({ user: req.user }));

app.get("/api/bio", requireAuth, async (req, res) => {
  const sql = await getSql(env);
  const profile = await getProfile(sql, req.user.id);
  const items = await getItems(sql, req.user.id);
  res.json({
    profile: profile || { user_id: req.user.id, name: "Your Name", title: null, bio: null, avatar_url: null },
    items,
  });
});

app.put("/api/bio", requireAuth, async (req, res) => {
  try {
    const { profile, items } = req.body || {};
    if (!profile || !Array.isArray(items)) return res.status(400).json({ error: "Invalid payload." });
    const sql = await getSql(env);
    await upsertProfile(sql, req.user.id, profile);
    await replaceItems(sql, req.user.id, items);
    res.json({ profile: await getProfile(sql, req.user.id), items: await getItems(sql, req.user.id) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save." });
  }
});

app.get("/api/u/:username", async (req, res) => {
  const uname = String(req.params.username || "").toLowerCase().replace(/^@/, "");
  const sql = await getSql(env);
  const user = await getUserByUsername(sql, uname);
  if (!user) return res.status(404).json({ error: "This BioSpot page does not exist." });
  const profile = await getProfile(sql, user.id);
  const items = await getItems(sql, user.id, true);
  res.json({ profile: profile || { name: user.username }, items });
});

app.post("/api/u/:username", async (req, res) => {
  const uname = String(req.params.username || "").toLowerCase().replace(/^@/, "");
  const type = req.body?.type === "click" ? "click" : "view";
  const sql = await getSql(env);
  const user = await getUserByUsername(sql, uname);
  if (!user) return res.status(404).json({ error: "This BioSpot page does not exist." });
  if (type === "click" && !req.body?.itemId) return res.status(400).json({ error: "itemId required." });
  await addEvent(sql, user.id, type, req.body?.itemId || null, req.body?.lang || null);
  res.json({ ok: true });
});

app.get("/api/stats", requireAuth, async (req, res) => {
  const sql = await getSql(env);
  res.json(await getStats(sql, req.user.id));
});

app.get("/api/twitter", async (req, res) => {
  const handle = String(req.query.handle || "").trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
    return res.status(400).json({ error: "Enter a valid X handle." });
  }
  let name = handle;
  try {
    const r = await fetch(
      `https://cdn.syndication.twimg.com/widgets/followbutton/info.json?screen_names=${handle}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (r.ok) {
      const info = await r.json();
      if (Array.isArray(info) && info[0]) name = info[0].name || name;
    }
  } catch {}
  res.json({ handle, name, avatar_url: `https://unavatar.io/twitter/${handle}`, url: `https://x.com/${handle}` });
});

const dist = path.join(__dirname, "..", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(dist, "index.html")));
}

const port = Number(process.env.PORT || 8787);
getSql(env)
  .then(() => app.listen(port, () => console.log(`BioSpot API + web on http://localhost:${port}`)))
  .catch((e) => {
    console.error("Failed to init database:", e);
    process.exit(1);
  });
