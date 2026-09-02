import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import crypto from "node:crypto";
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
const { analyzeRequest } = await import("./_lib/gemini.js");
const {
  validateRequest,
  checkConflicts,
  createAccountRequest,
  updateRequestStatus,
  logReview,
  getRequestById,
  listRequests,
  getRequestReviews,
  isAdmin,
  checkForcePasswordChange,
  clearForcePasswordChange,
  USERNAME_RE,
} = await import("./_lib/auth2.js");

const app = express();

// ─── CORS ──────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:8787",
  "https://linktroo.cc",
  "https://www.linktroo.cc",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── Rate Limiter (in-memory) ──────────────────────────────────────────────
const rateLimitStore = new Map();

function rateLimit(key, maxRequests = 10, windowMs = 60_000) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now - entry.start > windowMs) {
    rateLimitStore.set(key, { start: now, count: 1 });
    return true;
  }
  entry.count++;
  if (entry.count > maxRequests) return false;
  return true;
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.start > 300_000) rateLimitStore.delete(key);
  }
}, 300_000);

function getClientIp(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

// ─── Better Auth handler (MUST be before body parser) ──────────────────────
app.all("/api/auth/*", toNodeHandler(auth));
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json({ limit: "2mb" }));

// ─── Helpers ────────────────────────────────────────────────────────────────
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

function sanitizeError(e) {
  const msg = e?.message || "Internal server error";
  if (msg.includes("duplicate") || msg.includes("UNIQUE")) return "A record already exists.";
  if (msg.includes("foreign key")) return "Referenced record not found.";
  if (msg.includes("permission") || msg.includes("RLS")) return "Permission denied.";
  if (msg.includes("Supabase") || msg.includes("supabase")) return "Database service unavailable.";
  return "Something went wrong. Please try again.";
}

const SHORT_USERNAME_LIMIT = 50;

// ─── Username ───────────────────────────────────────────────────────────────
app.post("/api/set-username", async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const slug = String(req.body?.username || "").toLowerCase().trim();
    if (!SLUG_RE.test(slug)) return res.status(400).json({ error: "Invalid username." });

    if (slug.length < 3) {
      const adminSupa = await makeSupa(null, null, true);
      const { count } = await adminSupa.from("pages").select("id", { count: "exact", head: true }).eq("is_default", true);
      if ((count || 0) >= SHORT_USERNAME_LIMIT) {
        return res.status(400).json({ error: `Short usernames (2 chars) are only available for the first ${SHORT_USERNAME_LIMIT} users.` });
      }
    }

    const checkSupa = await makeSupa(null, null, true);
    const { data: existing } = await checkSupa.from("pages").select("id").eq("slug", slug).maybeSingle();
    if (existing) return res.status(409).json({ error: "This username is already taken." });

    const userSupa = await makeSupa(null, null, true);
    const page = await ensureDefaultPage(userSupa, session.user.id);
    await userSupa.from("pages").update({ slug, is_default: true }).eq("id", page.id);
    res.json({ user: { id: session.user.id, slug } });
  } catch (e) {
    console.error("[username] error:", e.message);
    res.status(500).json({ error: sanitizeError(e) });
  }
});

// ─── Me ─────────────────────────────────────────────────────────────────────
app.get("/api/me", async (req, res) => {
  try {
    const session = await getSessionUser(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const supa = await makeSupa(null, null, true);
    const page = await ensureDefaultPage(supa, session.user.id);
    const mustChange = await checkForcePasswordChange(session.user.id);
    const role = await isAdmin(session.user.id);
    res.json({ user: { id: session.user.id, email: session.user.email, page_id: page.id, slug: page.slug, must_change_password: mustChange, admin_role: role } });
  } catch (e) {
    console.error("[me] error:", e.message);
    res.status(500).json({ error: sanitizeError(e) });
  }
});

// ─── Logout ─────────────────────────────────────────────────────────────────
app.post("/api/logout", async (req, res) => {
  try {
    const session = await getSessionUser(req);
    if (session?.session?.token) {
      await auth.api.signOut({ headers: fromNodeHeaders(req.headers) });
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

// ─── Pages ──────────────────────────────────────────────────────────────────
app.get("/api/pages", async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const supa = await makeSupa(null, null, true);
    res.json({ pages: await listPages(supa, session.user.id) });
  } catch (e) {
    console.error("[pages] error:", e.message);
    res.status(500).json({ error: sanitizeError(e) });
  }
});

app.post("/api/pages", async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const { name, slug } = req.body || {};
    if (!name || !slug) return res.status(400).json({ error: "Name and slug are required." });
    if (!SLUG_RE.test(slug)) return res.status(400).json({ error: "Invalid slug." });

    const supa = await makeSupa(null, null, true);
    const { data: existing } = await supa.from("pages").select("id").eq("slug", slug).maybeSingle();
    if (existing) return res.status(409).json({ error: "This slug is already taken." });

    const { data: page, error } = await supa
      .from("pages")
      .insert({ user_id: session.user.id, slug, name, is_default: false })
      .select()
      .single();
    if (error) throw new Error(error.message);
    res.json({ page });
  } catch (e) {
    console.error("[pages:create] error:", e.message);
    res.status(500).json({ error: sanitizeError(e) });
  }
});

// ─── Bio ────────────────────────────────────────────────────────────────────
app.get("/api/bio", async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const supa = await makeSupa(null, null, true);
    const page = req.query.page
      ? await getPageById(supa, String(req.query.page))
      : await ensureDefaultPage(supa, session.user.id);
    if (!page || page.user_id !== session.user.id) return res.status(403).json({ error: "Page not found." });
    res.json({ profile: page, items: await getItems(supa, page.id) });
  } catch (e) {
    console.error("[bio] error:", e.message);
    res.status(500).json({ error: sanitizeError(e) });
  }
});

