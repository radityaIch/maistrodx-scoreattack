import "server-only";
import { cacheTag } from "next/cache";
import { prisma } from "@/lib/db";
import type { TournamentStatus, ScoringRule } from "@prisma/client";

/**
 * Tournament read functions (DAL layer, PLAN §6 / data-security).
 * Public reads do not require auth.
 *
 * Uses `'use cache'` (PLAN §7) so admin mutations can `updateTag('tournament:<id>')`
 * to invalidate downstream leaderboard / detail reads immediately.
 */

export type PublicTournament = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: TournamentStatus;
  scoringRule: ScoringRule;
  bestN: number | null;
  registrationOpensAt: Date;
  submissionDeadline: Date;
  accentColor: string | null;
  heroImageUrl: string | null;
  mascotImageUrl: string | null;
  mascotPosition: string;
  logoOverlayUrl: string | null;
  sectionsOrder: string[];
  rulesetMarkdown: string | null;
  maxAchievementPct: number;
  requireProof: boolean;
  createdAt: Date;
};

const publicSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  status: true,
  scoringRule: true,
  bestN: true,
  registrationOpensAt: true,
  submissionDeadline: true,
  accentColor: true,
  heroImageUrl: true,
  mascotImageUrl: true,
  mascotPosition: true,
  logoOverlayUrl: true,
  sectionsOrder: true,
  rulesetMarkdown: true,
  maxAchievementPct: true,
  requireProof: true,
  createdAt: true,
} as const;

/** Tournaments visible on the landing page (DRAFT hidden). */
export async function listPublicTournaments(): Promise<PublicTournament[]> {
  "use cache";
  cacheTag("tournaments:public");
  try {
    return await prisma.tournament.findMany({
      where: { status: { in: ["OPEN", "CLOSED", "FINALIZED"] } },
      orderBy: [{ status: "asc" }, { submissionDeadline: "asc" }],
      select: publicSelect,
    });
  } catch {
    // Defensive: during `next build` without a reachable DB the prerender
    // shouldn't hard-fail. Real errors still surface on actual page loads.
    return [];
  }
}

/** Admin: list ALL tournaments (incl. DRAFT). */
export async function listAllTournamentsForAdmin(): Promise<PublicTournament[]> {
  "use cache";
  cacheTag("tournaments:admin");
  try {
    return await prisma.tournament.findMany({
      orderBy: { createdAt: "desc" },
      select: publicSelect,
    });
  } catch {
    return [];
  }
}

/**
 * Cached public read by slug — tagged so Server Actions can invalidate
 * via `updateTag('tournament:slug:<slug>')` for read-your-own-writes.
 */
export async function getTournamentBySlug(
  slug: string,
): Promise<PublicTournament | null> {
  "use cache";
  cacheTag(`tournament:slug:${slug}`);
  return prisma.tournament.findUnique({
    where: { slug },
    select: publicSelect,
  });
}

/** Tag used for a tournament across all its views. */
export const tournamentTag = (id: string) => `tournament:${id}`;
export const tournamentSlugTag = (slug: string) => `tournament:slug:${slug}`;
