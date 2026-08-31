import Image from "next/image";
import type { SectionComponentProps } from "@/lib/sections/registry";
import { listTournamentTracks } from "@/lib/dal/submissions";
import { resolveTrackArtUrl } from "@/lib/maimai/image";

const difficultyStyles = {
  basic: {
    badge: "bg-emerald-500/70 text-emerald-50 border border-emerald-300/90",
    title: "text-emerald-200",
    shell: "border-emerald-300/60 bg-emerald-500/10",
    glow: "shadow-[0_0_26px_rgba(74,222,128,0.26)]",
  },
  advanced: {
    badge: "bg-yellow-400/80 text-yellow-950 border border-yellow-200/90",
    title: "text-yellow-200",
    shell: "border-yellow-300/60 bg-yellow-500/10",
    glow: "shadow-[0_0_26px_rgba(250,204,21,0.28)]",
  },
  expert: {
    badge: "bg-red-500/80 text-red-50 border border-red-300/90",
    title: "text-red-200",
    shell: "border-red-300/60 bg-red-500/10",
    glow: "shadow-[0_0_26px_rgba(248,113,113,0.26)]",
  },
  master: {
    badge: "bg-violet-500/90 text-violet-50 border border-violet-200/90",
    title: "text-violet-100",
    shell: "border-violet-300/70 bg-violet-500/12",
    glow: "shadow-[0_0_30px_rgba(167,139,250,0.34)]",
  },
  remaster: {
    badge: "bg-fuchsia-500/80 text-fuchsia-50 border border-fuchsia-200/90",
    title: "text-fuchsia-100",
    shell: "border-fuchsia-200/70 bg-fuchsia-500/10",
    glow: "shadow-[0_0_28px_rgba(232,121,249,0.28)]",
  },
} as const;

export async function TracksSection({ tournament }: SectionComponentProps) {
  const tracks = await listTournamentTracks(tournament.id);
  if (tracks.length === 0) {
    return (
      <section className="mx-auto w-full max-w-5xl px-6 py-10">
        <h2 className="text-display mb-4 text-2xl">Tracks</h2>
        <p className="text-sm text-[color:var(--color-muted-foreground)]">
          No tracks configured yet.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <h2 className="text-display mb-4 text-2xl sm:text-3xl">Tracks ({tracks.length})</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tracks.map((t) => {
          const difficultyKey =
            t.sheet.difficulty.toLowerCase() as keyof typeof difficultyStyles;
          const tone = difficultyStyles[difficultyKey] ?? difficultyStyles.expert;

          return (
            <li
              key={t.id}
              className={`group overflow-hidden rounded-[22px] border bg-[#120f1d] p-2 sm:p-2.5 transition-transform duration-150 hover:-translate-y-0.5 ${tone.shell} ${tone.glow}`}
            >
              <div className="relative overflow-hidden rounded-[16px] border border-white/15 bg-black/10">
                <div className="relative aspect-square w-full">
                  <Image
                    src={resolveTrackArtUrl(t.sheet.song.imageName)}
                    alt={t.sheet.song.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                </div>
                <span
                  className={`absolute left-2.5 top-2.5 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] sm:text-[11px] ${tone.badge}`}
                >
                  {t.sheet.difficulty}
                </span>
              </div>

              <div className="mt-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-[14px] font-black uppercase tracking-[0.04em] text-white sm:text-[15px]"
                    title={t.sheet.song.title}
                  >
                    {t.sheet.song.title}
                  </div>
                  <div className="mt-1 truncate text-[10px] text-[color:var(--color-muted-foreground)] sm:text-[11px]">
                    {t.sheet.song.artist || "AstroDX"}
                  </div>
                </div>

                <div
                  className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] sm:text-[11px] ${tone.badge}`}
                >
                  {t.sheet.type.toUpperCase()} · {t.sheet.level}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-white/80 sm:text-[11px]">
                <span>{t.sheet.type.toUpperCase()}</span>
                <span className={`font-black ${tone.title}`}>
                  Lv {t.sheet.level}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
