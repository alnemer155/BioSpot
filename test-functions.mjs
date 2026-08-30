// End-to-end test of the Pages Functions handlers.
// Supabase auth is exercised through a local mock of /auth/v1/user
// (the real project requires email confirmation, so no token is issued for fresh signups).
import "dotenv/config";
import http from "node:http";
import { onRequestPost as setUsername } from "./functions/api/auth/username.js";
import { onRequestGet as me } from "./functions/api/auth/me.js";
import { onRequestGet as bioGet, onRequestPut as bioPut } from "./functions/api/bio/index.js";
import { onRequestGet as publicBio, onRequestPost as track } from "./functions/api/u/[username].js";
import { onRequestGet as statsGet } from "./functions/api/stats.js";
import { onRequestGet as twitterGet } from "./functions/api/twitter.js";
import { onRequestPost as agentPost } from "./functions/api/agent.js";

const SU_ID = "11111111-2222-3333-4444-555555555555";
const uname = `fn_test_${Date.now() % 100000}`;

// Mock Supabase: any Bearer token maps to a fixed verified user.
const mockSupabase = http.createServer((req2, res2) => {
  if (req2.url.startsWith("/auth/v1/user")) {
    res2.setHeader("Content-Type", "application/json");
    res2.end(JSON.stringify({ id: SU_ID, email: `${uname}@gmail.com`, user_metadata: { username: uname } }));
    return;
  }
  res2.statusCode = 404;
  res2.end("{}");
});
await new Promise((r) => mockSupabase.listen(9997, r));

const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  SUPABASE_URL: "http://127.0.0.1:9997",
  SUPABASE_ANON_KEY: "test",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
};
const bearer = "mock-token";

function req(url, method = "GET", body) {
  const headers = {};
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  if (body) headers["Content-Type"] = "application/json";
  return new Request(`https://bio.test${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
}

function check(name, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} ${extra}`);
  if (!ok) process.exitCode = 1;
}

// 0. Real Supabase project reachable?
{
  const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/health`, {
    headers: { apikey: process.env.SUPABASE_ANON_KEY },
  }).catch(() => null);
  check("supabase reachable", Boolean(r && r.ok));
}

// 1. claim username
let res = await setUsername({ request: req("/api/auth/username", "POST", { username: uname }), env });
let data = await res.json();
check("set username", res.status === 200 && data.user?.username === uname, JSON.stringify(data));

// 2. me
res = await me({ request: req("/api/auth/me"), env });
data = await res.json();
check("me", res.status === 200 && data.user?.username === uname);

// 3. save bio (font + translations + items)
res = await bioPut({
  request: req("/api/bio", "PUT", {
    profile: {
      name: "FN Tester", title: "QA", bio: "hi",
      font: "rubik",
      translations: { ar: { name: "مختبر", title: null, bio: "مرحبا" } },
    },
    items: [
      { id: "33333333-3333-4333-8333-333333333331", type: "link", label: "Site", url: "https://example.com", description: null, image_url: null, sort_order: 1, visible: true },
      { id: "33333333-3333-4333-8333-333333333332", type: "text", label: "Note", url: null, description: null, image_url: null, sort_order: 2, visible: false },
    ],
  }),
  env,
});
data = await res.json();
check("save bio", res.status === 200 && data.profile?.font === "rubik" && data.items?.length === 2, JSON.stringify(data.error || ""));

// 4. public bio (visible only + font + translations)
res = await publicBio({ request: req(`/api/u/${uname}`), env, params: { username: uname } });
data = await res.json();
check("public bio", res.status === 200 && data.items?.length === 1 && data.profile?.font === "rubik" && data.profile?.translations?.ar?.name === "مختبر");

// 5. tracking
res = await track({ request: req(`/api/u/${uname}`, "POST", { type: "view", lang: "ar" }), env, params: { username: uname } });
check("track view", res.status === 200);
res = await track({ request: req(`/api/u/${uname}`, "POST", { type: "click", itemId: "33333333-3333-4333-8333-333333333331" }), env, params: { username: uname } });
check("track click", res.status === 200);

// 6. stats
res = await statsGet({ request: req("/api/stats"), env });
data = await res.json();
check("stats", res.status === 200 && data.views >= 1 && data.clicks >= 1 && data.perItem?.length === 1, JSON.stringify(data));

// 7. twitter (informational — external service)
res = await twitterGet({ request: req("/api/twitter?handle=elonmusk"), env });
data = await res.json().catch(() => ({}));
console.log(`${res.status === 200 ? "PASS" : "WARN"}  twitter import ${res.status === 200 ? data.name || "" : res.status}`);

// 8. agent (informational — external Gemini)
res = await agentPost({ request: req("/api/agent", "POST", { prompt: "coffee scientist in tokyo with a youtube channel about brewing" }), env });
data = await res.json().catch(() => ({}));
console.log(`${res.status === 200 ? "PASS" : "WARN"}  agent generate ${res.status === 200 ? `→ "${data.profile?.name}" + ${data.items?.length} items + ${Object.keys(data.translations || {}).length} translations` : JSON.stringify(data)}`);

// 9. unauthenticated access
res = await bioGet({ request: req("/api/bio"), env: { ...env, SUPABASE_URL: "" } });
check("unauthenticated 401", res.status === 401);

// 10. cleanup
const { neon } = await import("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);
await sql`DELETE FROM users WHERE username = ${uname}`;
mockSupabase.close();
console.log("cleanup done");
