import { Suspense } from "react";
import { requireAdmin } from "@/lib/dal/session";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl gap-8 px-6 py-10">
      <aside className="w-48 shrink-0">
        <h2 className="text-display text-lg">Admin</h2>
        <nav className="mt-4 flex flex-col gap-1 text-sm">
          <Link
            href="/admin"
            className="rounded-md px-3 py-1.5 hover:bg-[color:var(--color-muted)]"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/tournaments"
            className="rounded-md px-3 py-1.5 hover:bg-[color:var(--color-muted)]"
          >
            Tournaments
          </Link>
          <Link
            href="/admin/tournaments/new"
            className="rounded-md px-3 py-1.5 hover:bg-[color:var(--color-muted)]"
          >
            New tournament
          </Link>
        </nav>
      </aside>
      <div className="flex-1 min-w-0">
        {/* Server-side hard gate (PLAN §6). Wrapped in Suspense so the cookie
            read doesn't block prerender of the shell. */}
        <Suspense fallback={<div className="text-sm text-[color:var(--color-muted-foreground)]">Checking access…</div>}>
          <AdminGate>{children}</AdminGate>
        </Suspense>
      </div>
    </div>
  );
}

async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
