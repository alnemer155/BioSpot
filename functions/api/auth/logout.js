import { clearCookie } from "../_lib/auth.js";

export function onRequestPost() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json", "Set-Cookie": clearCookie() },
  });
}
