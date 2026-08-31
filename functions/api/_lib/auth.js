import { verifyAuth, createContextClient, createAdminClient } from "@supabase/server/core";

export async function verifyToken(token) {
  if (!token) return null;
  try {
    const req = new Request("https://internal/auth", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { data, error } = await verifyAuth(req, { auth: "user" });
    if (error || !data) return null;
    return { token: data.token, claims: data.jwtClaims, userClaims: data.userClaims };
  } catch {
    return null;
  }
}

export function getUserClient(token) {
  return createContextClient({ auth: { token } });
}

export function getAdminClient() {
  return createAdminClient();
}

export function json(status, error) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
