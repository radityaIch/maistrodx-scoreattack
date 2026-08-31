import Link from "next/link";
import { listPublicTournaments } from "@/lib/dal/tournaments";

export default async function TournamentsPage() {
  const tournaments = await listPublicTournaments();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pt-14">
      <section className="pb-8">
        <p className="eyebrow">public board</p>
        <h1 className="mt-3 text-display text-4xl text-[color:var(--color-foreground)] sm:text-5xl">
          Running tournaments
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--color-muted-foreground)]">
          All active maimai tournaments currently open to the public. Check the status, deadline, and details before you enter the next set.
        </p>
      </section>

      {tournaments.length === 0 ? (
        <div className="arcade-panel p-8 text-center text-[color:var(--color-muted-foreground)]">
          No public tournaments are running right now. The next community board is waiting to be scheduled.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
            <span className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-panel)] px-3 py-2">
              {tournaments.length} total
            </span>
            <span className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-panel)] px-3 py-2">
              {tournaments.filter((t) => t.status === "OPEN").length} open
            </span>
          </div>

          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tournaments.map((t) => (
              <li key={t.id}>
                <Link href={`/tournaments/${t.slug}`} className="tournament-card block h-full p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="eyebrow text-[10px]">{t.status}</p>
                      <h2 className="mt-3 text-display text-xl text-[color:var(--color-foreground)]">
                        {t.name}
                      </h2>
                    </div>
                    <span className="chip chip-pink">{t.status.toLowerCase()}</span>
                  </div>

                  {t.description && (
                    <p className="mt-4 text-sm leading-6 text-[color:var(--color-muted-foreground)]">
                      {t.description}
                    </p>
                  )}

                  <div className="mt-5 space-y-3 text-sm text-[color:var(--color-foreground)]">
                    <div className="flex items-center justify-between gap-3 border-t border-[color:var(--color-border)] pt-3">
                      <span className="text-[color:var(--color-muted-foreground)]">deadline</span>
                      <span>
                        {new Date(t.submissionDeadline).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[color:var(--color-muted-foreground)]">verification</span>
                      <span className="text-[color:var(--color-accent)]">required</span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[color:var(--color-muted-foreground)]">format</span>
                      <span>{t.scoringRule === "BEST_N" ? `Best ${t.bestN ?? "N"}` : "Aggregate"}</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
