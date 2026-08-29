// Direct end-to-end test of the Pages Functions handlers in Node.
import "dotenv/config";
import { onRequestPost as register } from "./functions/api/auth/register.js";
import { onRequestPost as login } from "./functions/api/auth/login.js";
import { onRequestGet as me } from "./functions/api/auth/me.js";
import { onRequestGet as bioGet, onRequestPut as bioPut } from "./functions/api/bio/index.js";
import { onRequestGet as publicBio } from "./functions/api/u/[username].js";

const env = { DATABASE_URL: process.env.DATABASE_URL, SESSION_SECRET: process.env.SESSION_SECRET };
const uname = `fn_test_${Date.now() % 100000}`;
let cookie = "";

function req(url, method = "GET", body) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  if (body) headers["Content-Type"] = "application/json";
  return new Request(`https://bio.test${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
}

function check(name, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} ${extra}`);
  if (!ok) process.exitCode = 1;
}

async function setCookie(res) {
  const sc = res.headers.get("Set-Cookie");
  if (sc) cookie = sc.split(";")[0];
}

// 1. register
let res = await register({ request: req("/api/auth/register", "POST", { username: uname, email: `${uname}@biospot.dev`, password: "password123" }), env });
await setCookie(res);
let data = await res.json();
check("register", res.status === 200 && data.user?.username === uname, JSON.stringify(data));

// 2. duplicate register
res = await register({ request: req("/api/auth/register", "POST", { username: uname, email: `x${uname}@biospot.dev`, password: "password123" }), env });
check("duplicate username rejected", res.status === 409, JSON.stringify(await res.json()));

// 3. login
cookie = "";
res = await login({ request: req("/api/auth/login", "POST", { email: `${uname}@biospot.dev`, password: "password123" }), env });
await setCookie(res);
data = await res.json();
check("login by email", res.status === 200 && data.user?.id, JSON.stringify(data));

res = await login({ request: req("/api/auth/login", "POST", { email: uname, password: "password123" }), env });
check("login by username", res.status === 200);

res = await login({ request: req("/api/auth/login", "POST", { email: uname, password: "wrongpass1" }), env });
check("wrong password rejected", res.status === 401);

// 4. me
res = await me({ request: req("/api/auth/me"), env });
data = await res.json();
check("me", res.status === 200 && data.user?.username === uname);

// 5. save bio
const items = [
  { id: "22222222-2222-4222-8222-222222222221", type: "link", label: "Site", url: "https://example.com", description: null, image_url: null, sort_order: 1, visible: true },
  { id: "22222222-2222-4222-8222-222222222222", type: "text", label: "Note", url: null, description: "hello", image_url: null, sort_order: 2, visible: false },
];
res = await bioPut({ request: req("/api/bio", "PUT", { profile: { name: "FN Tester", title: "QA", bio: "hi", avatar_url: null }, items }), env });
data = await res.json();
check("save bio", res.status === 200 && data.profile?.name === "FN Tester" && data.items?.length === 2, JSON.stringify(data.error || ""));

// 6. own bio get
res = await bioGet({ request: req("/api/bio"), env });
data = await res.json();
check("get own bio", res.status === 200 && data.items?.length === 2);

// 7. public bio (hidden item excluded)
res = await publicBio({ request: req(`/api/u/${uname}`), env, params: { username: uname } });
data = await res.json();
check("public bio shows only visible", res.status === 200 && data.items?.length === 1 && data.profile?.name === "FN Tester", JSON.stringify(data.error || ""));

// 8. unknown user
res = await publicBio({ request: req("/api/u/nobody999x"), env, params: { username: "nobody999x" } });
check("unknown user 404", res.status === 404);

// 9. unauthenticated
cookie = "";
res = await bioGet({ request: req("/api/bio"), env });
check("unauthenticated 401", res.status === 401);

// 10. cleanup test user
const { neon } = await import("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);
await sql`DELETE FROM users WHERE username = ${uname}`;
console.log("cleanup done");
