import crypto from "node:crypto";

// Same WebCrypto PBKDF2 scheme as functions/api/_lib/auth.js (Cloudflare).
const ITER = 100000;
const SESSION_DAYS = 30;
const enc = new TextEncoder();

const SECRET = process.env.SESSION_SECRET || "biospot-dev-secret";

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function fromB64url(str) {
  return new Uint8Array(Buffer.from(str, "base64url"));
}

async function pbkdf2(password, salt, iterations = ITER) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256
  );
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await pbkdf2(password, salt);
  return `pbkdf2$${ITER}$${b64url(salt)}$${b64url(bits)}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored).split("$");
  if (parts[0] !== "pbkdf2" || parts.length !== 4) return false;
  const salt = fromB64url(parts[2]);
  const hash = fromB64url(parts[3]);
  const bits = new Uint8Array(await pbkdf2(password, salt, Number(parts[1])));
  if (bits.length !== hash.length) return false;
  return crypto.timingSafeEqual(bits, hash);
}

async function hmac(message) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", key, enc.encode(message));
}

export async function createToken(userId) {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${userId}.${exp}`;
  return `${payload}.${b64url(await hmac(payload))}`;
}

export async function verifyToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [uid, exp] = parts;
  if (!uid || Number(exp) < Date.now()) return null;
  const expected = b64url(await hmac(`${uid}.${exp}`));
  return expected === parts[2] ? uid : null;
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
  const crossOrigin = Boolean(process.env.CORS_ORIGIN);
  const attrs = crossOrigin
    ? "HttpOnly; Path=/; SameSite=None; Secure"
    : "HttpOnly; Path=/; SameSite=Lax";
  res.setHeader(
    "Set-Cookie",
    `biospot_session=${encodeURIComponent(token)}; ${attrs}; Max-Age=${SESSION_DAYS * 24 * 60 * 60}`
  );
}

export function clearSessionCookie(res) {
  const crossOrigin = Boolean(process.env.CORS_ORIGIN);
  const attrs = crossOrigin
    ? "HttpOnly; Path=/; SameSite=None; Secure"
    : "HttpOnly; Path=/; SameSite=Lax";
  res.setHeader("Set-Cookie", `biospot_session=; ${attrs}; Max-Age=0`);
}

export async function getUserId(req) {
  return verifyToken(parseCookies(req).biospot_session);
}

export async function requireAuth(req, res, next) {
  const uid = await getUserId(req);
  if (!uid) return res.status(401).json({ error: "Not authenticated" });
  req.userId = uid;
  next();
}
