import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ModerateRow } from "@/components/admin/ModerateRow";

export default async function ModeratePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-[color:var(--color-muted-foreground)]">
          Loading…
        </div>
      }
    >
      <ModerateInner params={params} />
    </Suspense>
  );
}

async function ModerateInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let t: Awaited<ReturnType<typeof loadT>> | null = null;
  try {
    t = await loadT(id);
  } catch {
    t = null;
  }
  if (!t) notFound();

  const pending = await prisma.scoreSubmission.findMany({
    where: { tournamentId: id, status: "PENDING" },
    orderBy: { submittedAt: "asc" },
    include: {
      player: { select: { email: true, displayName: true } },
      sheet: {
        include: { song: { select: { title: true, imageName: true } } },
      },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-display text-3xl">Moderate — {t.name}</h1>
      <p className="text-sm text-[color:var(--color-muted-foreground)]">
        {pending.length === 0
          ? "No pending submissions."
          : `${pending.length} pending`}
      </p>

      <ul className="space-y-3">
        {pending.map((s) => (
          <ModerateRow
            key={s.id}
            submission={{
              id: s.id,
              achievementPct: s.achievementPct.toString(),
              screenshotUrl: s.screenshotUrl,
              note: s.note,
              playerEmail: s.player.email,
              playerName: s.player.displayName,
              songTitle: s.sheet.song.title,
              difficulty: s.sheet.difficulty,
              type: s.sheet.type,
              level: s.sheet.level,
              submittedAt: s.submittedAt.toISOString(),
            }}
          />
        ))}
      </ul>
    </div>
  );
}

async function loadT(id: string) {
  return prisma.tournament.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true },
  });
}
