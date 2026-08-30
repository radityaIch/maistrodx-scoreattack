import "server-only";
import { prisma } from "@/lib/db";

/**
 * Ranking queries (PLAN §8b).
 * Tie-break order: totalPct DESC → tracks DESC → firstSub ASC.
 *
 * Final two-way ties shown as shared rank; admin resolves manually.
 */

export type LeaderboardRow = {
  playerId: string;
  displayName: string | null;
  email: string;
  maimaiFriendCode: string | null;
  totalPct: number;
  tracks: number;
  firstSub: Date;
};

/**
 * Pick the best verified submission per (playerId, trackId).
 * Uses `@@index([tournamentId, sheetId, achievementPct DESC])` so the
 * DISTINCT ON pick is a single index range scan.
 */
async function bestPerTrack(tournamentId: string) {
  return prisma.$queryRawUnsafe<
    Array<{ playerId: string; achievementPct: string; submittedAt: Date }>
  >(
    `SELECT DISTINCT ON (s."playerId", s."trackId")
            s."playerId",
            s."achievementPct"::text AS "achievementPct",
            s."submittedAt"
       FROM "ScoreSubmission" s
       JOIN "TournamentTrack" t ON t.id = s."trackId"
      WHERE t."tournamentId" = $1
        AND s.status = 'VERIFIED'
      ORDER BY s."playerId", s."trackId", s."achievementPct" DESC`,
    tournamentId,
  );
}

/** AGGREGATE: sum all track bests per player (PLAN §8b default). */
export async function leaderboardAggregate(
  tournamentId: string,
  limit = 50,
): Promise<LeaderboardRow[]> {
  const best = await bestPerTrack(tournamentId);
  if (best.length === 0) return [];

  const playerIds = Array.from(new Set(best.map((r) => r.playerId)));
  const users = await prisma.user.findMany({
    where: { id: { in: playerIds } },
    select: {
      id: true,
      email: true,
      displayName: true,
      maimaiFriendCode: true,
    },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  // Group & sum in JS — total rows per tournament is bounded.
  const totals = new Map<
    string,
    { total: number; tracks: number; first: number }
  >();
  for (const row of best) {
    const pct = Number(row.achievementPct);
    const ts = row.submittedAt.getTime();
    const acc = totals.get(row.playerId);
    if (acc) {
      acc.total += pct;
      acc.tracks += 1;
      if (ts < acc.first) acc.first = ts;
    } else {
      totals.set(row.playerId, { total: pct, tracks: 1, first: ts });
    }
  }

  const ranked = Array.from(totals.entries())
    .map(([playerId, v]) => {
      const u = byId.get(playerId)!;
      return {
        playerId,
        displayName: u.displayName,
        email: u.email,
        maimaiFriendCode: u.maimaiFriendCode,
        totalPct: Math.round(v.total * 100) / 100,
        tracks: v.tracks,
        firstSub: new Date(v.first),
      };
    })
    // tie-break: totalPct DESC → tracks DESC → firstSub ASC
    .sort((a, b) => {
      if (b.totalPct !== a.totalPct) return b.totalPct - a.totalPct;
      if (b.tracks !== a.tracks) return b.tracks - a.tracks;
      return a.firstSub.getTime() - b.firstSub.getTime();
    })
    .slice(0, limit);

  return ranked;
}

/** BEST_N: sum only the top `bestN` per player (PLAN §8b). */
export async function leaderboardBestN(
  tournamentId: string,
  bestN: number,
  limit = 50,
): Promise<LeaderboardRow[]> {
  // Same `best` CTE — pick top N per player via ROW_NUMBER.
  type R = { playerId: string; totalPct: string; tracks: number; firstSub: Date };
  const rows = await prisma.$queryRawUnsafe<R[]>(
    `WITH best AS (
       SELECT s."playerId",
              s."achievementPct"::numeric AS pct,
              s."trackId",
              s."submittedAt",
              ROW_NUMBER() OVER (
                PARTITION BY s."playerId"
                ORDER BY s."achievementPct" DESC, s."submittedAt" ASC
              ) AS rn
         FROM "ScoreSubmission" s
         JOIN "TournamentTrack" t ON t.id = s."trackId"
        WHERE t."tournamentId" = $1 AND s.status = 'VERIFIED'
     ),
     topn AS (
       SELECT "playerId", pct, "submittedAt"
         FROM best
        WHERE rn <= $2
     ),
     totals AS (
       SELECT "playerId",
              SUM(pct)::numeric AS totalPct,
              COUNT(*)::int      AS tracks,
              MIN("submittedAt") AS firstSub
         FROM topn
        GROUP BY "playerId"
     )
     SELECT * FROM totals
      ORDER BY totalPct DESC, tracks DESC, firstSub ASC
      LIMIT $3`,
    tournamentId,
    bestN,
    limit,
  );

  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.playerId);
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      email: true,
      displayName: true,
      maimaiFriendCode: true,
    },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return rows.map((r) => {
    const u = byId.get(r.playerId);
    return {
      playerId: r.playerId,
      displayName: u?.displayName ?? null,
      email: u?.email ?? "(deleted user)",
      maimaiFriendCode: u?.maimaiFriendCode ?? null,
      totalPct: Math.round(Number(r.totalPct) * 100) / 100,
      tracks: r.tracks,
      firstSub: r.firstSub,
    };
  });
}
