"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser-side Better Auth client (PLAN §6).
 * Use for `signIn.social()`, `signOut()`, `useSession()` etc.
 */
export const authClient = createAuthClient({
  // baseURL inferred from window.location in the browser.
});

export const { signIn, signOut, useSession } = authClient;
