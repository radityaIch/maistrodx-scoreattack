import Link from "next/link";
import type { SectionComponentProps } from "@/lib/sections/registry";
import {
  leaderboardAggregate,
  leaderboardBestN,
} from "@/lib/dal/ranking";

export async function AwardsSection({ tournament }: SectionComponentProps) {
  const rows =
    tournament.scoringRule === "BEST_N" && tournament.bestN
      ? await leaderboardBestN(tournament.id, tournament.bestN, 3)
      : await leaderboardAggregate(tournament.id, 3);

  const podium = ["first", "second", "third"] as const;
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-display text-2xl">Top 3</h2>
        <Link
          href={`/tournaments/${tournament.slug}/results`}
          className="text-xs uppercase tracking-wider text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
        >
          Full results →
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-[color:var(--color-muted-foreground)]">
          Winners will be revealed when the tournament ends.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-3">
          {rows.map((r, i) => (
            <li
              key={r.playerId}
              className="card relative overflow-hidden p-5 text-center"
              style={{ borderColor: i === 0 ? tournament.accentColor ?? "#ff2e88" : undefined }}
            >
              <div className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-muted-foreground)]">
                {podium[i]}
              </div>
              <div className="mt-2 truncate text-sm font-medium">
                {r.displayName ?? r.email}
              </div>
              <div className="mt-1 font-mono text-2xl tabular-nums">
                {r.totalPct.toFixed(2)}%
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
