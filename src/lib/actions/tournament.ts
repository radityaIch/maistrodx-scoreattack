"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/dal/session";
import { updateTag } from "next/cache";

/**
 * Admin tournament CRUD Server Actions (PLAN §5, §7).
 * Inputs are taken from FormData and validated inline.
 * Every action: requireAdmin → validate → write → invalidate tags → redirect/revalidate.
 */

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}
function num(v: FormDataEntryValue | null): number | null {
  if (typeof v !== "string" || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function date(v: FormDataEntryValue | null): Date | null {
  if (typeof v !== "string" || v === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
function bool(v: FormDataEntryValue | null): boolean {
  return v === "on" || v === "true" || v === "1";
}
function arr(v: FormDataEntryValue | null): string[] {
  if (typeof v !== "string" || v === "") return [];
  try {
    const j = JSON.parse(v);
    return Array.isArray(j) ? j.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

const ALL_SECTIONS = [
  "hero",
  "ruleset",
  "tracks",
  "leaderboard",
  "awards",
  "contestants",
] as const;

/**
 * Create a new tournament in DRAFT status.
 * Tracks are added separately via `addTracks` / `removeTrack`.
 */
export async function createTournamentAction(formData: FormData) {
  const admin = await requireAdmin();

  const name = str(formData.get("name"));
  if (name.length < 3 || name.length > 120) {
    return { ok: false as const, error: "name must be 3–120 chars" };
  }
  const providedSlug = str(formData.get("slug"));
  const slug = (providedSlug || slugify(name)).toLowerCase();
  if (!SLUG_RE.test(slug)) {
    return {
      ok: false as const,
      error:
        "slug must be lowercase alphanumeric + hyphens, 1–64 chars, no leading/trailing hyphen",
    };
  }

  const registrationOpensAt =
    date(formData.get("registrationOpensAt")) ?? new Date();
  const submissionDeadline = date(formData.get("submissionDeadline"));
  if (!submissionDeadline) {
    return { ok: false as const, error: "submissionDeadline required" };
  }
  if (submissionDeadline <= registrationOpensAt) {
    return {
      ok: false as const,
      error: "deadline must be after registration open",
    };
  }

  const scoringRuleRaw = str(formData.get("scoringRule"));
  if (scoringRuleRaw !== "BEST_N" && scoringRuleRaw !== "AGGREGATE") {
    return { ok: false as const, error: "scoringRule invalid" };
  }
  const bestN = scoringRuleRaw === "BEST_N" ? num(formData.get("bestN")) : null;
  if (scoringRuleRaw === "BEST_N" && (!bestN || bestN < 1 || bestN > 50)) {
    return { ok: false as const, error: "bestN must be 1–50" };
  }

  const maxAchievementPct = num(formData.get("maxAchievementPct")) ?? 101;
  const requireProof = bool(formData.get("requireProof"));
  const description = str(formData.get("description")) || null;

  // Theme fields
  const accentColor = str(formData.get("accentColor")) || null;
  const heroImageUrl = str(formData.get("heroImageUrl")) || null;
  const heroImagePublicId = str(formData.get("heroImagePublicId")) || null;
  const mascotImageUrl = str(formData.get("mascotImageUrl")) || null;
  const mascotImagePublicId =
    str(formData.get("mascotImagePublicId")) || null;
  const mascotPosition = str(formData.get("mascotPosition")) || "bottom-right";
  const logoOverlayUrl = str(formData.get("logoOverlayUrl")) || null;
  const logoOverlayPublicId =
    str(formData.get("logoOverlayPublicId")) || null;
  const rulesetMarkdown = str(formData.get("rulesetMarkdown")) || null;
  const sectionsOrderInput = arr(formData.get("sectionsOrder"));
  const sectionsOrder =
    sectionsOrderInput.length > 0
      ? sectionsOrderInput.filter((s) =>
          (ALL_SECTIONS as readonly string[]).includes(s),
        )
      : [...ALL_SECTIONS];

  try {
    const t = await prisma.tournament.create({
      data: {
        slug,
        name,
        description,
        registrationOpensAt,
        submissionDeadline,
        scoringRule: scoringRuleRaw,
        bestN,
        maxAchievementPct,
        requireProof,
        accentColor,
        heroImageUrl,
        heroImagePublicId,
        mascotImageUrl,
        mascotImagePublicId,
        mascotPosition,
        logoOverlayUrl,
        logoOverlayPublicId,
        rulesetMarkdown,
        sectionsOrder,
        createdById: admin.user.id,
      },
      select: { id: true, slug: true },
    });
    updateTag("tournaments:admin");
    updateTag(`tournament:slug:${t.slug}`);
    revalidatePath("/admin");
    revalidatePath("/admin/tournaments");
    redirect(`/admin/tournaments/${t.id}`);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("Unique constraint") && msg.includes("slug")) {
      return { ok: false as const, error: "slug already in use" };
    }
    throw e;
  }
}

/** Update an existing tournament (all fields). Same validation as create. */
export async function updateTournamentAction(
  tournamentId: string,
  formData: FormData,
) {
  await requireAdmin();

  const existing = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, slug: true, scoringRule: true },
  });
  if (!existing) return { ok: false as const, error: "not found" };

  const name = str(formData.get("name"));
  if (name.length < 3 || name.length > 120) {
    return { ok: false as const, error: "name must be 3–120 chars" };
  }
  const registrationOpensAt =
    date(formData.get("registrationOpensAt")) ?? new Date();
  const submissionDeadline = date(formData.get("submissionDeadline"));
  if (!submissionDeadline) {
    return { ok: false as const, error: "submissionDeadline required" };
  }
  const scoringRuleRaw = str(formData.get("scoringRule"));
  if (scoringRuleRaw !== "BEST_N" && scoringRuleRaw !== "AGGREGATE") {
    return { ok: false as const, error: "scoringRule invalid" };
  }
  const bestN = scoringRuleRaw === "BEST_N" ? num(formData.get("bestN")) : null;
  if (scoringRuleRaw === "BEST_N" && (!bestN || bestN < 1 || bestN > 50)) {
    return { ok: false as const, error: "bestN must be 1–50" };
  }

  const maxAchievementPct = num(formData.get("maxAchievementPct")) ?? 101;
  const requireProof = bool(formData.get("requireProof"));
  const description = str(formData.get("description")) || null;

  const accentColor = str(formData.get("accentColor")) || null;
  const heroImageUrl = str(formData.get("heroImageUrl")) || null;
  const heroImagePublicId = str(formData.get("heroImagePublicId")) || null;
  const mascotImageUrl = str(formData.get("mascotImageUrl")) || null;
  const mascotImagePublicId =
    str(formData.get("mascotImagePublicId")) || null;
  const mascotPosition = str(formData.get("mascotPosition")) || "bottom-right";
  const logoOverlayUrl = str(formData.get("logoOverlayUrl")) || null;
  const logoOverlayPublicId =
    str(formData.get("logoOverlayPublicId")) || null;
  const rulesetMarkdown = str(formData.get("rulesetMarkdown")) || null;
  const sectionsOrderInput = arr(formData.get("sectionsOrder"));
  const sectionsOrder =
    sectionsOrderInput.length > 0
      ? sectionsOrderInput.filter((s) =>
          (ALL_SECTIONS as readonly string[]).includes(s),
        )
      : [...ALL_SECTIONS];

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      name,
      description,
      registrationOpensAt,
      submissionDeadline,
      scoringRule: scoringRuleRaw,
      bestN,
      maxAchievementPct,
      requireProof,
      accentColor,
      heroImageUrl,
      heroImagePublicId,
      mascotImageUrl,
      mascotImagePublicId,
      mascotPosition,
      logoOverlayUrl,
      logoOverlayPublicId,
      rulesetMarkdown,
      sectionsOrder,
    },
  });

  updateTag(`tournament:${tournamentId}`);
  updateTag(`tournament:slug:${existing.slug}`);
  updateTag("tournaments:admin");
  updateTag("tournaments:public");
  revalidatePath("/admin");
  revalidatePath("/admin/tournaments");
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${existing.slug}`);

  return { ok: true as const };
}

/** Publish a draft → OPEN (or re-open a CLOSED). Idempotent on terminal states. */
export async function publishTournamentAction(tournamentId: string) {
  await requireAdmin();
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, slug: true, status: true, submissionDeadline: true },
  });
  if (!t) return { ok: false as const, error: "not found" };
  if (t.status === "FINALIZED") {
    return { ok: false as const, error: "tournament is finalized" };
  }
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "OPEN" },
  });
  updateTag(`tournament:${tournamentId}`);
  updateTag(`tournament:slug:${t.slug}`);
  updateTag("tournaments:admin");
  updateTag("tournaments:public");
  revalidatePath("/admin/tournaments");
  revalidatePath(`/tournaments/${t.slug}`);
  return { ok: true as const };
}

/** Manual close (admin override before deadline). */
export async function closeTournamentAction(tournamentId: string) {
  await requireAdmin();
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, slug: true, status: true },
  });
  if (!t) return { ok: false as const, error: "not found" };
  if (t.status !== "OPEN") return { ok: false as const, error: "not open" };
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "CLOSED" },
  });
  updateTag(`tournament:${tournamentId}`);
  updateTag(`tournament:slug:${t.slug}`);
  updateTag("tournaments:admin");
  updateTag("tournaments:public");
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${t.slug}`);
  return { ok: true as const };
}

