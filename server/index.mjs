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
} from "../functions/api/_lib/supa.js";
import { verifySupabaseToken } from "../functions/api/_lib/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "2mb" }));
const env = process.env;

const SUPA_URL = env.SUPABASE_URL;
const SUPA_KEY = env.SUPABASE_ANON_KEY;

app.all("/api/supa-proxy/*", async (req, res) => {
  try {
    const subPath = req.params[0];
    const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    const targetUrl = `${SUPA_URL}/${subPath}${qs}`;
    const fwdHeaders = { apikey: SUPA_KEY };
    const auth = req.headers.authorization;
    if (auth) fwdHeaders.Authorization = auth;
    const ct = req.headers["content-type"];
    if (ct) fwdHeaders["Content-Type"] = ct;
    const r = await fetch(targetUrl, {
      method: req.method,
      headers: fwdHeaders,
      body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined,
    });
    const text = await r.text();
    const rCt = r.headers.get("content-type") || "application/json";
    res.status(r.status).set("Content-Type", rCt);
    res.send(text || "{}");
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function auth(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const su = await verifySupabaseToken(token, env);
  if (!su) return null;
  const supa = makeSupa(env, token);
  return { supa, su };
}

app.post("/api/auth/username", async (req, res) => {
  const ctx = await auth(req);
  if (!ctx) return res.status(401).json({ error: "Not authenticated" });
  const slug = String(req.body?.username || "").toLowerCase().trim();
  if (!SLUG_RE.test(slug)) return res.status(400).json({ error: "Invalid username." });
  const current = await ensureDefaultPage(ctx.supa, ctx.su.id, ctx.su.user_metadata?.username);
  await ctx.supa.from("pages").update({ slug, is_default: true }).eq("id", current.id);
  res.json({ user: { id: ctx.su.id, slug } });
});

app.get("/api/auth/me", async (req, res) => {
  const ctx = await auth(req);
  if (!ctx) return res.status(401).json({ error: "Not authenticated" });
  const page = await ensureDefaultPage(ctx.supa, ctx.su.id, ctx.su.user_metadata?.username);
  res.json({ user: { id: ctx.su.id, email: ctx.su.email, page_id: page.id, slug: page.slug } });
});

app.get("/api/pages", async (req, res) => {
  const ctx = await auth(req);
  if (!ctx) return res.status(401).json({ error: "Not authenticated" });
  res.json({ pages: await listPages(ctx.supa, ctx.su.id) });
});

app.get("/api/bio", async (req, res) => {
  const ctx = await auth(req);
  if (!ctx) return res.status(401).json({ error: "Not authenticated" });
  const page = req.query.page
    ? await getPageById(ctx.supa, String(req.query.page))
    : await ensureDefaultPage(ctx.supa, ctx.su.id, ctx.su.user_metadata?.username);
  if (!page || page.user_id !== ctx.su.id) return res.status(403).json({ error: "Page not found." });
  res.json({ profile: page, items: await getItems(ctx.supa, page.id) });
});

app.put("/api/bio", async (req, res) => {
  const ctx = await auth(req);
  if (!ctx) return res.status(401).json({ error: "Not authenticated" });
  const page = req.query.page
    ? await getPageById(ctx.supa, String(req.query.page))
    : await ensureDefaultPage(ctx.supa, ctx.su.id, ctx.su.user_metadata?.username);
  if (!page || page.user_id !== ctx.su.id) return res.status(403).json({ error: "Page not found." });
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
});

app.get("/api/u/:username", async (req, res) => {
  const supa = makeSupa(env);
  const page = await getPageBySlug(supa, String(req.params.username).toLowerCase().replace(/^@/, ""));
  if (!page) return res.status(404).json({ error: "This LinkTroo page does not exist." });
  res.json({ profile: page, items: await getItems(supa, page.id, true) });
});

app.post("/api/u/:username", async (req, res) => {
  const supa = makeSupa(env);
  const page = await getPageBySlug(supa, String(req.params.username).toLowerCase().replace(/^@/, ""));
  if (!page) return res.status(404).json({ error: "This LinkTroo page does not exist." });
  const b = req.body || {};
  await addEvent(supa, page.id, b.type === "click" ? "click" : "view", b.itemId || null, b.lang || null, b.referrer || null, req.headers["cf-ipcountry"] || null);
  res.json({ ok: true });
});

app.get("/api/stats", async (req, res) => {
  const ctx = await auth(req);
  if (!ctx) return res.status(401).json({ error: "Not authenticated" });
  const page = req.query.page
    ? await getPageById(ctx.supa, String(req.query.page))
    : await ensureDefaultPage(ctx.supa, ctx.su.id, ctx.su.user_metadata?.username);
  if (!page || page.user_id !== ctx.su.id) return res.status(403).json({ error: "Page not found." });
  res.json(await getStats(ctx.supa, page.id));
});

const dist = path.join(__dirname, "..", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(dist, "index.html")));
}

const port = Number(process.env.PORT || 8787);
app.listen(port, () => console.log(`LinkTroo API + web on http://localhost:${port}`));
