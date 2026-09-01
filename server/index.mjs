import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const express = (await import("express")).default;
const cors = (await import("cors")).default;
const fs = (await import("node:fs")).default;
const { toNodeHandler, fromNodeHeaders } = await import("better-auth/node");
const { auth } = await import("./auth.js");
const {
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
} = await import("./_lib/supa.js");

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:8787", "https://linktroo.cc", "https://www.linktroo.cc", "https://biospot-production.up.railway.app"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "2mb" }));

async function getSessionUser(req) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session?.user) return null;
    return session;
  } catch {
    return null;
  }
}

async function requireAuth(req, res) {
  const session = await getSessionUser(req);
  if (!session) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return session;
}

const SHORT_USERNAME_LIMIT = 50;

app.post("/api/set-username", async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const slug = String(req.body?.username || "").toLowerCase().trim();
    if (!SLUG_RE.test(slug)) return res.status(400).json({ error: "Invalid username." });

    if (slug.length < 3) {
      const adminSupa = makeSupa(null, null, true);
      const { count } = await adminSupa.from("pages").select("id", { count: "exact", head: true }).eq("is_default", true);
      if ((count || 0) >= SHORT_USERNAME_LIMIT) {
        return res.status(400).json({ error: `Short usernames (2 chars) are only available for the first ${SHORT_USERNAME_LIMIT} users.` });
      }
    }

    const checkSupa = makeSupa(null, null, true);
    const { data: existing } = await checkSupa.from("pages").select("id").eq("slug", slug).maybeSingle();
    if (existing) return res.status(409).json({ error: "This username is already taken." });

    const userSupa = makeSupa(null, null, true);
    const page = await ensureDefaultPage(userSupa, session.user.id);
    await userSupa.from("pages").update({ slug, is_default: true }).eq("id", page.id);
    res.json({ user: { id: session.user.id, slug } });
  } catch (e) {
    console.error("[username] error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/me", async (req, res) => {
  try {
    const session = await getSessionUser(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const supa = makeSupa(null, null, true);
    const page = await ensureDefaultPage(supa, session.user.id);
    res.json({ user: { id: session.user.id, email: session.user.email, page_id: page.id, slug: page.slug } });
  } catch (e) {
    console.error("[me] error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/pages", async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const supa = makeSupa(null, null, true);
    res.json({ pages: await listPages(supa, session.user.id) });
  } catch (e) {
    console.error("[pages] error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/bio", async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const supa = makeSupa(null, null, true);
    const page = req.query.page
      ? await getPageById(supa, String(req.query.page))
      : await ensureDefaultPage(supa, session.user.id);
    if (!page || page.user_id !== session.user.id) return res.status(403).json({ error: "Page not found." });
    res.json({ profile: page, items: await getItems(supa, page.id) });
  } catch (e) {
    console.error("[bio] error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/bio", async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const supa = makeSupa(null, null, true);
    const page = req.query.page
      ? await getPageById(supa, String(req.query.page))
      : await ensureDefaultPage(supa, session.user.id);
    if (!page || page.user_id !== session.user.id) return res.status(403).json({ error: "Page not found." });
    const { profile, items } = req.body || {};
    if (!profile || !Array.isArray(items)) return res.status(400).json({ error: "Invalid payload." });
    const patch = {};
    for (const f of ["name", "title", "bio", "avatar_url", "font", "translations", "style"]) {
      if (f in profile) patch[f] = profile[f];
    }
    await savePage(supa, page.id, patch);
    await replaceItems(supa, page.id, items);
    const fresh = await getPageById(supa, page.id);
    res.json({ profile: fresh, items: await getItems(supa, page.id) });
  } catch (e) {
    console.error("[bio:put] error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/upload", async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const supa = makeSupa(null, null, true);
    const { file, filename } = req.body || {};
    if (!file || !filename) return res.status(400).json({ error: "Missing file data." });
    const buf = Buffer.from(file, "base64");
    const safeName = filename.replace(/[^\w.\-]/g, "_");
    const filePath = `${session.user.id}/${Date.now()}-${safeName}`;
    const { error } = await supa.storage.from("files").upload(filePath, buf, {
      contentType: req.body.contentType || "application/octet-stream",
    });
    if (error) return res.status(500).json({ error: error.message });
    const { data } = supa.storage.from("files").getPublicUrl(filePath);
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
    const session = await requireAuth(req, res);
    if (!session) return;
    const supa = makeSupa(null, null, true);
    const page = req.query.page
      ? await getPageById(supa, String(req.query.page))
      : await ensureDefaultPage(supa, session.user.id);
    if (!page || page.user_id !== session.user.id) return res.status(403).json({ error: "Page not found." });
    res.json(await getStats(supa, page.id));
  } catch (e) {
    console.error("[stats] error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.all("/api/auth/*", toNodeHandler(auth));
app.all("/api/auth/*splat", toNodeHandler(auth));

const dist = path.join(__dirname, "..", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(dist, "index.html")));
}

const port = Number(process.env.PORT || 8787);
app.listen(port, () => console.log(`LinkTroo API + web on http://localhost:${port}`));