/** Add a sheet (by id) to a tournament's track list. */
export async function addTrackAction(
  tournamentId: string,
  sheetId: string,
  weight = "1.0",
) {
  await requireAdmin();
  try {
    await prisma.tournamentTrack.create({
      data: {
        tournamentId,
        sheetId,
        weight: weight.toString(),
      },
    });
  } catch (e) {
    if ((e as Error).message.includes("Unique constraint")) {
      return { ok: false as const, error: "track already added" };
    }
    throw e;
  }
  updateTag(`tournament:${tournamentId}`);
  updateTag(`tournament:${tournamentId}:tracks`);
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  return { ok: true as const };
}

export async function updateTrackDownloadUrlAction(trackId: string, url: string) {
  await requireAdmin();

  const trimmed = url.trim();
  if (trimmed !== "") {
    const validHttp = /^https?:\/\//i.test(trimmed);
    if (!validHttp) {
      return { ok: false as const, error: "chart link must be a valid http(s) URL" };
    }
  }

  const track = await prisma.tournamentTrack.findUnique({
    where: { id: trackId },
    select: {
      sheetId: true,
      sheet: {
        select: {
          songId: true,
          song: {
            select: {
              raw: true,
            },
          },
        },
      },
    },
  });

  if (!track) return { ok: false as const, error: "track not found" };

  const currentRaw = (track.sheet.song.raw ?? {}) as Record<string, unknown>;
  const nextRaw = {
    ...currentRaw,
    downloadUrl: trimmed === "" ? null : trimmed,
  };

  await prisma.song.update({
    where: { songId: track.sheet.songId },
    data: { raw: nextRaw },
  });

  updateTag(`tournament:${(await prisma.tournamentTrack.findUnique({ where: { id: trackId }, select: { tournamentId: true } }))?.tournamentId ?? ""}`);
  return { ok: true as const };
}

