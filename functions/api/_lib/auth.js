export async function verifySupabaseToken(token, env) {
  if (!token || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  try {
    const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY },
    });
    if (!r.ok) return null;
    return await r.json(); // { id, email, user_metadata, ... }
  } catch {
    return null;
  }
}

// Supabase JWT verification — works in Cloudflare Workers and Node 18+.
// The client signs in with @supabase/supabase-js and sends its access token;
// we verify it against the Supabase Auth API.
export async function getSupabaseUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  return verifySupabaseToken(auth.replace(/^Bearer\s+/i, ""), env);
}

export function json(status, error) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
