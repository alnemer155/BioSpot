export async function onRequestPost(context) {
  const { request, env } = context;
  const SUPA_URL = env.SUPABASE_URL;
  const SUPA_KEY = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
  try {
    const { email, password } = await request.json();
    const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: SUPA_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const text = await r.text();
    const data = text ? JSON.parse(text) : {};
    if (!r.ok) return Response.json({ error: data.msg || data.error_description || "Signin failed" }, { status: r.status });
    return Response.json({ session: { access_token: data.access_token, refresh_token: data.refresh_token }, user: data.user });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