app.put("/api/bio", async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const supa = await makeSupa(null, null, true);
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
    res.status(500).json({ error: sanitizeError(e) });
  }
});

// ─── Upload ─────────────────────────────────────────────────────────────────
const ALLOWED_UPLOAD_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "audio/mpeg", "audio/ogg", "audio/wav",
  "video/mp4", "video/webm",
  "text/plain", "text/csv",
]);

app.post("/api/upload", async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const supa = await makeSupa(null, null, true);
    const { file, filename, contentType } = req.body || {};
    if (!file || !filename) return res.status(400).json({ error: "Missing file data." });

    // Validate content type
    const ct = contentType || "application/octet-stream";
    if (!ALLOWED_UPLOAD_TYPES.has(ct)) {
      return res.status(400).json({ error: "File type not allowed." });
    }

    const buf = Buffer.from(file, "base64");

    // Max 5MB after base64 decode
    if (buf.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "File too large. Maximum 5MB." });
    }

    const safeName = filename.replace(/[^\w.\-]/g, "_");
    const filePath = `${session.user.id}/${Date.now()}-${safeName}`;
    const { error } = await supa.storage.from("files").upload(filePath, buf, { contentType: ct });
    if (error) return res.status(500).json({ error: "Upload failed." });
    const { data } = supa.storage.from("files").getPublicUrl(filePath);
    res.json({ url: data.publicUrl });
  } catch (e) {
    res.status(500).json({ error: "Upload failed." });
  }
});

// ─── Public bio ─────────────────────────────────────────────────────────────
app.get("/api/u/:username", async (req, res) => {
  try {
    const supa = await makeSupa();
    const page = await getPageBySlug(supa, String(req.params.username).toLowerCase().replace(/^@/, ""));
    if (!page) return res.status(404).json({ error: "This LinkTroo page does not exist." });
    res.json({ profile: page, items: await getItems(supa, page.id, true) });
  } catch (e) {
    res.status(500).json({ error: "Failed to load page." });
  }
});

