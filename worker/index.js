// Cloudflare Worker entry — serves the API routes and static assets.
// The handlers in functions/api/* are shared verbatim between this Worker
// deployment and Cloudflare Pages (if used).
import * as me from "../functions/api/auth/me.js";
import * as setUsername from "../functions/api/auth/username.js";
import * as bio from "../functions/api/bio/index.js";
import * as pages from "../functions/api/pages.js";
import * as publicUser from "../functions/api/u/[username].js";
import * as publicSlug from "../functions/api/p/[slug].js";
import * as stats from "../functions/api/stats.js";
import * as twitter from "../functions/api/twitter.js";
import * as agent from "../functions/api/agent.js";

const ROUTES = [
  { pattern: /^\/api\/auth\/me$/, mod: me },
  { pattern: /^\/api\/auth\/username$/, mod: setUsername },
  { pattern: /^\/api\/bio$/, mod: bio },
  { pattern: /^\/api\/pages$/, mod: pages },
  { pattern: /^\/api\/u\/([^/]+)$/, mod: publicUser, param: "username" },
  { pattern: /^\/api\/p\/([^/]+)$/, mod: publicSlug, param: "slug" },
  { pattern: /^\/api\/stats$/, mod: stats },
  { pattern: /^\/api\/twitter$/, mod: twitter },
  { pattern: /^\/api\/agent$/, mod: agent },
];

function json(status, error) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    for (const route of ROUTES) {
      const m = url.pathname.match(route.pattern);
      if (!m) continue;
      const params = route.param ? { [route.param]: decodeURIComponent(m[1]) } : {};
      const method = request.method.toUpperCase();
      const handler = mod0(route.mod, method);
      if (!handler) return json(405, "Method not allowed.");
      try {
        return await handler({ request, env, params, data: {} });
      } catch (e) {
        console.error(e);
        return json(500, e.message || "Internal error.");
      }
    }
    return json(404, "API route not found.");
  },
};

function mod0(mod, method) {
  const name = `onRequest${method.charAt(0)}${method.slice(1).toLowerCase()}`;
  return mod[name];
}
