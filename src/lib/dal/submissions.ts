import "server-only";
import { prisma } from "@/lib/db";
import { cacheTag } from "next/cache";

/** Resolve a tournament-track by id, ensuring it belongs to the tournament. */
export async function getTournamentTrack(
  tournamentId: string,
  trackId: string,
) {
  const track = await prisma.tournamentTrack.findFirst({
    where: { id: trackId, tournamentId },
    include: { sheet: { include: { song: true } } },
  });

  if (!track) return null;
  return {
    ...track,
    weight: track.weight.toString(),
  };
}

/** List all tracks + sheet info for a tournament (used by submit + admin). */
export async function listTournamentTracks(tournamentId: string) {
  "use cache";
  cacheTag(`tournament:${tournamentId}:tracks`);
  const tracks = await prisma.tournamentTrack.findMany({
    where: { tournamentId },
    orderBy: { id: "asc" },
    include: {
      sheet: {
        include: {
          song: {
            select: { songId: true, title: true, artist: true, imageName: true },
          },
        },
      },
    },
  });

  return tracks.map((track) => ({
    ...track,
    weight: track.weight.toString(),
  }));
}

/** List a player's submissions on a tournament (used by submit UI pre-fill). */
export async function listPlayerSubmissions(
  tournamentId: string,
  playerId: string,
) {
  "use cache";
  cacheTag(`tournament:${tournamentId}:subs:${playerId}`);
  const submissions = await prisma.scoreSubmission.findMany({
    where: { tournamentId, playerId },
    select: {
      id: true,
      trackId: true,
      achievementPct: true,
      screenshotUrl: true,
      status: true,
      submittedAt: true,
    },
  });

  return submissions.map((submission) => ({
    ...submission,
    achievementPct: submission.achievementPct.toString(),
  }));
}

/** Pending moderation queue for an admin. */
export async function listPendingSubmissions(tournamentId: string) {
  const submissions = await prisma.scoreSubmission.findMany({
    where: { tournamentId, status: "PENDING" },
    orderBy: { submittedAt: "asc" },
    include: {
      player: { select: { email: true, displayName: true } },
      sheet: { include: { song: { select: { title: true, imageName: true } } } },
    },
  });

  return submissions.map((submission) => ({
    ...submission,
    achievementPct: submission.achievementPct.toString(),
  }));
}