app.post("/api/u/:username", async (req, res) => {
  try {
    const supa = await makeSupa();
    const page = await getPageBySlug(supa, String(req.params.username).toLowerCase().replace(/^@/, ""));
    if (!page) return res.status(404).json({ error: "This LinkTroo page does not exist." });
    const b = req.body || {};
    await addEvent(supa, page.id, b.type === "click" ? "click" : "view", b.itemId || null, b.lang || null, b.referrer || null, req.headers["cf-ipcountry"] || null);
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

// ─── Public slug (alias pages) ─────────────────────────────────────────────
app.get("/api/p/:slug", async (req, res) => {
  try {
    const supa = await makeSupa();
    const slug = String(req.params.slug).toLowerCase().replace(/^@/, "");
    const page = await getPageBySlug(supa, slug);
    if (!page) return res.status(404).json({ error: "Page not found." });
    res.json({ profile: page, items: await getItems(supa, page.id, true) });
  } catch (e) {
    res.status(500).json({ error: "Failed to load page." });
  }
});

app.post("/api/p/:slug", async (req, res) => {
  try {
    const supa = await makeSupa();
    const slug = String(req.params.slug).toLowerCase().replace(/^@/, "");
    const page = await getPageBySlug(supa, slug);
    if (!page) return res.status(404).json({ error: "Page not found." });
    const b = req.body || {};
    await addEvent(supa, page.id, b.type === "click" ? "click" : "view", b.itemId || null, b.lang || null, b.referrer || null, req.headers["cf-ipcountry"] || null);
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

// ─── Stats ──────────────────────────────────────────────────────────────────
app.get("/api/stats", async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const supa = await makeSupa(null, null, true);
    const page = req.query.page
      ? await getPageById(supa, String(req.query.page))
      : await ensureDefaultPage(supa, session.user.id);
    if (!page || page.user_id !== session.user.id) return res.status(403).json({ error: "Page not found." });
    res.json(await getStats(supa, page.id));
  } catch (e) {
    console.error("[stats] error:", e.message);
    res.status(500).json({ error: sanitizeError(e) });
  }
});

// ─── Health ─────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ═══════════════════════════════════════════════════════════════════════════
// AUTH-2.0 ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// ─── Submit registration request ────────────────────────────────────────────
app.post("/api/auth2/submit", async (req, res) => {
  try {
    // Rate limit: 3 submissions per IP per 10 minutes
    const ip = getClientIp(req);
    if (!rateLimit(`submit:${ip}`, 3, 600_000)) {
      return res.status(429).json({ error: "Too many registration attempts. Please try again later." });
    }

    const data = req.body || {};
    const errors = validateRequest(data);
    if (errors.length) return res.status(400).json({ error: errors[0] });

    const uname = String(data.username).toLowerCase().trim();
    const em = String(data.email).toLowerCase().trim();
    const conflicts = await checkConflicts(uname, em);
    if (conflicts.usernameExists) return res.status(409).json({ error: "This username is already taken or pending." });
    if (conflicts.emailExists) return res.status(409).json({ error: "An account or request already exists for this email." });

    const tempPassword = crypto.randomBytes(12).toString("base64url");
    const request = await createAccountRequest(data, tempPassword);

    // Start Gemini analysis in background (don't block response)
    (async () => {
      try {
        await updateRequestStatus(request.id, "ai_review");
        const aiResult = await analyzeRequest({ ...data, created_at: request.created_at }, conflicts);
        const score = aiResult.score ?? 50;
        const risk = aiResult.risk || "medium";
        const rec = aiResult.recommendation || "manual_review";

        // Check if request was already manually approved/rejected before we overwrite
        const current = await getRequestById(request.id);
        if (current && (current.status === "approved" || current.status === "rejected")) {
          console.log(`[auth2] Request ${request.id} already ${current.status}, skipping AI status update`);
          return;
        }

        let newStatus = "manual_review";
        if (rec === "approve" && score < 40) newStatus = "approved";
        else if (rec === "reject" && score > 80) newStatus = "rejected";
        else if (rec === "approve" && score < 60) newStatus = "approved";
        else if (rec === "manual_review" || (score >= 40 && score <= 80)) newStatus = "manual_review";

        await updateRequestStatus(request.id, newStatus, {
          aiScore: score,
          aiAnalysis: aiResult.analysis || {},
          aiRecommendation: rec,
          riskLevel: risk,
        });

        if (newStatus === "approved") {
          await activateRequest(request.id);
        }

        console.log(`[auth2] Request ${request.id} analyzed: score=${score} risk=${risk} → ${newStatus}`);
      } catch (e) {
        console.error("[auth2] Background analysis failed:", e.message);
      }
    })();

    res.json({ requestId: request.id, tempPassword, status: "pending" });
  } catch (e) {
    console.error("[auth2:submit] error:", e.message);
    res.status(500).json({ error: sanitizeError(e) });
  }
});

// ─── Check request status (rate limited, minimal data) ─────────────────────
app.get("/api/auth2/status/:requestId", async (req, res) => {
  try {
    const ip = getClientIp(req);
    if (!rateLimit(`status:${ip}`, 30, 60_000)) {
      return res.status(429).json({ error: "Too many requests." });
    }

    const request = await getRequestById(req.params.requestId);
    if (!request) return res.status(404).json({ error: "Request not found." });

    // Only return minimal data — no email, no risk details, no AI analysis
    res.json({
      id: request.id,
      username: request.username,
      status: request.status,
      reviewed_at: request.reviewed_at,
      reviewer_notes: request.reviewer_notes,
      created_at: request.created_at,
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to check status." });
  }
});

// ─── Check if user needs password change ────────────────────────────────────
app.get("/api/auth2/force-change", async (req, res) => {
  try {
    const session = await getSessionUser(req);
    if (!session) return res.json({ mustChange: false });
    const mustChange = await checkForcePasswordChange(session.user.id);
    res.json({ mustChange });
  } catch {
    res.json({ mustChange: false });
  }
});

// ─── Change password ────────────────────────────────────────────────────────
app.post("/api/auth2/change-password", async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const { newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    // Get the temp password from account_requests to pass as currentPassword
    const supa = await makeSupa(null, null, true);
    const { data: ar, error: arErr } = await supa
      .from("account_requests")
      .select("temp_password")
      .eq("email", session.user.email)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log("[change-pw] email:", session.user.email, "ar:", ar, "err:", arErr);

    const port = process.env.PORT || 8787;
    const baseUrl = process.env.BETTER_AUTH_BASE_URL || `http://localhost:${port}`;

    // If we couldn't find the temp_password, try without currentPassword
    // (this means the user was created via admin approval and we need to handle it differently)
    const body = { newPassword };
    if (ar?.temp_password) {
      body.currentPassword = ar.temp_password;
    } else {
      console.log("[change-pw] WARNING: temp_password not found, attempting without currentPassword");
    }

    console.log("[change-pw] temp_password found:", !!ar?.temp_password, "email:", session.user.email);

    const updateRes = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": baseUrl,
        Cookie: req.headers.cookie || "",
      },
      body: JSON.stringify(body),
    });
    const updateBody = await updateRes.json().catch(() => ({}));
    console.log("[change-pw] BA response:", updateRes.status, JSON.stringify(updateBody));

    if (!updateRes.ok) {
      return res.status(updateRes.status).json({ error: updateBody.error?.message || updateBody.message || "Failed to update password" });
    }
    await clearForcePasswordChange(session.user.id);
    res.json({ ok: true });
  } catch (e) {
    console.error("[auth2:change-pw] error:", e.message);
    res.status(500).json({ error: "Failed to update password." });
  }
});

// ─── Helper: Activate approved request ──────────────────────────────────────
async function activateRequest(requestId) {
  const request = await getRequestById(requestId);
  if (!request || request.status !== "approved") {
    console.log(`[auth2] activateRequest: skipped — status=${request?.status}`);
    return;
  }

  const { db } = await import("./auth.js");

  const existing = db.prepare(`SELECT id FROM "user" WHERE email = ?`).get(request.email);
  if (existing) {
    console.log(`[auth2] User already exists for ${request.email}, skipping creation`);
    return existing.id;
  }

  const port = process.env.PORT || 8787;
  const baseUrl = process.env.BETTER_AUTH_BASE_URL || `http://localhost:${port}`;
  console.log(`[auth2] Creating user: email=${request.email}, pw_len=${request.temp_password?.length}`);
  const signupRes = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": baseUrl,
    },
    body: JSON.stringify({
      email: request.email,
      password: request.temp_password,
      name: request.display_name,
    }),
  });
  const signupData = await signupRes.json().catch(() => ({}));
  console.log("[auth2] signup response:", JSON.stringify(signupData));
  if (!signupRes.ok || signupData.error) {
    throw new Error(signupData.error?.message || signupData.message || `Signup failed (${signupRes.status})`);
  }
  const userId = signupData.user?.id;
  if (!userId) throw new Error("No user ID in signup response");

  const supa = await makeSupa(null, null, true);
  await supa.from("force_password_change").upsert({ user_id: userId, must_change: true });

  const page = await ensureDefaultPage(supa, userId, request.username);
  if (page) {
    await supa.from("pages").update({ slug: request.username, is_default: true }).eq("id", page.id);
  }

  console.log(`[auth2] Activated account for ${request.email} (${userId})`);
  return userId;
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════════════

