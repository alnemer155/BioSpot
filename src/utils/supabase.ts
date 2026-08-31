import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

function proxyFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (supabaseUrl && url.startsWith(supabaseUrl)) {
    const path = url.slice(supabaseUrl.length);
    const qsIndex = path.indexOf("?");
    const basePath = qsIndex >= 0 ? path.slice(0, qsIndex) : path;
    const qs = qsIndex >= 0 ? path.slice(qsIndex) : "";
    return fetch(`/api/supa-proxy${basePath}${qs}`, init);
  }
  return fetch(input, init);
}

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        global: { fetch: proxyFetch },
        auth: {
          autoRefreshToken: false,
          persistSession: true,
          detectSessionInUrl: false,
          flowType: "implicit",
        },
      })
    : null;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);
