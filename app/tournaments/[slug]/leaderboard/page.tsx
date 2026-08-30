import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTournamentBySlug } from "@/lib/dal/tournaments";
import {
  leaderboardAggregate,
  leaderboardBestN,
} from "@/lib/dal/ranking";

export default async function LeaderboardPage({
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
      <LeaderboardInner params={params} />
    </Suspense>
  );
}

async function LeaderboardInner({
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
  if (!tournament || tournament.status === "DRAFT") notFound();

  let rows: Awaited<ReturnType<typeof leaderboardAggregate>> = [];
  try {
    rows =
      tournament.scoringRule === "BEST_N" && tournament.bestN
        ? await leaderboardBestN(tournament.id, tournament.bestN, 500)
        : await leaderboardAggregate(tournament.id, 500);
  } catch {
    rows = [];
  }

  const rule =
    tournament.scoringRule === "BEST_N"
      ? `Best ${tournament.bestN ?? "?"} (sum of top N track bests)`
      : "Aggregate (sum of every track best)";

  const ranked = rows.map((r, i) => ({
    r,
    rank:
      i === 0
        ? 1
        : (() => {
            const prev = rows[i - 1];
            const sameKey =
              prev.totalPct === r.totalPct &&
              prev.tracks === r.tracks &&
              prev.firstSub.getTime() === r.firstSub.getTime();
            return sameKey ? i : i + 1;
          })(),
  }));
  const rankByPlayer = new Map(ranked.map((x) => [x.r.playerId, x.rank]));

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="mb-6">
        <Link
          href={`/tournaments/${tournament.slug}`}
          className="text-xs uppercase tracking-wider text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
        >
          ← back
        </Link>
        <h1 className="text-display mt-2 text-3xl">
          {tournament.name} · Leaderboard
        </h1>
        <p className="mt-1 text-xs uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
          {rule} · tie-break: total % → tracks → earliest submission
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-[color:var(--color-muted-foreground)]">
          No verified scores yet.
        </div>
      ) : (
        <ol className="card divide-y divide-[color:var(--color-border)]">
          {rows.map((r) => {
            const rank = rankByPlayer.get(r.playerId) ?? 1;
            return (
              <li
                key={r.playerId}
                className="flex items-center justify-between gap-4 px-5 py-3 text-sm"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`font-display w-8 text-lg ${rank <= 3 ? "text-[color:var(--color-brand)]" : "text-[color:var(--color-muted-foreground)]"}`}
                  >
                    {rank}
                  </span>
                  <div>
                    <div className="font-medium">
                      {r.displayName ?? r.email}
                    </div>
                    {r.maimaiFriendCode && (
                      <div className="font-mono text-xs text-[color:var(--color-muted-foreground)]">
                        {r.maimaiFriendCode}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-xs text-[color:var(--color-muted-foreground)]">
                    {r.tracks} tracks
                  </span>
                  <span className="font-mono tabular-nums">
                    {r.totalPct.toFixed(2)}%
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
