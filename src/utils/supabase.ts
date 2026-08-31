import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

const AUTH_ROUTES = ["/auth/v1/signup", "/auth/v1/token", "/auth/v1/logout", "/auth/v1/user", "/auth/v1/authorize"];

function proxyFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (supabaseUrl && url.startsWith(supabaseUrl)) {
    const path = url.slice(supabaseUrl.length);
    if (AUTH_ROUTES.some((r) => path.startsWith(r))) {
      const proxied = `/api/auth${path.replace("/auth/v1", "")}`;
      return fetch(proxied, init);
    }
  }
  return fetch(input, init);
}

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        global: { fetch: proxyFetch },
        auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
      })
    : null;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);
