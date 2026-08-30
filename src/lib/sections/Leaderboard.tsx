import Link from "next/link";
import type { SectionComponentProps } from "@/lib/sections/registry";
import {
  leaderboardAggregate,
  leaderboardBestN,
} from "@/lib/dal/ranking";

export async function LeaderboardSection({
  tournament,
}: SectionComponentProps) {
  const rows =
    tournament.scoringRule === "BEST_N" && tournament.bestN
      ? await leaderboardBestN(tournament.id, tournament.bestN, 10)
      : await leaderboardAggregate(tournament.id, 10);

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-display text-2xl">Leaderboard</h2>
        <Link
          href={`/tournaments/${tournament.slug}/leaderboard`}
          className="text-xs uppercase tracking-wider text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
        >
          Full board →
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-[color:var(--color-muted-foreground)]">
          No verified scores yet.
        </p>
      ) : (
        <ol className="card divide-y divide-[color:var(--color-border)]">
          {rows.map((r, i) => (
            <li
              key={r.playerId}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-4">
                <span
                  className={`font-display w-6 text-lg ${i < 3 ? "text-[color:var(--color-brand)]" : "text-[color:var(--color-muted-foreground)]"}`}
                >
                  {i + 1}
                </span>
                <span className="font-medium">
                  {r.displayName ?? r.email}
                </span>
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
          ))}
        </ol>
      )}
    </section>
  );
}
