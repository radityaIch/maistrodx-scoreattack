import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (was `middleware` in Next ≤15) — PLAN §6.
 * NOTE: This is an OPTIMISTIC redirect only. Real auth checks live in
 * the DAL (`verifySession`, `requireAdmin`) so they cannot be bypassed
 * by forged requests.
 *
 * It catches the common case of an anonymous browser hitting a gated
 * route so the user lands on `/sign-in` instead of seeing a blank 500.
 */
const GATED_PREFIXES = ["/me", "/admin"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Quick check for the Better-Auth session cookie. If present, we trust
  // the DAL to confirm; if absent, redirect to sign-in.
  const hasSession = request.cookies.has("better-auth.session_token");

  if (!hasSession && GATED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next internals + static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
