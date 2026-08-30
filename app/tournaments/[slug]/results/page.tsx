import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTournamentBySlug } from "@/lib/dal/tournaments";
import {
  leaderboardAggregate,
  leaderboardBestN,
} from "@/lib/dal/ranking";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-sm text-[color:var(--color-muted-foreground)]">
          Loading…
        </div>
      }
    >
      <ResultsInner params={params} />
    </Suspense>
  );
}

async function ResultsInner({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let tournament;
  try {
    tournament = await getTournamentBySlug(slug);
  } catch {
    tournament = null;
  }
  if (!tournament) notFound();

  let rows: Awaited<ReturnType<typeof leaderboardAggregate>> = [];
  try {
    rows =
      tournament.scoringRule === "BEST_N" && tournament.bestN
        ? await leaderboardBestN(tournament.id, tournament.bestN, 3)
        : await leaderboardAggregate(tournament.id, 3);
  } catch {
    rows = [];
  }

  const podium = ["first", "second", "third"] as const;
  const accent = tournament.accentColor ?? "#ff2e88";
  const rule =
    tournament.scoringRule === "BEST_N"
      ? `Best ${tournament.bestN ?? "?"}`
      : "Aggregate";

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <header className="mb-10 text-center">
        <Link
          href={`/tournaments/${tournament.slug}`}
          className="text-xs uppercase tracking-wider text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
        >
          ← back
        </Link>
        <p
          className="mt-4 text-xs uppercase tracking-[0.3em]"
          style={{ color: accent }}
        >
          final results
        </p>
        <h1 className="text-display mt-2 text-4xl">{tournament.name}</h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
          Scoring: {rule}. Tie-break order: total % → tracks → earliest
          submission. Final two-way ties shown as shared rank.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-[color:var(--color-muted-foreground)]">
          No verified scores. Winners will appear once the tournament is
          finalized.
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-3">
          {rows.map((r, i) => (
            <li
              key={r.playerId}
              className={`card relative overflow-hidden p-6 text-center ${i === 0 ? "sm:order-2 sm:scale-105" : i === 1 ? "sm:order-1" : "sm:order-3"}`}
              style={
                i === 0
                  ? { borderColor: accent, boxShadow: `0 0 32px ${accent}33` }
                  : undefined
              }
            >
              <div
                className="text-xs uppercase tracking-[0.3em]"
                style={{ color: accent }}
              >
                {podium[i]}
              </div>
              <div className="mt-3 truncate text-sm font-medium">
                {r.displayName ?? r.email}
              </div>
              <div className="mt-2 font-mono text-3xl tabular-nums">
                {r.totalPct.toFixed(2)}%
              </div>
              <div className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                {r.tracks} tracks
              </div>
              {r.maimaiFriendCode && (
                <div className="mt-1 font-mono text-[10px] text-[color:var(--color-muted-foreground)]">
                  {r.maimaiFriendCode}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
