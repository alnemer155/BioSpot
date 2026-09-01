import { createAuthClient } from "better-auth/react";
import { sentinelClient } from "@better-auth/infra/client";

export const authClient = createAuthClient({
  fetchOptions: {
    credentials: "include",
  },
  plugins: [
    sentinelClient(),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
