"use server";

import { updateTag, revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/dal/session";

/**
 * Moderation Server Actions (PLAN §8c).
 * Approve → VERIFIED, leaderboard picks it up.
 * Reject  → REJECTED with required reason (audit row preserved).
 */

function str(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}

export async function approveSubmissionAction(submissionId: string) {
  const admin = await requireAdmin();
  const sub = await prisma.scoreSubmission.findUnique({
    where: { id: submissionId },
    select: { id: true, tournamentId: true, tournament: { select: { slug: true } } },
  });
  if (!sub) return { ok: false as const, error: "not found" };

  await prisma.scoreSubmission.update({
    where: { id: submissionId },
    data: {
      status: "VERIFIED",
      decidedAt: new Date(),
      decidedById: admin.user.id,
      decideReason: null,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: admin.user.id,
      action: "submission.approve",
      targetType: "ScoreSubmission",
      targetId: submissionId,
    },
  });

  updateTag(`tournament:${sub.tournamentId}`);
  updateTag(`tournament:slug:${sub.tournament.slug}`);
  revalidatePath(`/admin/tournaments/${sub.tournamentId}/moderate`);
  revalidatePath(`/tournaments/${sub.tournament.slug}`);
  return { ok: true as const };
}

export async function rejectSubmissionAction(formData: FormData) {
  const admin = await requireAdmin();
  const submissionId = str(formData.get("submissionId"));
  const reason = str(formData.get("reason"));
  if (!submissionId) return { ok: false as const, error: "missing submissionId" };
  if (!reason) return { ok: false as const, error: "rejection reason required" };

  const sub = await prisma.scoreSubmission.findUnique({
    where: { id: submissionId },
    select: { id: true, tournamentId: true, tournament: { select: { slug: true } } },
  });
  if (!sub) return { ok: false as const, error: "not found" };

  await prisma.scoreSubmission.update({
    where: { id: submissionId },
    data: {
      status: "REJECTED",
      decidedAt: new Date(),
      decidedById: admin.user.id,
      decideReason: reason,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: admin.user.id,
      action: "submission.reject",
      targetType: "ScoreSubmission",
      targetId: submissionId,
      payload: { reason },
    },
  });

  updateTag(`tournament:${sub.tournamentId}`);
  updateTag(`tournament:slug:${sub.tournament.slug}`);
  revalidatePath(`/admin/tournaments/${sub.tournamentId}/moderate`);
  return { ok: true as const };
}
