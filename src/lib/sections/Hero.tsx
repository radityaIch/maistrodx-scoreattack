import Image from "next/image";
import Link from "next/link";
import type { SectionComponentProps } from "@/lib/sections/registry";

/**
 * Hero section — full-bleed banner with optional mascot + logo overlay.
 */
export function HeroSection({ tournament }: SectionComponentProps) {
  const accent = tournament.accentColor ?? "#ff2e88";
  const deadline = new Date(tournament.submissionDeadline);
  const opens = new Date(tournament.registrationOpensAt);
  const now = new Date();
  const isLive = tournament.status === "OPEN" && now < deadline && now >= opens;
  const isPast = tournament.status !== "DRAFT" && now >= deadline;

  const mascotPos: Record<string, string> = {
    "bottom-right": "bottom-3 right-3",
    "bottom-left": "bottom-3 left-3",
    "top-right": "top-3 right-3",
    "top-left": "top-3 left-3",
  };
  const mascotCls = mascotPos[tournament.mascotPosition] ?? mascotPos["bottom-right"];

  return (
    <section
      className="relative isolate overflow-hidden"
      style={
        {
          // expose accent as a CSS variable so children can theme themselves
          "--accent": accent,
        } as React.CSSProperties
      }
    >
      {tournament.heroImageUrl ? (
        <div className="relative h-[55vh] min-h-[360px] w-full">
          <Image
            src={tournament.heroImageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--color-background)] via-transparent to-transparent" />
        </div>
      ) : (
        <div
          className="h-[40vh] min-h-[280px] w-full"
          style={{
            background: `radial-gradient(circle at 30% 50%, ${accent}33, transparent 60%), linear-gradient(180deg, transparent, var(--color-background))`,
          }}
        />
      )}

      {tournament.mascotImageUrl && (
        <div className={`absolute ${mascotCls} z-10`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tournament.mascotImageUrl}
            alt=""
            className="h-24 w-24 object-contain drop-shadow-lg sm:h-32 sm:w-32"
          />
        </div>
      )}

      <div className="relative mx-auto -mt-24 max-w-5xl px-6 pb-12 sm:-mt-32">
        <div className="card relative overflow-hidden p-8">
          {tournament.logoOverlayUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tournament.logoOverlayUrl}
              alt=""
              className="absolute right-4 top-4 h-12 w-12 object-contain opacity-80"
            />
          )}
          <p
            className="text-xs uppercase tracking-[0.3em]"
            style={{ color: accent }}
          >
            {isLive
              ? "live now"
              : isPast
                ? "closed"
                : tournament.status.toLowerCase()}
          </p>
          <h1 className="text-display mt-2 text-4xl sm:text-5xl">
            {tournament.name}
          </h1>
          {tournament.description && (
            <p className="mt-3 max-w-2xl text-[color:var(--color-muted-foreground)]">
              {tournament.description}
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ borderColor: accent, color: accent }}
            >
              {tournament.scoringRule === "BEST_N"
                ? `best ${tournament.bestN ?? "?"}`
                : "aggregate"}
            </span>
            <span className="text-[color:var(--color-muted-foreground)]">
              deadline{" "}
              <span className="font-mono text-[color:var(--color-foreground)]">
                {deadline.toLocaleString()}
              </span>
            </span>
            <Link
              href={`/tournaments/${tournament.slug}/submit`}
              className="ml-auto rounded-md px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: accent }}
            >
              Submit a score
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
