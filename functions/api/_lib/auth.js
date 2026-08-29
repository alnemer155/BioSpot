// Shared auth helpers — WebCrypto only, runs in Node 18+ and Cloudflare Workers.
const ITER = 100000;
const SESSION_DAYS = 30;
const enc = new TextEncoder();

function b64url(buf) {
  let s = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
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
  let diff = 0;
  for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ hash[i];
  return diff === 0;
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", key, enc.encode(message));
}

// Stateless signed session token: uid.exp.hmac
export async function createToken(secret, userId) {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${userId}.${exp}`;
  return `${payload}.${b64url(await hmac(secret, payload))}`;
}

export async function verifyToken(secret, token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [uid, exp] = parts;
  if (!uid || Number(exp) < Date.now()) return null;
  const expected = b64url(await hmac(secret, `${uid}.${exp}`));
  return expected === parts[2] ? uid : null;
}

export function sessionCookie(token) {
  return `biospot_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${
    SESSION_DAYS * 24 * 60 * 60
  }`;
}

export function clearCookie() {
  return `biospot_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

export function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

export async function getAuthUserId(request, env) {
  return verifyToken(env.SESSION_SECRET, readCookie(request, "biospot_session"));
}

export function json(status, error) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