export async function addCustomTrackAction(
  tournamentId: string,
  payload: {
    title: string;
    artist?: string;
    type?: "std" | "dx";
    difficulty?: "basic" | "advanced" | "expert" | "master" | "remaster";
    level?: string;
    coverUrl?: string;
    downloadUrl?: string;
  },
) {
  await requireAdmin();

  const title = payload.title?.trim();
  const artist = (payload.artist ?? "AstroDX Community").trim() || "AstroDX Community";
  const type = (payload.type ?? "dx");
  const difficulty = (payload.difficulty ?? "expert");
  const level = (payload.level ?? "15").trim() || "15";
  const coverUrl = (payload.coverUrl ?? "").trim();
  const downloadUrl = (payload.downloadUrl ?? "").trim();

  if (!title || title.length < 2 || title.length > 140) {
    return { ok: false as const, error: "title must be 2–140 chars" };
  }
  if (!/^(std|dx)$/.test(type)) {
    return { ok: false as const, error: "type must be std or dx" };
  }
  if (
    !/^(basic|advanced|expert|master|remaster)$/.test(difficulty)
  ) {
    return { ok: false as const, error: "difficulty invalid" };
  }
  const looksLikeNextImageProxy = (value: string) =>
    /^\/_next\/image\?/i.test(value) || /%2F_next%2Fimage%3F/i.test(value);

  if (coverUrl && (!/^https?:\/\//i.test(coverUrl) || looksLikeNextImageProxy(coverUrl))) {
    return { ok: false as const, error: "cover image must be a raw http(s) URL, not a generated /_next/image URL" };
  }
  if (downloadUrl && (!/^https?:\/\//i.test(downloadUrl) || looksLikeNextImageProxy(downloadUrl))) {
    return { ok: false as const, error: "download link must be a raw http(s) URL, not a generated /_next/image URL" };
  }

  const songId = `custom-${title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "track"}`;

  const effectiveImage = coverUrl || "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=80";

  await prisma.song.upsert({
    where: { songId },
    create: {
      songId,
      title,
      artist,
      category: "CUSTOM",
      imageName: effectiveImage,
      version: "custom",
      raw: {
        custom: true,
        downloadUrl: downloadUrl || null,
        coverUrl: effectiveImage,
      },
      syncedAt: new Date(),
    },
    update: {
      title,
      artist,
      category: "CUSTOM",
      imageName: effectiveImage,
      raw: {
        custom: true,
        downloadUrl: downloadUrl || null,
        coverUrl: effectiveImage,
      },
      syncedAt: new Date(),
    },
  });

  const sheet = await prisma.sheet.upsert({
    where: {
      songId_type_difficulty: {
        songId,
        type,
        difficulty,
      },
    },
    create: {
      songId,
      type,
      difficulty,
      level,
      levelValue: Number(level) || 15,
      internalLevel: level,
      internalLevelValue: Number(level) || 15,
      noteCounts: {},
      regions: {},
      version: "custom",
    },
    update: {
      level,
      levelValue: Number(level) || 15,
      internalLevel: level,
      internalLevelValue: Number(level) || 15,
    },
  });

  try {
    await prisma.tournamentTrack.create({
      data: {
        tournamentId,
        sheetId: sheet.id,
        weight: "1.0",
      },
    });
  } catch (e) {
    if ((e as Error).message.includes("Unique constraint")) {
      return { ok: false as const, error: "track already added" };
    }
    throw e;
  }

  updateTag(`tournament:${tournamentId}`);
  updateTag(`tournament:${tournamentId}:tracks`);
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${(await prisma.tournament.findUnique({ where: { id: tournamentId }, select: { slug: true } }))?.slug ?? ""}`);
  return { ok: true as const };
}

/** Remove a track by id. Tournament is looked up so the cache tag is right. */
export async function removeTrackAction(trackId: string) {
  await requireAdmin();
  const track = await prisma.tournamentTrack.findUnique({
    where: { id: trackId },
    select: { tournamentId: true },
  });
  if (!track) return { ok: false as const, error: "track not found" };
  await prisma.tournamentTrack.delete({ where: { id: trackId } });
  updateTag(`tournament:${track.tournamentId}`);
  updateTag(`tournament:${track.tournamentId}:tracks`);
  revalidatePath(`/admin/tournaments/${track.tournamentId}`);
  return { ok: true as const };
}
