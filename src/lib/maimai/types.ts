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
  title: string;
  artist: string;
  catcode: string; // category (e.g. "POPS", "GAME", "maimai")
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
