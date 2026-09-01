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
        callback(null, true);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.all("/api/auth/*", toNodeHandler(auth));
app.all("/api/auth/*splat", toNodeHandler(auth));

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
    res.status(500).json({ error: e.message });
  }
});

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
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/pages", async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const supa = await makeSupa(null, null, true);
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
    const supa = await makeSupa(null, null, true);
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
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/upload", async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const supa = await makeSupa(null, null, true);
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
  const supa = await makeSupa();
  const page = await getPageBySlug(supa, String(req.params.username).toLowerCase().replace(/^@/, ""));
  if (!page) return res.status(404).json({ error: "This LinkTroo page does not exist." });
  res.json({ profile: page, items: await getItems(supa, page.id, true) });
});

app.post("/api/u/:username", async (req, res) => {
  const supa = await makeSupa();
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
    const supa = await makeSupa(null, null, true);
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

// ─── Auth-2.0: Submit registration request ───────────────────────────────────
app.post("/api/auth2/submit", async (req, res) => {
  try {
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
    res.status(500).json({ error: e.message });
  }
});

// ─── Auth-2.0: Check request status ──────────────────────────────────────────
app.get("/api/auth2/status/:requestId", async (req, res) => {
  try {
    const request = await getRequestById(req.params.requestId);
    if (!request) return res.status(404).json({ error: "Request not found." });
    res.json({
      id: request.id,
      username: request.username,
      status: request.status,
      risk_level: request.risk_level,
      reviewed_at: request.reviewed_at,
      reviewer_notes: request.reviewer_notes,
      created_at: request.created_at,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Auth-2.0: Check if user needs password change ──────────────────────────
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

// ─── Auth-2.0: Change password ──────────────────────────────────────────────
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
    const { data: ar } = await supa
      .from("account_requests")
      .select("temp_password")
      .eq("email", session.user.email)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const port = process.env.PORT || 8787;
    const baseUrl = process.env.BETTER_AUTH_BASE_URL || `http://localhost:${port}`;

    // Build body — include currentPassword if we have it
    const body = { newPassword };
    if (ar?.temp_password) body.currentPassword = ar.temp_password;

    const updateRes = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": baseUrl,
        Cookie: req.headers.cookie || "",
      },
      body: JSON.stringify(body),
    });
    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({}));
      return res.status(updateRes.status).json({ error: err.error?.message || "Failed to update password" });
    }
    await clearForcePasswordChange(session.user.id);
    res.json({ ok: true });
  } catch (e) {
    console.error("[auth2:change-pw] error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── Helper: Activate approved request (create Better Auth account) ────────
async function activateRequest(requestId) {
  const request = await getRequestById(requestId);
  if (!request || request.status !== "approved") return;

  const { db } = await import("./auth.js");

  // Check if user already exists
  const existing = db.prepare(`SELECT id FROM "user" WHERE email = ?`).get(request.email);
  if (existing) {
    console.log(`[auth2] User already exists for ${request.email}, skipping creation`);
    return existing.id;
  }

  // Use Better Auth's internal API to create user (handles password hashing correctly)
  const port = process.env.PORT || 8787;
  const baseUrl = process.env.BETTER_AUTH_BASE_URL || `http://localhost:${port}`;
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

  // Set force password change
  const supa = await makeSupa(null, null, true);
  await supa.from("force_password_change").upsert({ user_id: userId, must_change: true });

  // Create default page with requested username
  const page = await ensureDefaultPage(supa, userId, request.username);
  if (page) {
    await supa.from("pages").update({ slug: request.username, is_default: true }).eq("id", page.id);
  }

  console.log(`[auth2] Activated account for ${request.email} (${userId})`);
  return userId;
}

// ─── Auth-2.0 Admin: Require admin role ─────────────────────────────────────
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

// ─── Auth-2.0 Admin: List requests ──────────────────────────────────────────
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
    res.status(500).json({ error: e.message });
  }
});

// ─── Auth-2.0 Admin: Get request details ────────────────────────────────────
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
    res.status(500).json({ error: e.message });
  }
});

// ─── Auth-2.0 Admin: Approve request ────────────────────────────────────────
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

    // Create the Better Auth account
    await activateRequest(request.id);

    res.json({ ok: true, status: "approved" });
  } catch (e) {
    console.error("[auth2:admin:approve] error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── Auth-2.0 Admin: Reject request ─────────────────────────────────────────
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
    res.status(500).json({ error: e.message });
  }
});

// ─── Auth-2.0 Admin: Escalate to manual review ─────────────────────────────
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
    res.status(500).json({ error: e.message });
  }
});

// ─── Auth-2.0 Admin: Make user admin ────────────────────────────────────────
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
    res.status(500).json({ error: e.message });
  }
});

const dist = path.join(__dirname, "..", "dist");

// ─── Legal site (served at /legal/*) ──────────────────────────────────────
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
