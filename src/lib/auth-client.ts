import { createAuthClient } from "better-auth/react";
import { sentinelClient } from "@better-auth/infra/client";

// Production Better Auth server is https://api.linktroo.cc
// Vite requires VITE_ prefix for frontend env vars
const baseURL =
  import.meta.env.VITE_BETTER_AUTH_URL ||
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "https://api.linktroo.cc" : undefined);

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [
    sentinelClient(),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
