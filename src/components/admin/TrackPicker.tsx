"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { jacketUrl } from "@/lib/maimai/image";

type SongResult = {
  songId: string;
  title: string;
  artist: string;
  imageName: string;
  sheets: Array<{
    id: string;
    type: string;
    difficulty: string;
    level: string;
    levelValue: number;
  }>;
};

const DIFFICULTY_ORDER: Record<string, number> = {
  basic: 0,
  advanced: 1,
  expert: 2,
  master: 3,
  remaster: 4,
};
const TYPE_ORDER: Record<string, number> = { std: 0, dx: 1 };

export function TrackPicker({ onAdd }: { onAdd: (sheetId: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SongResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced server search via /api/maimai/search?q=...
  useEffect(() => {
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/maimai/search?q=${encodeURIComponent(q)}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const data = (await res.json()) as SongResult[];
          setResults(data);
        }
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [q]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search synced catalog (title or artist)…"
          className="input pl-9 focus:outline-none focus:border-[color:var(--color-ring)] focus:shadow-[0_0_0_3px_rgba(255,46,136,0.25)]"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[color:var(--color-muted-foreground)]" />
        )}
      </div>

      {q.trim().length > 0 && (
        <ul className="mt-2 max-h-80 overflow-y-auto rounded-md border border-[color:var(--color-border)]">
          {results.length === 0 && !searching ? (
            <li className="px-3 py-4 text-center text-sm text-[color:var(--color-muted-foreground)]">
              No matches. (Run <code>/api/cron/sync</code> to populate catalog.)
            </li>
          ) : (
            results.map((s) => (
              <li key={s.songId} className="border-b border-[color:var(--color-border)] p-3 last:border-b-0">
                <div className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={jacketUrl(s.imageName)}
                    alt=""
                    width={48}
                    height={48}
                    className="h-12 w-12 shrink-0 rounded object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.title}</div>
                    <div className="truncate text-xs text-[color:var(--color-muted-foreground)]">
                      {s.artist}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {[...s.sheets]
                        .sort(
                          (a, b) =>
                            (TYPE_ORDER[a.type] - TYPE_ORDER[b.type]) ||
                            (DIFFICULTY_ORDER[a.difficulty] -
                              DIFFICULTY_ORDER[b.difficulty]),
                        )
                        .map((sh) => (
                          <button
                            key={sh.id}
                            type="button"
                            onClick={() => onAdd(sh.id)}
                            className="rounded-md border border-[color:var(--color-border)] px-2 py-0.5 text-xs hover:border-[color:var(--color-brand)]"
                          >
                            {sh.type.toUpperCase()} · {sh.difficulty} ·{" "}
                            <span className="text-[color:var(--color-brand)]">
                              Lv {sh.level}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
