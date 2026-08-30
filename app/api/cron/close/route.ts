import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { updateTag } from "next/cache";
import { serverEnv } from "@/lib/env";

/**
 * Vercel Cron → `POST /api/cron/close` (PLAN §4 / §15).
 * Flips OPEN tournaments past their submissionDeadline to CLOSED, then
 * CLOSED tournaments (1 hour after close) to FINALIZED.
 *
 * Protected by `x-cron-secret` header.
 */

function isAuthed(req: NextRequest): boolean {
  const expected = serverEnv().MAIMAI_CRON_SECRET;
  if (!expected) return false;
  return req.headers.get("x-cron-secret") === expected;
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 401 });
  }

  const now = new Date();

  // OPEN → CLOSED
  const closed = await prisma.tournament.updateMany({
    where: {
      status: "OPEN",
      submissionDeadline: { lt: now },
    },
    data: { status: "CLOSED" },
  });

  // CLOSED → FINALIZED (give it a 1h grace period after the deadline)
  const finalizeCutoff = new Date(now.getTime() - 60 * 60 * 1000);
  const finalized = await prisma.tournament.updateMany({
    where: {
      status: "CLOSED",
      submissionDeadline: { lt: finalizeCutoff },
    },
    data: { status: "FINALIZED" },
  });

  // Invalidate every cached public read.
  updateTag("tournaments:public");
  updateTag("tournaments:admin");

  return NextResponse.json({ ok: true, closed: closed.count, finalized: finalized.count });
}