async function requireAdmin(req, res) {
  const session = await requireAuth(req, res);
  if (!session) return null;
  const role = await isAdmin(session.user.id);
  if (!role) {
    res.status(403).json({ error: "Admin access required." });
    return null;
  }
  return { session, role };
}

// ─── Admin: Verify security questions ──────────────────────────────────────
// Questions and hashed answers are server-side only
const ADMIN_SECURITY_QUESTIONS = [
  { key: "age", hash: crypto.createHash("sha256").update("18").digest("hex") },
  { key: "name", hash: crypto.createHash("sha256").update("عبدالله").digest("hex") },
  { key: "email", hash: crypto.createHash("sha256").update("a.jaafar1430@gmail.com").digest("hex") },
  { key: "color", hash: crypto.createHash("sha256").update("الازرق").digest("hex") },
];

app.post("/api/auth2/admin/verify-questions", async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;

    const { answers } = req.body || {};
    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ error: "Answers required." });
    }

    const allCorrect = ADMIN_SECURITY_QUESTIONS.every((q) => {
      const userAnswer = String(answers[q.key] || "").trim();
      const hash = crypto.createHash("sha256").update(userAnswer).digest("hex");
      return hash === q.hash;
    });

    if (!allCorrect) {
      return res.status(403).json({ error: "Incorrect answers.", verified: false });
    }

    res.json({ ok: true, verified: true });
  } catch (e) {
    res.status(500).json({ error: "Verification failed." });
  }
});

