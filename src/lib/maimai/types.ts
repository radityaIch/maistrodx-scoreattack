/**
 * Minimal shapes for the maimai CloudFront JSON (PLAN §7).
 * The full file is ~230k lines; we only model the fields we persist.
 */

export type MaimaiDifficulty =
  | "basic"
  | "advanced"
  | "expert"
  | "master"
  | "remaster";

export type MaimaiSheetType = "std" | "dx";

export type MaimaiRawSheet = {
  type: MaimaiSheetType;
  difficulty: MaimaiDifficulty;
  level: string;
  levelValue: number;
  internalLevel?: string;
  internalLevelValue?: number | null;
  noteCounts?: { tap?: number; hold?: number; slide?: number; touch?: number; break?: number; total?: number };
  regions?: Record<string, unknown>;
  version?: string;
};

export type MaimaiRawSong = {
  songId?: string;
  title: string;
  artist: string;
  category?: string;
  catcode?: string; // legacy fallback for some mirrors / older payloads
  imageName: string;
  version: string;
  releaseDate?: string; // ISO yyyy-mm-dd
  isNew?: boolean;
  isLocked?: boolean;
  sheets: MaimaiRawSheet[];
};

export type MaimaiDataFile = {
  songs: MaimaiRawSong[];
};

export function normalizeMaimaiSong(raw: MaimaiRawSong) {
  const songId = String(raw.songId ?? raw.title ?? "unknown-song").trim();
  const category = String(raw.category ?? raw.catcode ?? "UNKNOWN").trim() || "UNKNOWN";

  return {
    songId,
    title: String(raw.title ?? "").trim(),
    artist: String(raw.artist ?? "").trim(),
    category,
    imageName: String(raw.imageName ?? "").trim(),
    version: String(raw.version ?? "").trim(),
    releaseDate: raw.releaseDate ? new Date(raw.releaseDate) : null,
    isNew: Boolean(raw.isNew),
    isLocked: Boolean(raw.isLocked),
    raw,
  };
}

/** Sheet difficulty display order (for stable sorting in pickers). */
export const DIFFICULTY_ORDER: MaimaiDifficulty[] = [
  "basic",
  "advanced",
  "expert",
  "master",
  "remaster",
];

/** Sheet type display order. */
export const TYPE_ORDER: MaimaiSheetType[] = ["std", "dx"];
