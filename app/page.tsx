import Link from "next/link";
import { listPublicTournaments } from "@/lib/dal/tournaments";

const verificationSteps = [
  {
    title: "Submit a run",
    detail: "Players upload a score screenshot and the associated achievement percentage for review.",
  },
  {
    title: "Moderator check",
    detail: "Admins verify the entry before it counts toward the public leaderboard and results.",
  },
  {
    title: "Board updates",
    detail: "Verified scores move the tournament standings and keep the bracket honest.",
  },
];

const communityMoves = [
  "Rules published before the tournament starts",
  "Score submissions tied to real, verifiable runs",
  "Public standings that shift as results are approved",
  "Built for weekly events, finals, and community rivalry",
];

export default async function HomePage() {
  const tournaments = await listPublicTournaments();
  const openTournaments = tournaments.filter((t) =>
    ["OPEN", "CLOSED", "FINALIZED"].includes(t.status),
  );

  return (
    <div className="site-shell">
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pt-14">
        <section className="grid gap-8 pb-14 pt-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:pt-16">
          <div className="space-y-7">
            <p className="eyebrow">community maimai tournaments</p>
            <h1 className="text-display text-5xl leading-none text-[color:var(--color-foreground)] sm:text-6xl lg:text-7xl">
              Run the set.
              <span className="block text-[color:var(--color-accent)]">Own the board.</span>
            </h1>
            <p className="max-w-xl text-lg leading-8 text-[color:var(--color-muted-foreground)]">
              Community-run maimai tournaments with real verification, transparent rules, and public standings that move as the results are reviewed.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/tournaments" className="btn btn-brand">
                Browse tournaments
              </Link>
              <Link href="/sign-in" className="btn btn-ghost">
                Submit a score
              </Link>
            </div>
          </div>

          <div className="arcade-panel p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="eyebrow">live board</span>
              <span className="chip chip-cyan">waiting</span>
            </div>

            {openTournaments.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-muted-foreground)]">
                    current event
                  </p>
                  <h2 className="mt-2 text-display text-2xl text-[color:var(--color-foreground)]">
                    {openTournaments[0].name}
                  </h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="metric-box">
                    <span className="metric-label">status</span>
                    <span className="metric-value">{openTournaments[0].status}</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">deadline</span>
                    <span className="metric-value">
                      {new Date(openTournaments[0].submissionDeadline).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] p-3">
                  <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted-foreground)]">
                    <span>leaderboard</span>
                    <span>pending</span>
                  </div>
                  <div className="rounded-xl border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-4 text-sm text-[color:var(--color-muted-foreground)]">
                    No verified results yet. The board will populate after the first accepted submission.
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-6 text-center text-[color:var(--color-muted-foreground)]">
                No active tournaments yet. When a community event goes live, it will appear here.
              </div>
            )}
          </div>
        </section>

        <section id="tournaments" className="scroll-mt-28 py-8 sm:py-12">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">active events</p>
              <h2 className="mt-2 text-display text-3xl text-[color:var(--color-foreground)]">
                Tournament board
              </h2>
            </div>
            <Link href="/sign-in" className="text-sm font-medium text-[color:var(--color-accent)] transition hover:text-[color:var(--color-foreground)]">
              Sign in to submit a score
            </Link>
          </div>

          {tournaments.length === 0 ? (
            <div className="arcade-panel p-8 text-center text-[color:var(--color-muted-foreground)]">
              The current board is empty. The next community event is waiting to be scheduled.
            </div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tournaments.map((t) => (
                <li key={t.id}>
                  <Link href={`/tournaments/${t.slug}`} className="tournament-card block h-full p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="eyebrow text-[10px]">{t.status}</p>
                        <h3 className="mt-3 text-display text-xl text-[color:var(--color-foreground)]">
                          {t.name}
                        </h3>
                      </div>
                      <span className="chip chip-pink">open</span>
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
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="verification" className="scroll-mt-28 py-8 sm:py-12">
          <div className="mb-6">
            <p className="eyebrow">score integrity</p>
            <h2 className="mt-2 text-display text-3xl text-[color:var(--color-foreground)]">
              Built to keep the board honest
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {verificationSteps.map((step, index) => (
              <article key={step.title} className="arcade-panel p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--color-accent)] text-xs font-bold text-[color:var(--color-background)]">
                    {index + 1}
                  </span>
                  <span className="chip chip-pink">flow</span>
                </div>
                <h3 className="text-display text-lg text-[color:var(--color-foreground)]">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[color:var(--color-muted-foreground)]">
                  {step.detail}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="py-8 sm:py-12">
          <div className="arcade-panel overflow-hidden p-5 sm:p-7">
            <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
              <div>
                <p className="eyebrow">leaderboard pulse</p>
                <h2 className="mt-2 text-display text-3xl text-[color:var(--color-foreground)]">
                  The board waits for real results
                </h2>
                <p className="mt-4 max-w-lg text-base leading-7 text-[color:var(--color-muted-foreground)]">
                  When a tournament is live, verified scores appear here with the same rules and moderation flow used across the platform.
                </p>
              </div>

              <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-background)] p-5 text-sm leading-7 text-[color:var(--color-muted-foreground)]">
                No verified leaderboard data is available yet. This section will populate when submissions are accepted and scored.
              </div>
            </div>
          </div>
        </section>

        <section id="community" className="scroll-mt-28 py-8 sm:py-12">
          <div className="mb-6">
            <p className="eyebrow">community rhythm</p>
            <h2 className="mt-2 text-display text-3xl text-[color:var(--color-foreground)]">
              Designed for weekly runs and finals
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="arcade-panel p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--color-muted-foreground)]">
                the product story
              </p>
              <p className="mt-4 text-lg leading-8 text-[color:var(--color-foreground)]">
                This platform exists for score-driven community competition, where structure matters as much as the chase itself.
              </p>
            </div>

            <ul className="space-y-3">
              {communityMoves.map((item) => (
                <li key={item} className="arcade-panel flex items-center gap-3 p-4 text-sm text-[color:var(--color-foreground)]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--color-brand)] text-xs font-bold text-white">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="py-10 sm:py-14">
          <div className="arcade-panel flex flex-col items-start justify-between gap-6 p-6 sm:p-8 lg:flex-row lg:items-center">
            <div>
              <p className="eyebrow">next up</p>
              <h2 className="mt-2 text-display text-3xl text-[color:var(--color-foreground)]">
                Ready for the next set?
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/tournaments" className="btn btn-brand">
                See active events
              </Link>
              <Link href="/sign-in" className="btn btn-ghost">
                Sign in to compete
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
