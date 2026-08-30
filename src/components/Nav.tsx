import Link from "next/link";
import { Trophy } from "lucide-react";
import { SignOutButton } from "@/components/SignOutButton";

type NavUser = {
  email: string;
  name: string | null;
  role: "PLAYER" | "ADMIN";
} | null;

export function Nav({ user }: { user: NavUser }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--color-border)] bg-[color:var(--color-background)]/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <Trophy
            className="h-5 w-5 text-[color:var(--color-brand)]"
            aria-hidden
          />
          <span className="text-display text-lg">maistrodx</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className="rounded-md px-3 py-1.5 text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
            >
              Admin
            </Link>
          )}
          {user ? (
            <>
              <Link
                href="/me"
                className="rounded-md px-3 py-1.5 text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
              >
                {user.name ?? user.email}
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link href="/sign-in" className="btn btn-brand">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