// ─── Admin: List requests ──────────────────────────────────────────────────
app.get("/api/auth2/admin/requests", async (req, res) => {
  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
    const status = req.query.status || null;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const result = await listRequests(status, page, limit);
    res.json(result);
  } catch (e) {
    console.error("[auth2:admin:list] error:", e.message);
    res.status(500).json({ error: "Failed to load requests." });
  }
});

// ─── Admin: Get request details ────────────────────────────────────────────
app.get("/api/auth2/admin/request/:requestId", async (req, res) => {
  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
    const request = await getRequestById(req.params.requestId);
    if (!request) return res.status(404).json({ error: "Request not found." });
    const reviews = await getRequestReviews(request.id);
    res.json({ request, reviews });
  } catch (e) {
    console.error("[auth2:admin:detail] error:", e.message);
    res.status(500).json({ error: "Failed to load request." });
  }
});

// ─── Admin: Approve ────────────────────────────────────────────────────────
app.post("/api/auth2/admin/approve/:requestId", async (req, res) => {
  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
    const request = await getRequestById(req.params.requestId);
    if (!request) return res.status(404).json({ error: "Request not found." });
    if (request.status === "approved") return res.status(400).json({ error: "Already approved." });

    await updateRequestStatus(request.id, "approved", {
      reviewedBy: auth.session.user.id,
      reviewerNotes: req.body?.notes || null,
    });
    await logReview(request.id, auth.session.user.id, "approved", req.body?.notes, request.ai_score);

    await activateRequest(request.id);

    res.json({ ok: true, status: "approved" });
  } catch (e) {
    console.error("[auth2:admin:approve] error:", e.message);
    res.status(500).json({ error: "Failed to approve request." });
  }
});

// ─── Admin: Reject ─────────────────────────────────────────────────────────
app.post("/api/auth2/admin/reject/:requestId", async (req, res) => {
  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
    const request = await getRequestById(req.params.requestId);
    if (!request) return res.status(404).json({ error: "Request not found." });
    if (request.status === "rejected") return res.status(400).json({ error: "Already rejected." });

    await updateRequestStatus(request.id, "rejected", {
      reviewedBy: auth.session.user.id,
      reviewerNotes: req.body?.notes || null,
    });
    await logReview(request.id, auth.session.user.id, "rejected", req.body?.notes, request.ai_score);

    res.json({ ok: true, status: "rejected" });
  } catch (e) {
    console.error("[auth2:admin:reject] error:", e.message);
    res.status(500).json({ error: "Failed to reject request." });
  }
});

// ─── Admin: Escalate ──────────────────────────────────────────────────────
app.post("/api/auth2/admin/escalate/:requestId", async (req, res) => {
  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
    const request = await getRequestById(req.params.requestId);
    if (!request) return res.status(404).json({ error: "Request not found." });

    await updateRequestStatus(request.id, "manual_review", {
      reviewedBy: auth.session.user.id,
      reviewerNotes: req.body?.notes || null,
    });
    await logReview(request.id, auth.session.user.id, "escalated", req.body?.notes, request.ai_score);

    res.json({ ok: true, status: "manual_review" });
  } catch (e) {
    console.error("[auth2:admin:escalate] error:", e.message);
    res.status(500).json({ error: "Failed to escalate request." });
  }
});

// ─── Admin: Make user admin ────────────────────────────────────────────────
app.post("/api/auth2/admin/make-admin", async (req, res) => {
  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
    if (auth.role !== "admin") return res.status(403).json({ error: "Only admins can promote." });
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "Email required." });

    const supa = await makeSupa(null, null, true);
    const { data } = await supa.from("admin_users").select("id").eq("email", email).maybeSingle();
    if (data) return res.json({ ok: true, message: "Already admin." });

    await supa.from("admin_users").insert({ user_id: "pending", email, role: "reviewer" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to promote user." });
  }
});

// ─── Static files & SPA catch-all ──────────────────────────────────────────
const dist = path.join(__dirname, "..", "dist");

const legalDir = path.join(__dirname, "..", "legal");
if (fs.existsSync(legalDir)) {
  app.use("/legal", express.static(legalDir));
}

if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/|legal\/).*/, (req, res) => res.sendFile(path.join(dist, "index.html")));
}

const port = Number(process.env.PORT || 8787);
app.listen(port, () => console.log(`LinkTroo API + web on http://localhost:${port}`));
