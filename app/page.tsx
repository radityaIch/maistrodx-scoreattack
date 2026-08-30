import Link from "next/link";
import { listPublicTournaments } from "@/lib/dal/tournaments";

export default async function HomePage() {
  const tournaments = await listPublicTournaments();

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <section className="flex flex-col items-start gap-4 py-16">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-muted-foreground)]">
          maimai · score attack
        </p>
        <h1 className="text-display text-5xl sm:text-6xl glow-brand">
          Compete.<br />Submit. <span className="text-[color:var(--color-accent)]">Climb.</span>
        </h1>
        <p className="max-w-xl text-lg text-[color:var(--color-muted-foreground)]">
          Community-run maimai tournaments. Score = achievement %. Submit
          screenshots, get verified, and watch the leaderboard shift in
          real-time.
        </p>
        <div className="flex gap-3 pt-2">
          <Link
            href="/sign-in"
            className="btn btn-brand hover:bg-[#ff4d9d]"
          >
            Sign in with Google
          </Link>
        </div>
      </section>

      <section className="py-8">
        <h2 className="text-display text-2xl mb-6">Active tournaments</h2>
        {tournaments.length === 0 ? (
          <div className="card p-8 text-center text-[color:var(--color-muted-foreground)]">
            No active tournaments yet. Check back soon.
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tournaments/${t.slug}`}
                  className="card block p-6 transition hover:border-[color:var(--color-brand)]"
                >
                  <h3 className="text-display text-lg">{t.name}</h3>
                  {t.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-[color:var(--color-muted-foreground)]">
                      {t.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="rounded-full border border-[color:var(--color-border)] px-2 py-0.5 uppercase tracking-wider">
                      {t.status.toLowerCase()}
                    </span>
                    <span className="text-[color:var(--color-muted-foreground)]">
                      ends{" "}
                      {new Date(t.submissionDeadline).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
