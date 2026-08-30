import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTournamentBySlug } from "@/lib/dal/tournaments";
import { TournamentSections } from "@/lib/sections/registry";

// Public tournaments are cached at the DAL layer via `'use cache'`
// + `updateTag('tournament:slug:<slug>')` on every related mutation.

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-[color:var(--color-muted-foreground)]">Loading…</div>}>
      <TournamentInner params={params} />
    </Suspense>
  );
}

async function TournamentInner({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let tournament;
  try {
    tournament = await getTournamentBySlug(slug);
  } catch {
    tournament = null;
  }
  if (!tournament || tournament.status === "DRAFT") notFound();
  return <TournamentSections tournament={tournament} />;
}
