import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { serverEnv } from "@/lib/env";

/**
 * Session shape returned by Better Auth — narrowed for our use.
 */
export type AppSession = {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: "PLAYER" | "ADMIN";
  };
};

/**
 * `cache()` ensures one DB query per request even if multiple DAL
 * functions call it (PLAN §6 / Next docs "data-security").
 */
export const verifySession = cache(async (): Promise<AppSession | null> => {
  const h = await headers();
  const result = await auth.api.getSession({ headers: h });
  if (!result?.user?.email) return null;

  // Admin gate comes from env allowlist (PLAN decision #3), not the DB,
  // so the role field is computed here for every call.
  const admins = new Set(serverEnv().ADMIN_EMAILS);
  const role: AppSession["user"]["role"] = admins.has(
    result.user.email.toLowerCase(),
  )
    ? "ADMIN"
    : "PLAYER";

  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name ?? null,
      image: result.user.image ?? null,
      role,
    },
  };
});

/** Convenience: is this session an admin? */
export async function isAdmin(): Promise<boolean> {
  const s = await verifySession();
  return s?.user.role === "ADMIN";
}

/** Hard gate — throws a redirect for Server Actions / pages. */
export async function requireSession(): Promise<AppSession> {
  const s = await verifySession();
  if (!s) redirect("/sign-in");
  return s;
}

/** Hard admin gate — redirects to `/` if not admin. */
export async function requireAdmin(): Promise<AppSession> {
  const s = await requireSession();
  if (s.user.role !== "ADMIN") redirect("/");
  return s;
}
