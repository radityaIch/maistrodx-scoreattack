import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getTournamentBySlug } from "@/lib/dal/tournaments";
import { listTournamentTracks, listPlayerSubmissions } from "@/lib/dal/submissions";
import { verifySession } from "@/lib/dal/session";
import { submitScoreAction } from "@/lib/actions/submission";
import { SubmitForm } from "@/components/SubmitForm";
import { jacketUrl } from "@/lib/maimai/image";

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-sm text-[color:var(--color-muted-foreground)]">
          Loading…
        </div>
      }
    >
      <SubmitInner params={params} />
    </Suspense>
  );
}

async function SubmitInner({
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

  const session = await verifySession();
  if (!session)
    redirect(
      "/sign-in?next=" +
        encodeURIComponent(`/tournaments/${tournament.slug}/submit`),
    );

  let tracks: Awaited<ReturnType<typeof listTournamentTracks>> = [];
  let mySubs: Awaited<ReturnType<typeof listPlayerSubmissions>> = [];
  try {
    tracks = await listTournamentTracks(tournament.id);
    mySubs = await listPlayerSubmissions(tournament.id, session.user.id);
  } catch {
    // graceful
  }

  const myByTrack = new Map(mySubs.map((s) => [s.trackId, s]));

  const trackForms = tracks.map((t) => {
    const existing = myByTrack.get(t.id);
    const submitBound = async (fd: FormData) => {
      "use server";
      fd.set("trackId", t.id);
      return submitScoreAction(fd);
    };
    return {
      trackId: t.id,
      sheet: t.sheet,
      song: t.sheet.song,
      submitBound,
      existing: existing
        ? {
            achievementPct: existing.achievementPct.toString(),
            screenshotUrl: existing.screenshotUrl,
            status: existing.status,
          }
        : null,
    };
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-display text-3xl">Submit a score</h1>
        <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
          {tournament.name}
        </p>
      </header>

      <ul className="space-y-4">
        {trackForms.map((tf) => (
          <li key={tf.trackId} className="card p-4">
            <div className="mb-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={jacketUrl(tf.song.imageName)}
                alt=""
                className="h-12 w-12 shrink-0 rounded object-cover"
              />
              <div className="min-w-0">
                <div className="truncate font-medium">{tf.song.title}</div>
                <div className="text-xs text-[color:var(--color-muted-foreground)]">
                  {tf.song.artist} · {tf.sheet.type} · {tf.sheet.difficulty} · Lv{" "}
                  {tf.sheet.level}
                </div>
              </div>
              {tf.existing && (
                <span
                  className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    tf.existing.status === "VERIFIED"
                      ? "text-[color:var(--color-success)] border-[color:var(--color-success)]"
                      : tf.existing.status === "REJECTED"
                        ? "text-[color:var(--color-danger)] border-[color:var(--color-danger)]"
                        : "text-[color:var(--color-warning)] border-[color:var(--color-warning)]"
                  }`}
                >
                  {tf.existing.status.toLowerCase()}
                </span>
              )}
            </div>
            <SubmitForm
              action={tf.submitBound}
              maxAchievementPct={tournament.maxAchievementPct}
              existing={tf.existing}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
