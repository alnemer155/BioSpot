import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  makeSupa,
  ensureDefaultPage,
  getPageById,
  getPageBySlug,
  listPages,
  getItems,
  savePage,
  replaceItems,
  addEvent,
  getStats,
  SLUG_RE,
} from "./_lib/supa.js";
import { verifyToken, getAdminClient } from "./_lib/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_PUB = process.env.SUPABASE_PUBLISHABLE_KEY;
const SUPA_SEC = process.env.SUPABASE_SECRET_KEY;

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    const r = await fetch(`${SUPA_URL}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: SUPA_PUB, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const text = await r.text();
    const data = text ? JSON.parse(text) : {};
    console.log("[signup]", r.status, data.access_token ? "OK" : JSON.stringify(data).slice(0, 200));
    if (!r.ok) return res.status(r.status).json({ error: data.msg || data.error_description || "Signup failed" });
    res.json({ session: { access_token: data.access_token, refresh_token: data.refresh_token }, user: data.user });
  } catch (e) {
    console.error("[signup] crash:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/auth/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: SUPA_PUB, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const text = await r.text();
    const data = text ? JSON.parse(text) : {};
    console.log("[signin]", r.status, data.access_token ? "OK" : JSON.stringify(data).slice(0, 200));
    if (!r.ok) return res.status(r.status).json({ error: data.msg || data.error_description || "Signin failed" });
    res.json({ session: { access_token: data.access_token, refresh_token: data.refresh_token }, user: data.user });
  } catch (e) {
    console.error("[signin] crash:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (token) {
      await fetch(`${SUPA_URL}/auth/v1/logout`, {
        method: "POST",
        headers: { apikey: SUPA_PUB, Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

async function auth(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const result = await verifyToken(token);
  if (!result) return null;
  const supa = makeSupa(null, result.token);
  return { supa, userClaims: result.userClaims, token: result.token };
}

const SHORT_USERNAME_LIMIT = 50;

app.post("/api/auth/username", async (req, res) => {
  try {
    const ctx = await auth(req);
    if (!ctx) return res.status(401).json({ error: "Not authenticated" });
    const slug = String(req.body?.username || "").toLowerCase().trim();
    if (!SLUG_RE.test(slug)) return res.status(400).json({ error: "Invalid username." });

    if (slug.length < 3) {
      const adminSupa = getAdminClient();
      const { count } = await adminSupa.from("pages").select("id", { count: "exact", head: true }).eq("is_default", true);
      if ((count || 0) >= SHORT_USERNAME_LIMIT) {
        return res.status(400).json({ error: `Short usernames (2 chars) are only available for the first ${SHORT_USERNAME_LIMIT} users.` });
      }
    }

    const checkSupa = getAdminClient();
    const { data: existing } = await checkSupa.from("pages").select("id").eq("slug", slug).maybeSingle();
    if (existing) return res.status(409).json({ error: "This username is already taken." });

    const current = await ensureDefaultPage(ctx.supa, ctx.userClaims.id);
    await ctx.supa.from("pages").update({ slug, is_default: true }).eq("id", current.id);
    res.json({ user: { id: ctx.userClaims.id, slug } });
  } catch (e) {
    console.error("[username] error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const ctx = await auth(req);
    if (!ctx) return res.status(401).json({ error: "Not authenticated" });
    const page = await ensureDefaultPage(ctx.supa, ctx.userClaims.id);
    res.json({ user: { id: ctx.userClaims.id, email: ctx.userClaims.email, page_id: page.id, slug: page.slug } });
  } catch (e) {
    console.error("[me] error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/pages", async (req, res) => {
  try {
    const ctx = await auth(req);
    if (!ctx) return res.status(401).json({ error: "Not authenticated" });
    res.json({ pages: await listPages(ctx.supa, ctx.userClaims.id) });
  } catch (e) {
    console.error("[pages] error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/bio", async (req, res) => {
  try {
    const ctx = await auth(req);
    if (!ctx) return res.status(401).json({ error: "Not authenticated" });
    const page = req.query.page
      ? await getPageById(ctx.supa, String(req.query.page))
      : await ensureDefaultPage(ctx.supa, ctx.userClaims.id);
    if (!page || page.user_id !== ctx.userClaims.id) return res.status(403).json({ error: "Page not found." });
    res.json({ profile: page, items: await getItems(ctx.supa, page.id) });
  } catch (e) {
    console.error("[bio] error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/bio", async (req, res) => {
  try {
    const ctx = await auth(req);
    if (!ctx) return res.status(401).json({ error: "Not authenticated" });
    const page = req.query.page
      ? await getPageById(ctx.supa, String(req.query.page))
      : await ensureDefaultPage(ctx.supa, ctx.userClaims.id);
    if (!page || page.user_id !== ctx.userClaims.id) return res.status(403).json({ error: "Page not found." });
    const { profile, items } = req.body || {};
    if (!profile || !Array.isArray(items)) return res.status(400).json({ error: "Invalid payload." });
    const patch = {};
    for (const f of ["name", "title", "bio", "avatar_url", "font", "translations", "style"]) {
      if (f in profile) patch[f] = profile[f];
    }
    await savePage(ctx.supa, page.id, patch);
    await replaceItems(ctx.supa, page.id, items);
    const fresh = await getPageById(ctx.supa, page.id);
    res.json({ profile: fresh, items: await getItems(ctx.supa, page.id) });
  } catch (e) {
    console.error("[bio:put] error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/upload", async (req, res) => {
  const ctx = await auth(req);
  if (!ctx) return res.status(401).json({ error: "Not authenticated" });
  try {
    const { file, filename } = req.body || {};
    if (!file || !filename) return res.status(400).json({ error: "Missing file data." });
    const buf = Buffer.from(file, "base64");
    const safeName = filename.replace(/[^\w.\-]/g, "_");
    const filePath = `${ctx.userClaims.id}/${Date.now()}-${safeName}`;
    const { error } = await ctx.supa.storage.from("files").upload(filePath, buf, {
      contentType: req.body.contentType || "application/octet-stream",
    });
    if (error) return res.status(500).json({ error: error.message });
    const { data } = ctx.supa.storage.from("files").getPublicUrl(filePath);
    res.json({ url: data.publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/u/:username", async (req, res) => {
  const supa = makeSupa();
  const page = await getPageBySlug(supa, String(req.params.username).toLowerCase().replace(/^@/, ""));
  if (!page) return res.status(404).json({ error: "This LinkTroo page does not exist." });
  res.json({ profile: page, items: await getItems(supa, page.id, true) });
});

app.post("/api/u/:username", async (req, res) => {
  const supa = makeSupa();
  const page = await getPageBySlug(supa, String(req.params.username).toLowerCase().replace(/^@/, ""));
  if (!page) return res.status(404).json({ error: "This LinkTroo page does not exist." });
  const b = req.body || {};
  await addEvent(supa, page.id, b.type === "click" ? "click" : "view", b.itemId || null, b.lang || null, b.referrer || null, req.headers["cf-ipcountry"] || null);
  res.json({ ok: true });
});

app.get("/api/stats", async (req, res) => {
  try {
    const ctx = await auth(req);
    if (!ctx) return res.status(401).json({ error: "Not authenticated" });
    const page = req.query.page
      ? await getPageById(ctx.supa, String(req.query.page))
      : await ensureDefaultPage(ctx.supa, ctx.userClaims.id);
    if (!page || page.user_id !== ctx.userClaims.id) return res.status(403).json({ error: "Page not found." });
    res.json(await getStats(ctx.supa, page.id));
  } catch (e) {
    console.error("[stats] error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const dist = path.join(__dirname, "..", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(dist, "index.html")));
}

const port = Number(process.env.PORT || 8787);
app.listen(port, () => console.log(`LinkTroo API + web on http://localhost:${port}`));
