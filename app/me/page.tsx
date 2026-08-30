import { Suspense } from "react";
import { requireSession } from "@/lib/dal/session";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default function MePage() {
  // Auth is enforced inside the Suspense child so cookie reads don't block
  // prerender of the static shell.
  return (
    <Suspense fallback={<MeShell user={null} subs={[]} />}>
      <MeAuth />
    </Suspense>
  );
}

async function MeAuth() {
  const session = await requireSession();
  const subs = await prisma.scoreSubmission.findMany({
    where: { playerId: session.user.id },
    orderBy: { submittedAt: "desc" },
    take: 20,
    include: {
      tournament: { select: { name: true, slug: true } },
      sheet: { include: { song: { select: { title: true } } } },
    },
  });
  return (
    <MeShell
      user={{
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
      }}
      subs={subs.map((s) => ({
        id: s.id,
        tournamentSlug: s.tournament.slug,
        tournamentName: s.tournament.name,
        songTitle: s.sheet.song.title,
        sheetMeta: `${s.sheet.difficulty} · ${s.sheet.type}`,
        achievementPct: s.achievementPct.toString(),
        status: s.status,
      }))}
    />
  );
}

type Sub = {
  id: string;
  tournamentSlug: string;
  tournamentName: string;
  songTitle: string;
  sheetMeta: string;
  achievementPct: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
};

function MeShell({
  user,
  subs,
}: {
  user: { email: string; name: string | null; role: string } | null;
  subs: Sub[];
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-muted-foreground)]">
          profile
        </p>
        <h1 className="text-display text-4xl">
          {user ? user.name ?? user.email : "Loading…"}
        </h1>
        {user && (
          <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
            {user.email} · {user.role.toLowerCase()}
          </p>
        )}
      </header>

      {user && (
        <section>
          <h2 className="text-display text-xl mb-4">Recent submissions</h2>
          {subs.length === 0 ? (
            <div className="card p-8 text-center text-[color:var(--color-muted-foreground)]">
              No submissions yet.{" "}
              <Link
                href="/"
                className="text-[color:var(--color-brand)] underline underline-offset-2"
              >
                Find a tournament
              </Link>
              .
            </div>
          ) : (
            <ul className="card divide-y divide-[color:var(--color-border)]">
              {subs.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-4 px-5 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/tournaments/${s.tournamentSlug}`}
                      className="font-medium hover:text-[color:var(--color-brand)]"
                    >
                      {s.tournamentName}
                    </Link>
                    <p className="truncate text-xs text-[color:var(--color-muted-foreground)]">
                      {s.songTitle} · {s.sheetMeta}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-base tabular-nums">
                      {Number(s.achievementPct).toFixed(2)}%
                    </span>
                    <StatusPill status={s.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Sub["status"] }) {
  const cls =
    status === "VERIFIED"
      ? "text-[color:var(--color-success)] border-[color:var(--color-success)]"
      : status === "REJECTED"
        ? "text-[color:var(--color-danger)] border-[color:var(--color-danger)]"
        : "text-[color:var(--color-warning)] border-[color:var(--color-warning)]";
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cls}`}
    >
      {status.toLowerCase()}
    </span>
  );
}
