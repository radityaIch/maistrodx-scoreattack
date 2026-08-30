import { Suspense } from "react";
import { verifySession } from "@/lib/dal/session";
import { Nav } from "@/components/Nav";

/**
 * Server-side wrapper around `<Nav />` that streams the user-session lookup.
 * Required by Next 16 cacheComponents: any code reading `cookies()` /
 * `headers()` outside a Suspense boundary blocks prerendering.
 */
export function NavSession() {
  return (
    <Suspense fallback={<Nav user={null} />}>
      <NavSessionInner />
    </Suspense>
  );
}

async function NavSessionInner() {
  const session = await verifySession();
  return (
    <Nav
      user={
        session
          ? {
              email: session.user.email,
              name: session.user.name,
              role: session.user.role,
            }
          : null
      }
    />
  );
}
