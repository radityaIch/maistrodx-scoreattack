import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const [pendingCount, openCount, draftCount, mineCount] = await Promise.all([
    prisma.scoreSubmission.count({ where: { status: "PENDING" } }),
    prisma.tournament.count({ where: { status: "OPEN" } }),
    prisma.tournament.count({ where: { status: "DRAFT" } }),
    prisma.tournament.count(),
  ]);

  return (
    <div>
      <h1 className="text-display text-3xl mb-6">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pending submissions" value={pendingCount} accent="warning" />
        <Stat label="Open tournaments" value={openCount} accent="success" />
        <Stat label="Drafts" value={draftCount} />
        <Stat label="Total tournaments" value={mineCount} />
      </div>

      <section className="mt-10">
        <h2 className="text-display text-lg mb-3">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/tournaments/new"
            className="btn btn-brand hover:bg-[#ff4d9d]"
          >
            Create tournament
          </Link>
          <Link
            href="/admin/tournaments"
            className="btn btn-ghost hover:bg-[color:var(--color-muted)]"
          >
            Manage tournaments
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "warning" | "success";
}) {
  const accentCls =
    accent === "warning"
      ? "text-[color:var(--color-warning)]"
      : accent === "success"
        ? "text-[color:var(--color-success)]"
        : "text-[color:var(--color-foreground)]";
  return (
    <div className="card p-5">
      <div className={`text-display text-3xl ${accentCls}`}>{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
        {label}
      </div>
    </div>
  );
}
