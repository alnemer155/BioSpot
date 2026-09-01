import { createClient } from "@supabase/supabase-js";

let _admin = null;
function getAdmin() {
  if (!_admin) {
    _admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}

const RESERVED = new Set([
  "admin","dashboard","api","login","register","linktroo","www","legal",
  "support","help","about","terms","privacy","auth","dash","home","index",
  "null","undefined","true","false","me","settings","profile","bio",
  "superuser","root","system","operator","moderator",
]);

export const USERNAME_RE = /^[a-z0-9_-]{2,30}$/;

export function validateRequest(data) {
  const errors = [];
  const uname = String(data.username || "").toLowerCase().trim();

  if (!uname || !USERNAME_RE.test(uname)) {
    errors.push("Username must be 2-30 characters (letters, numbers, _, -).");
  } else if (RESERVED.has(uname)) {
    errors.push("This username is reserved and cannot be used.");
  }

  const email = String(data.email || "").toLowerCase().trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Please enter a valid email address.");
  }

  if (!data.display_name || String(data.display_name).trim().length < 1) {
    errors.push("Display name is required.");
  } else if (String(data.display_name).trim().length > 100) {
    errors.push("Display name must be under 100 characters.");
  }

  const validCases = ["creator", "personal", "for_someone_else", "business", "other"];
  if (!validCases.includes(data.use_case)) {
    errors.push("Please select a valid use case.");
  }

  if (data.use_case === "other" && (!data.use_case_details || String(data.use_case_details).trim().length < 3)) {
    errors.push("Please explain your intended use case.");
  }

  if (!data.agreed_to_terms || !data.agreed_to_auth2 || !data.agreed_to_privacy) {
    errors.push("You must agree to all required policies.");
  }

  return errors;
}

export async function checkConflicts(username, email) {
  const supa = getAdmin();
  const uname = username.toLowerCase().trim();
  const em = email.toLowerCase().trim();

  const [arUser, arEmail, pageSlug] = await Promise.all([
    supa.from("account_requests").select("id").eq("username", uname).in("status", ["pending", "ai_review", "approved"]).maybeSingle(),
    supa.from("account_requests").select("id").eq("email", em).in("status", ["pending", "ai_review", "approved"]).maybeSingle(),
    supa.from("pages").select("id").eq("slug", uname).maybeSingle(),
  ]);

  return {
    usernameExists: !!(arUser.data || pageSlug.data),
    emailExists: !!arEmail.data,
  };
}

export async function createAccountRequest(data, tempPassword) {
  const supa = getAdmin();
  const uname = String(data.username).toLowerCase().trim();
  const em = String(data.email).toLowerCase().trim();

  const { data: request, error } = await supa
    .from("account_requests")
    .insert({
      username: uname,
      email: em,
      display_name: String(data.display_name).trim(),
      use_case: data.use_case,
      use_case_details: data.use_case_details || null,
      agreed_to_terms: !!data.agreed_to_terms,
      agreed_to_auth2: !!data.agreed_to_auth2,
      agreed_to_privacy: !!data.agreed_to_privacy,
      temp_password: tempPassword,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return request;
}

export async function updateRequestStatus(requestId, status, patch = {}) {
  const supa = getAdmin();
  const update = { status, updated_at: new Date().toISOString() };
  if (patch.aiScore !== undefined) update.ai_score = patch.aiScore;
  if (patch.aiAnalysis) update.ai_analysis = patch.aiAnalysis;
  if (patch.aiRecommendation) update.ai_recommendation = patch.aiRecommendation;
  if (patch.riskLevel) update.risk_level = patch.riskLevel;
  if (patch.reviewerNotes) update.reviewer_notes = patch.reviewerNotes;
  if (patch.reviewedBy) update.reviewed_by = patch.reviewedBy;
  if (status === "approved" || status === "rejected") {
    update.reviewed_at = new Date().toISOString();
  }
  const { error } = await supa.from("account_requests").update(update).eq("id", requestId);
  if (error) throw new Error(error.message);
}

export async function logReview(requestId, reviewer, action, notes, aiScore) {
  const supa = getAdmin();
  await supa.from("account_request_reviews").insert({
    request_id: requestId,
    reviewer,
    action,
    notes: notes || null,
    ai_score_snapshot: aiScore || null,
  });
}

export async function getRequestById(requestId) {
  const supa = getAdmin();
  const { data } = await supa.from("account_requests").select("*").eq("id", requestId).maybeSingle();
  return data;
}

export async function listRequests(status, page = 1, limit = 20) {
  const supa = getAdmin();
  let q = supa.from("account_requests").select("*", { count: "exact" });
  if (status) q = q.eq("status", status);
  q = q.order("created_at", { ascending: false }).range((page - 1) * limit, page * limit - 1);
  const { data, count } = await q;
  return { requests: data || [], total: count || 0 };
}

export async function getRequestReviews(requestId) {
  const supa = getAdmin();
  const { data } = await supa
    .from("account_request_reviews")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function isAdmin(userId) {
  const supa = getAdmin();
  const { data } = await supa.from("admin_users").select("role").eq("user_id", userId).maybeSingle();
  if (data?.role) return data.role;

  // Bootstrap: if no real admin users exist (only bootstrap entries), auto-promote
  const { data: admins } = await supa.from("admin_users").select("user_id, email");
  const realAdmins = (admins || []).filter((a) => a.email !== "bootstrap");
  if (realAdmins.length === 0) {
    // Delete old bootstrap entries and insert this user as admin
    await supa.from("admin_users").delete().eq("email", "bootstrap");
    await supa.from("admin_users").insert({ user_id: userId, email: "bootstrap", role: "admin" });
    return "admin";
  }
  return null;
}

export async function checkForcePasswordChange(userId) {
  const supa = getAdmin();
  const { data } = await supa.from("force_password_change").select("must_change").eq("user_id", userId).maybeSingle();
  return data?.must_change || false;
}

export async function clearForcePasswordChange(userId) {
  const supa = getAdmin();
  await supa.from("force_password_change").delete().eq("user_id", userId);
}

export async function setForcePasswordChange(userId) {
  const supa = getAdmin();
  await supa.from("force_password_change").upsert({ user_id: userId, must_change: true });
}
