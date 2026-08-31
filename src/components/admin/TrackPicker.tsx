"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2, Plus } from "lucide-react";
import { jacketUrl, resolveTrackArtUrl } from "@/lib/maimai/image";

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

export type CustomTrackInput = {
  title: string;
  artist: string;
  type: "std" | "dx";
  difficulty: "basic" | "advanced" | "expert" | "master" | "remaster";
  level: string;
  coverUrl: string;
  downloadUrl: string;
};

export function TrackPicker({
  onAdd,
  onAddCustom,
}: {
  onAdd: (sheetId: string) => void;
  onAddCustom?: (payload: CustomTrackInput) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SongResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customArtist, setCustomArtist] = useState("AstroDX Community");
  const [customType, setCustomType] = useState<"std" | "dx">("dx");
  const [customDifficulty, setCustomDifficulty] = useState<
    "basic" | "advanced" | "expert" | "master" | "remaster"
  >("expert");
  const [customLevel, setCustomLevel] = useState("15");
  const [customCoverUrl, setCustomCoverUrl] = useState("");
  const [customDownloadUrl, setCustomDownloadUrl] = useState("");
  const [customSubmitting, setCustomSubmitting] = useState(false);
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
    <div className="space-y-4">
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

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowCustom((v) => !v)}
          className="inline-flex items-center gap-2 rounded-md border border-[color:var(--color-border)] px-2.5 py-1.5 text-xs hover:border-[color:var(--color-brand)]"
        >
          <Plus className="h-3.5 w-3.5" />
          {showCustom ? "Hide custom track" : "Add custom track"}
        </button>
      </div>

      {showCustom && onAddCustom && (
        <div className="rounded-md border border-[color:var(--color-border)] p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="custom-title">Song title</label>
              <input
                id="custom-title"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="input"
                placeholder="AstroDX - Galaxy Mix"
              />
            </div>
            <div>
              <label htmlFor="custom-artist">Artist</label>
              <input
                id="custom-artist"
                value={customArtist}
                onChange={(e) => setCustomArtist(e.target.value)}
                className="input"
                placeholder="AstroDX Community"
              />
            </div>
            <div>
              <label htmlFor="custom-level">Level</label>
              <input
                id="custom-level"
                value={customLevel}
                onChange={(e) => setCustomLevel(e.target.value)}
                className="input"
                placeholder="15"
              />
            </div>
            <div>
              <label htmlFor="custom-type">Type</label>
              <select
                id="custom-type"
                value={customType}
                onChange={(e) => setCustomType(e.target.value as "std" | "dx")}
                className="input"
              >
                <option value="dx">dx</option>
                <option value="std">std</option>
              </select>
            </div>
            <div>
              <label htmlFor="custom-difficulty">Difficulty</label>
              <select
                id="custom-difficulty"
                value={customDifficulty}
                onChange={(e) =>
                  setCustomDifficulty(
                    e.target.value as
                      | "basic"
                      | "advanced"
                      | "expert"
                      | "master"
                      | "remaster",
                  )
                }
                className="input"
              >
                <option value="basic">basic</option>
                <option value="advanced">advanced</option>
                <option value="expert">expert</option>
                <option value="master">master</option>
                <option value="remaster">remaster</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="custom-cover">Cover jacket URL</label>
              <input
                id="custom-cover"
                value={customCoverUrl}
                onChange={(e) => setCustomCoverUrl(e.target.value)}
                className="input"
                placeholder="https://example.com/cover.jpg"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="custom-download">Download link</label>
              <input
                id="custom-download"
                value={customDownloadUrl}
                onChange={(e) => setCustomDownloadUrl(e.target.value)}
                className="input"
                placeholder="https://example.com/track.zip"
              />
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              disabled={customSubmitting || !customTitle.trim()}
              onClick={async () => {
                if (!onAddCustom || !customTitle.trim()) return;
                setCustomSubmitting(true);
                try {
                  const res = await onAddCustom({
                    title: customTitle.trim(),
                    artist: customArtist.trim() || "AstroDX Community",
                    type: customType,
                    difficulty: customDifficulty,
                    level: customLevel.trim() || "15",
                    coverUrl: customCoverUrl.trim(),
                    downloadUrl: customDownloadUrl.trim(),
                  });
                  if (res.ok) {
                    setShowCustom(false);
                    setCustomTitle("");
                    setCustomArtist("AstroDX Community");
                    setCustomType("dx");
                    setCustomDifficulty("expert");
                    setCustomLevel("15");
                    setCustomCoverUrl("");
                    setCustomDownloadUrl("");
                  } else if (res.error) {
                    alert(res.error);
                  }
                } finally {
                  setCustomSubmitting(false);
                }
              }}
              className="btn btn-brand hover:bg-[#ff4d9d] disabled:opacity-50"
            >
              {customSubmitting ? "Adding…" : "Add custom track"}
            </button>
          </div>
        </div>
      )}

      {q.trim().length > 0 && (
        <ul className="mt-2 max-h-80 overflow-y-auto rounded-md border border-[color:var(--color-border)]">
          {results.length === 0 && !searching ? (
            <li className="px-3 py-4 text-center text-sm text-[color:var(--color-muted-foreground)]">
              No synced catalog matches yet. Run the catalog sync from your maimai API source, then search again; or add a custom AstroDX track below.
            </li>
          ) : (
            results.map((s) => (
              <li key={s.songId} className="border-b border-[color:var(--color-border)] p-3 last:border-b-0">
                <div className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveTrackArtUrl(s.imageName)}
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
