import "server-only";
import { cacheTag } from "next/cache";
import { prisma } from "@/lib/db";
import { serverEnv } from "@/lib/env";
import type { MaimaiDataFile } from "@/lib/maimai/types";

/**
 * Sync the local DB with the upstream CloudFront maimai data.json (PLAN §7).
 * - Wrapped in `'use cache'` + `cacheTag('maimai:songs')`.
 * - Idempotent: upserts by `songId` (== title) and `(songId, type, difficulty)`.
 * - Orphans are NOT deleted (preserves tournament history).
 */

const SONG_TAG = "maimai:songs";

export async function syncMaimaiCatalog(): Promise<{
  fetched: number;
  upsertedSongs: number;
  upsertedSheets: number;
}> {
  "use cache";
  cacheTag(SONG_TAG);

  const url = `${serverEnv().MAIMAI_CF_BASE_URL.replace(/\/$/, "")}/data.json`;
  const res = await fetch(url, {
    // revalidate handled by cacheTag / manual cron invalidation.
    headers: { "user-agent": "maistrodx-scoreattack/sync" },
  });
  if (!res.ok) {
    throw new Error(`maimai sync: HTTP ${res.status} fetching ${url}`);
  }
  const data = (await res.json()) as MaimaiDataFile;

  let upsertedSongs = 0;
  let upsertedSheets = 0;

  for (const raw of data.songs) {
    const songId = raw.title; // per PLAN: title is the songId key
    await prisma.song.upsert({
      where: { songId },
      create: {
        songId,
        title: raw.title,
        artist: raw.artist,
        category: raw.catcode,
        imageName: raw.imageName,
        version: raw.version,
        releaseDate: raw.releaseDate ? new Date(raw.releaseDate) : null,
        isNew: Boolean(raw.isNew),
        isLocked: Boolean(raw.isLocked),
        raw: raw as unknown as object,
        syncedAt: new Date(),
      },
      update: {
        // Only update mutable fields; preserve `syncedAt` history direction.
        title: raw.title,
        artist: raw.artist,
        category: raw.catcode,
        imageName: raw.imageName,
        version: raw.version,
        releaseDate: raw.releaseDate ? new Date(raw.releaseDate) : null,
        isNew: Boolean(raw.isNew),
        isLocked: Boolean(raw.isLocked),
        raw: raw as unknown as object,
        syncedAt: new Date(),
      },
    });
    upsertedSongs++;

    for (const sheet of raw.sheets) {
      await prisma.sheet.upsert({
        where: {
          songId_type_difficulty: {
            songId,
            type: sheet.type,
            difficulty: sheet.difficulty,
          },
        },
        create: {
          songId,
          type: sheet.type,
          difficulty: sheet.difficulty,
          level: sheet.level,
          levelValue: sheet.levelValue,
          internalLevel: sheet.internalLevel ?? null,
          internalLevelValue:
            typeof sheet.internalLevelValue === "number"
              ? sheet.internalLevelValue
              : null,
          noteCounts: (sheet.noteCounts ?? {}) as unknown as object,
          regions: (sheet.regions ?? {}) as unknown as object,
          version: sheet.version ?? raw.version,
        },
        update: {
          level: sheet.level,
          levelValue: sheet.levelValue,
          internalLevel: sheet.internalLevel ?? null,
          internalLevelValue:
            typeof sheet.internalLevelValue === "number"
              ? sheet.internalLevelValue
              : null,
          noteCounts: (sheet.noteCounts ?? {}) as unknown as object,
          regions: (sheet.regions ?? {}) as unknown as object,
          version: sheet.version ?? raw.version,
        },
      });
      upsertedSheets++;
    }
  }

  return {
    fetched: data.songs.length,
    upsertedSongs,
    upsertedSheets,
  };
}

/**
 * Read-only search over the synced catalog — used by the admin TrackPicker.
 * Matches title / artist (case-insensitive, contains). Capped.
 */
export async function searchSongs(query: string, limit = 30) {
  "use cache";
  cacheTag(SONG_TAG);
  const q = query.trim();
  if (q.length === 0) return [];

  return prisma.song.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { artist: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: [{ title: "asc" }],
    take: limit,
    select: {
      songId: true,
      title: true,
      artist: true,
      category: true,
      version: true,
      imageName: true,
      sheets: {
        orderBy: [{ type: "asc" }, { difficulty: "asc" }],
        select: {
          id: true,
          type: true,
          difficulty: true,
          level: true,
          levelValue: true,
        },
      },
    },
  });
}

export const maimaiSongTag = SONG_TAG;
