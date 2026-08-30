import Image from "next/image";
import type { SectionComponentProps } from "@/lib/sections/registry";
import { listTournamentTracks } from "@/lib/dal/submissions";
import { jacketUrl } from "@/lib/maimai/image";

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
    <section className="mx-auto w-full max-w-5xl px-6 py-10">
      <h2 className="text-display mb-4 text-2xl">Tracks ({tracks.length})</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tracks.map((t) => (
          <li key={t.id} className="card flex items-center gap-3 p-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded">
              <Image
                src={jacketUrl(t.sheet.song.imageName)}
                alt={t.sheet.song.title}
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <div
                className="truncate text-sm font-medium"
                title={t.sheet.song.title}
              >
                {t.sheet.song.title}
              </div>
              <div className="text-xs text-[color:var(--color-muted-foreground)]">
                {t.sheet.type.toUpperCase()} · {t.sheet.difficulty} ·{" "}
                <span
                  style={{ color: tournament.accentColor ?? "#ff2e88" }}
                  className="font-semibold"
                >
                  Lv {t.sheet.level}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
