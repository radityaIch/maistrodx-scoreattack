import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { TournamentForm } from "@/components/admin/TournamentForm";

export default async function EditTournamentPage({
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
      <EditInner params={params} />
    </Suspense>
  );
}

async function EditInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let t: Awaited<ReturnType<typeof loadT>> | null = null;
  try {
    t = await loadT(id);
  } catch {
    t = null;
  }
  if (!t) notFound();

  const tracks = await prisma.tournamentTrack.findMany({
    where: { tournamentId: id },
    orderBy: { id: "asc" },
    include: {
      sheet: {
        include: {
          song: { select: { title: true, artist: true, imageName: true } },
        },
      },
    },
  });

  const [pendingCount] = await Promise.all([
    prisma.scoreSubmission.count({
      where: { tournamentId: id, status: "PENDING" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-display text-3xl">Edit tournament</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={`/tournaments/${t.slug}`}
            className="rounded-md px-3 py-1.5 text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]"
            target="_blank"
          >
            View public ↗
          </Link>
          <Link
            href={`/admin/tournaments/${id}/moderate`}
            className="rounded-md border border-[color:var(--color-border)] px-3 py-1.5 hover:border-[color:var(--color-brand)]"
          >
            Moderate{" "}
            {pendingCount > 0 && (
              <span className="ml-1 rounded-full bg-[color:var(--color-brand)] px-1.5 text-xs text-white">
                {pendingCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <TournamentForm
        mode="edit"
        tournament={{ ...t, bestN: t.bestN }}
        tracks={tracks.map((tr) => ({
          id: tr.id,
          sheetId: tr.sheetId,
          weight: tr.weight.toString(),
          sheet: {
            type: tr.sheet.type,
            difficulty: tr.sheet.difficulty,
            level: tr.sheet.level,
            song: tr.sheet.song,
          },
        }))}
      />
    </div>
  );
}

async function loadT(id: string) {
  return prisma.tournament.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      status: true,
      scoringRule: true,
      bestN: true,
      maxAchievementPct: true,
      requireProof: true,
      registrationOpensAt: true,
      submissionDeadline: true,
      accentColor: true,
      heroImageUrl: true,
      heroImagePublicId: true,
      mascotImageUrl: true,
      mascotImagePublicId: true,
      mascotPosition: true,
      logoOverlayUrl: true,
      logoOverlayPublicId: true,
      rulesetMarkdown: true,
      sectionsOrder: true,
    },
  });
}
