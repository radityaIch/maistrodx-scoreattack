/**
 * Local development seed (W7 follow-up, M2 acceptance).
 *
 * Run: `pnpm tsx prisma/seed.ts`
 *
 * Creates:
 *   - 1 admin user (email = ADMIN_EMAILS[0] from env)
 *   - 1 demo tournament with 3 placeholder sheets + 3 tournament tracks
 *   - 4 fake verified submissions across 2 players to demo the leaderboard
 *
 * Idempotent: re-running upserts the same rows by stable ids.
 */

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())[0];
  if (!adminEmail) {
    throw new Error("Set ADMIN_EMAILS in .env before seeding.");
  }

  // ---- Admin user (Better Auth will create the actual row on first sign-in;
  // we just pre-create the user so ADMIN_EMAILS works on first login).
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", displayName: "Tournament Admin" },
    create: {
      id: "seed_admin_" + adminEmail.replace(/[^a-z0-9]/g, "_"),
      email: adminEmail,
      name: "Tournament Admin",
      role: "ADMIN",
      displayName: "Tournament Admin",
    },
  });

  // ---- Demo songs + sheets (placeholder images)
  const songs = [
    {
      songId: "Paradisus",
      title: "Paradisus",
      artist: "xi",
      imageName: "000_paradisus.png",
      category: "ORIGINAL",
      version: "maimai",
      sheets: [
        { type: "dx", difficulty: "master", level: "13", levelValue: 13.0 },
        { type: "dx", difficulty: "remaster", level: "14", levelValue: 14.0 },
      ],
    },
    {
      songId: "Revenant",
      title: "Revenant",
      artist: "cosMo@BousouP",
      imageName: "001_revenant.png",
      category: "ORIGINAL",
      version: "maimai",
      sheets: [
        { type: "dx", difficulty: "master", level: "14", levelValue: 14.2 },
      ],
    },
    {
      songId: "AMAZING MIGHTYYYY !",
      title: "AMAZING MIGHTYYYY !",
      artist: "WACCHA",
      imageName: "002_amazing.png",
      category: "ORIGINAL",
      version: "maimai",
      sheets: [
        { type: "dx", difficulty: "master", level: "13", levelValue: 13.6 },
      ],
    },
  ] as const;

  const sheetIds: string[] = [];
  for (const s of songs) {
    await prisma.song.upsert({
      where: { songId: s.songId },
      update: {},
      create: {
        songId: s.songId,
        title: s.title,
        artist: s.artist,
        category: s.category,
        version: s.version,
        imageName: s.imageName,
        raw: { seed: true },
      },
    });
    for (const sh of s.sheets) {
      const created = await prisma.sheet.upsert({
        where: {
          songId_type_difficulty: {
            songId: s.songId,
            type: sh.type,
            difficulty: sh.difficulty,
          },
        },
        update: {},
        create: {
          songId: s.songId,
          type: sh.type,
          difficulty: sh.difficulty,
          level: sh.level,
          levelValue: sh.levelValue,
          noteCounts: {},
          regions: {},
          version: s.version,
        },
      });
      sheetIds.push(created.id);
    }
  }

  // ---- Demo tournament
  const now = new Date();
  const opens = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const tournament = await prisma.tournament.upsert({
    where: { slug: "paradisus-showcase" },
    update: {},
    create: {
      slug: "paradisus-showcase",
      name: "Paradisus Showcase",
      description:
        "Demo tournament with three flagship charts. Aggregate scoring, max 101%.",
      status: "OPEN",
      registrationOpensAt: opens,
      submissionDeadline: deadline,
      scoringRule: "AGGREGATE",
      maxAchievementPct: 101,
      requireProof: true,
      accentColor: "#ff2e88",
      sectionsOrder: [
        "hero",
        "ruleset",
        "tracks",
        "leaderboard",
        "awards",
        "contestants",
      ],
      rulesetMarkdown:
        "# Rules\n\n1. Submit achievement % with a screenshot.\n2. One entry per (player, track).\n3. Approved entries count toward the leaderboard.",
      createdById: admin.id,
    },
  });

  // Tracks
  for (const sheetId of sheetIds) {
    await prisma.tournamentTrack.upsert({
      where: {
        tournamentId_sheetId: {
          tournamentId: tournament.id,
          sheetId,
        },
      },
      update: {},
      create: { tournamentId: tournament.id, sheetId, weight: new Prisma.Decimal(1) },
    });
  }

  // Two demo players
  const players = await Promise.all(
    [
      { id: "seed_player_alpha", email: "alpha@example.com", displayName: "Alpha" },
      { id: "seed_player_beta", email: "beta@example.com", displayName: "Beta" },
    ].map((p) =>
      prisma.user.upsert({
        where: { email: p.email },
        update: {},
        create: { ...p, role: "PLAYER" },
      }),
    ),
  );

  // Demo submissions (one per player per track)
  const tracks = await prisma.tournamentTrack.findMany({
    where: { tournamentId: tournament.id },
  });
  for (const [i, p] of players.entries()) {
    for (const [j, t] of tracks.entries()) {
      const pct = (100.5 + i * 0.4 + j * 0.1).toFixed(2);
      await prisma.scoreSubmission.upsert({
        where: { playerId_trackId: { playerId: p.id, trackId: t.id } },
        update: {},
        create: {
          tournamentId: tournament.id,
          trackId: t.id,
          sheetId: t.sheetId,
          playerId: p.id,
          achievementPct: pct,
          screenshotUrl: `https://placehold.co/600x400/png?text=${p.displayName}-${j}`,
          status: "VERIFIED",
          decidedAt: new Date(),
          decidedById: admin.id,
        },
      });
    }
  }

  console.log("✅ Seed complete");
  console.log("   Admin:", adminEmail);
  console.log("   Tournament: /tournaments/paradisus-showcase");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
