import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

/**
 * Test: submitScoreAction rejects submissions past the deadline (PLAN §8a #3).
 *
 * We mock Prisma + the session DAL, then call the action with FormData.
 */

vi.mock("@/lib/db", () => ({
  prisma: {
    tournamentTrack: {
      findUnique: vi.fn(),
    },
    scoreSubmission: {
      count: vi.fn(async () => 0),
      findUnique: vi.fn(async () => null),
      upsert: vi.fn(),
    },
    auditLog: {
      create: vi.fn(async () => ({})),
    },
  },
}));

vi.mock("@/lib/dal/session", () => ({
  requireSession: vi.fn(async () => ({
    user: { id: "u1", email: "u1@example.com", role: "PLAYER" },
  })),
}));

vi.mock("next/cache", () => ({
  cacheTag: () => {},
  updateTag: () => {},
  revalidatePath: () => {},
  cacheLife: () => {},
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("submitScoreAction deadline enforcement", () => {
  it("rejects when now > submissionDeadline", async () => {
    const { submitScoreAction } = await import("@/lib/actions/submission");
    const { prisma } = await import("@/lib/db");

    vi.mocked(prisma.tournamentTrack.findUnique).mockResolvedValue({
      id: "track1",
      sheetId: "sheet1",
      tournament: {
        id: "t1",
        slug: "demo",
        status: "OPEN",
        registrationOpensAt: new Date("2025-01-01T00:00:00Z"),
        submissionDeadline: new Date("2025-01-02T00:00:00Z"),
        maxAchievementPct: 101,
      },
    } as never);

    const fd = new FormData();
    fd.set("trackId", "track1");
    fd.set("screenshotUrl", "https://example.com/score.png");
    fd.set("achievementPct", "100.50");

    const result = await submitScoreAction(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/deadline/i);
    }
  });

  it("rejects when tournament status is not OPEN", async () => {
    const { submitScoreAction } = await import("@/lib/actions/submission");
    const { prisma } = await import("@/lib/db");

    vi.mocked(prisma.tournamentTrack.findUnique).mockResolvedValue({
      id: "track1",
      sheetId: "sheet1",
      tournament: {
        id: "t1",
        slug: "demo",
        status: "CLOSED",
        registrationOpensAt: new Date("2025-01-01T00:00:00Z"),
        submissionDeadline: new Date("2099-01-02T00:00:00Z"),
        maxAchievementPct: 101,
      },
    } as never);

    const fd = new FormData();
    fd.set("trackId", "track1");
    fd.set("screenshotUrl", "https://example.com/score.png");
    fd.set("achievementPct", "100.50");

    const result = await submitScoreAction(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/open/i);
    }
  });
});
