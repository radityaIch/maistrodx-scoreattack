"use server";

import { updateTag, revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/dal/session";

/**
 * Player score-submission Server Action (PLAN §8a).
 * Enforced in order:
 *   1. Auth
 *   2. Shape + URL regex
 *   3. Track in tournament + tournament OPEN + now in window
 *   4. Achievement cap
 *   5. Rate limit (≤10 / rolling hour)
 *   6. Upsert (playerId, trackId)
 *   7. Cache invalidation
 */

const URL_RE = /^https?:\/\/.*\.(png|jpe?g|webp|gif)(\?.*)?$/i;
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function str(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}
function num(v: FormDataEntryValue | null) {
  if (typeof v !== "string" || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export type SubmitResult =
  | { ok: true; id: string; upserted: boolean }
  | { ok: false; error: string };

export async function submitScoreAction(
  formData: FormData,
): Promise<SubmitResult> {
  // 1. Auth
  const session = await requireSession();

  // 2. Shape
  const trackId = str(formData.get("trackId"));
  const screenshotUrl = str(formData.get("screenshotUrl"));
  const note = str(formData.get("note")) || null;
  const achievementRaw = str(formData.get("achievementPct"));

  if (!trackId) return { ok: false, error: "missing trackId" };
  if (!URL_RE.test(screenshotUrl)) {
    return { ok: false, error: "screenshotUrl must be an image URL" };
  }
  const achievement = num(achievementRaw);
  if (achievement === null || achievement < 0 || achievement > 101) {
    return { ok: false, error: "achievementPct must be between 0 and 101" };
  }

  // 3. Track in tournament + OPEN + within window
  const track = await prisma.tournamentTrack.findUnique({
    where: { id: trackId },
    include: { tournament: true },
  });
  if (!track) return { ok: false, error: "track not found" };

  const t = track.tournament;
  const now = new Date();
  if (t.status !== "OPEN") {
    return { ok: false, error: "tournament is not open for submissions" };
  }
  if (now < t.registrationOpensAt) {
    return { ok: false, error: "registration has not opened yet" };
  }
  if (now > t.submissionDeadline) {
    return { ok: false, error: "submission deadline has passed" };
  }

  // 4. Achievement cap
  if (achievement > t.maxAchievementPct) {
    return {
      ok: false,
      error: `achievement exceeds tournament cap (${t.maxAchievementPct}%)`,
    };
  }

  // 5. Rate limit
  const since = new Date(now.getTime() - RATE_WINDOW_MS);
  const recent = await prisma.scoreSubmission.count({
    where: {
      playerId: session.user.id,
      submittedAt: { gte: since },
    },
  });
  if (recent >= RATE_LIMIT) {
    return { ok: false, error: `rate limit: max ${RATE_LIMIT}/hour` };
  }

  // 6. Upsert by (playerId, trackId)
  const existing = await prisma.scoreSubmission.findUnique({
    where: { playerId_trackId: { playerId: session.user.id, trackId } },
    select: { id: true, status: true },
  });

  const upserted = await prisma.scoreSubmission.upsert({
    where: { playerId_trackId: { playerId: session.user.id, trackId } },
    create: {
      tournamentId: t.id,
      trackId,
      sheetId: track.sheetId,
      playerId: session.user.id,
      achievementPct: achievement.toFixed(2),
      screenshotUrl,
      note,
      status: "PENDING",
    },
    update: {
      achievementPct: achievement.toFixed(2),
      screenshotUrl,
      note,
      status: "PENDING",
      submittedAt: new Date(),
      decidedAt: null,
      decidedById: null,
      decideReason: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: existing ? "submission.upsert" : "submission.create",
      targetType: "ScoreSubmission",
      targetId: upserted.id,
      payload: {
        tournamentId: t.id,
        trackId,
        achievementPct: achievement,
        previousStatus: existing?.status ?? null,
      },
    },
  });

  // 7. Invalidate caches
  updateTag(`tournament:${t.id}`);
  updateTag(`tournament:slug:${t.slug}`);
  updateTag(`tournament:${t.id}:subs:${session.user.id}`);
  updateTag("tournaments:public");
  revalidatePath(`/tournaments/${t.slug}`);
  revalidatePath("/me");

  return { ok: true, id: upserted.id, upserted: Boolean(existing) };
}
