import crypto from "node:crypto";

const SECRET = process.env.SESSION_SECRET || "biospot-dev-secret";
const SESSION_DAYS = 30;

// ---- Password hashing (scrypt, no native deps) ----
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored).split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

// ---- Stateless signed session token: uid.exp.hmac ----
function sign(payload) {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function createToken(userId) {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [uid, exp, mac] = parts;
  const payload = `${uid}.${exp}`;
  const expected = sign(payload);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now()) return null;
  return uid;
}

export function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export function setSessionCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `biospot_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 60 * 60}`
  );
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "biospot_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0");
}

export function getUserId(req) {
  const cookies = parseCookies(req);
  return verifyToken(cookies.biospot_session);
}

export function requireAuth(req, res, next) {
  const uid = getUserId(req);
  if (!uid) return res.status(401).json({ error: "Not authenticated" });
  req.userId = uid;
  next();
}
