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

export function getAdminClient() {
  return createAdminClient();
}
