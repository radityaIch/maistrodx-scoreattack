import Link from "next/link";
import { listAllTournamentsForAdmin } from "@/lib/dal/tournaments";

export default async function AdminTournamentsPage() {
  const list = await listAllTournamentsForAdmin();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-display text-3xl">Tournaments</h1>
        <Link href="/admin/tournaments/new" className="btn btn-brand hover:bg-[#ff4d9d]">
          New tournament
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="card p-8 text-center text-[color:var(--color-muted-foreground)]">
          No tournaments yet.
        </div>
      ) : (
        <ul className="card divide-y divide-[color:var(--color-border)]">
          {list.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <div className="min-w-0">
                <Link
                  href={`/admin/tournaments/${t.id}`}
                  className="font-medium hover:text-[color:var(--color-brand)]"
                >
                  {t.name}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[color:var(--color-muted-foreground)]">
                  <code className="rounded bg-[color:var(--color-muted)] px-1.5 py-0.5">
                    {t.slug}
                  </code>
                  <span>·</span>
                  <span>{t.scoringRule.toLowerCase()}</span>
                  <span>·</span>
                  <span>
                    ends {new Date(t.submissionDeadline).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <StatusPill status={t.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "OPEN"
      ? "text-[color:var(--color-success)] border-[color:var(--color-success)]"
      : status === "DRAFT"
        ? "text-[color:var(--color-muted-foreground)] border-[color:var(--color-border)]"
        : status === "FINALIZED"
          ? "text-[color:var(--color-brand)] border-[color:var(--color-brand)]"
          : "text-[color:var(--color-warning)] border-[color:var(--color-warning)]";
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cls}`}
    >
      {status.toLowerCase()}
    </span>
  );
}
