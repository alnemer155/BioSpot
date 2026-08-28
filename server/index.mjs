import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  initSchema,
  pool,
  getUserByUsername,
  getUserByEmail,
  getProfile,
  getItems,
  upsertProfile,
  replaceItems,
} from "./db.mjs";
import {
  hashPassword,
  verifyPassword,
  createToken,
  setSessionCookie,
  clearSessionCookie,
  getUserId,
  requireAuth,
} from "./auth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "2mb" }));

// CORS for split deployments (e.g. static frontend on Cloudflare Pages,
// API on a Node host). Set CORS_ORIGIN to the frontend origin to enable.
const CORS_ORIGIN = process.env.CORS_ORIGIN || "";
app.use((req, res, next) => {
  if (CORS_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
  }
  next();
});

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(u) {
  return { id: u.id, username: u.username, email: u.email, created_at: u.created_at };
}

// ---------- Auth ----------

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    const uname = String(username || "").toLowerCase().trim();

    if (!USERNAME_RE.test(uname)) {
      return res.status(400).json({
        error: "Username must be 3-20 characters: letters, numbers or underscores.",
      });
    }
    if (!EMAIL_RE.test(String(email || ""))) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    if (String(password || "").length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }
    if (await getUserByUsername(uname)) {
      return res.status(409).json({ error: `bio.jaafar.app/@${uname} is already taken.` });
    }
    if (await getUserByEmail(email)) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const { rows } = await pool.query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at",
      [uname, String(email).toLowerCase().trim(), hashPassword(password)]
    );
    const user = rows[0];
    await upsertProfile(user.id, { name: "Your Name", title: "", bio: "" });

    setSessionCookie(res, createToken(user.id));
    res.json({ user: publicUser({ ...user, password_hash: undefined }) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const id = String(email || "").toLowerCase().trim();
    const isEmail = EMAIL_RE.test(id);
    const user = isEmail ? await getUserByEmail(id) : await getUserByUsername(id);
    if (!user || !verifyPassword(String(password || ""), user.password_hash)) {
      return res.status(401).json({ error: "Invalid email/username or password." });
    }
    setSessionCookie(res, createToken(user.id));
    res.json({ user: publicUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

app.post("/api/auth/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, username, email, created_at FROM users WHERE id = $1",
      [req.userId]
    );
    if (!rows[0]) return res.status(401).json({ error: "Not authenticated" });
    res.json({ user: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load user." });
  }
});

// ---------- Bio data ----------

async function fullBioData(userId) {
  const profile = await getProfile(userId);
  const items = await getItems(userId);
  return {
    profile: profile || { user_id: userId, name: "Your Name", title: null, bio: null, avatar_url: null },
    items,
  };
}

app.get("/api/bio", requireAuth, async (req, res) => {
  try {
    res.json(await fullBioData(req.userId));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load data." });
  }
});

app.put("/api/bio", requireAuth, async (req, res) => {
  try {
    const { profile, items } = req.body || {};
    if (!profile || !Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid payload." });
    }
    // Cap data URLs to keep rows reasonable.
    for (const key of ["avatar_url"]) {
      if (typeof profile[key] === "string" && profile[key].length > 700_000) {
        return res.status(400).json({ error: "Image is too large. Please use one under 500KB." });
      }
    }
    for (const it of items) {
      if (typeof it.image_url === "string" && it.image_url.length > 700_000) {
        return res.status(400).json({ error: "Image is too large. Please use one under 500KB." });
      }
    }
    await upsertProfile(req.userId, profile);
    await replaceItems(req.userId, items);
    res.json(await fullBioData(req.userId));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save." });
  }
});

// Public bio by username
app.get("/api/u/:username", async (req, res) => {
  try {
    const uname = String(req.params.username || "").toLowerCase().replace(/^@/, "");
    const user = await getUserByUsername(uname);
    if (!user) return res.status(404).json({ error: "This BioSpot page does not exist." });
    const profile = await getProfile(user.id);
    const items = await getItems(user.id, true);
    res.json({
      profile: profile || { name: user.username, title: null, bio: null, avatar_url: null },
      items,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load page." });
  }
});

// ---------- Static (production) ----------
const dist = path.join(__dirname, "..", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(dist, "index.html"));
  });
}

const port = Number(process.env.PORT || 8787);
initSchema()
  .then(() => {
    app.listen(port, () => console.log(`BioSpot API + web listening on http://localhost:${port}`));
  })
  .catch((e) => {
    console.error("Failed to init database:", e);
    process.exit(1);
  });
