export async function onRequestPost(context) {
  const { request, env } = context;
  const SUPA_URL = env.SUPABASE_URL;
  const SUPA_KEY = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
  try {
    const auth = request.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (token) {
      await fetch(`${SUPA_URL}/auth/v1/logout`, {
        method: "POST",
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: true });
  }
}
