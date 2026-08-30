import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

/**
 * Test: scoring rule switch — only one of bestN is required for BEST_N,
 * none for AGGREGATE (PLAN §8a + W16).
 *
 * This test exercises the createTournamentAction validator path. We import
 * the action's validator indirectly by checking the pure parsing helper.
 * (Full Server Action validation is covered by manual + integration tests
 * — Server Actions can't be unit-tested without a real Next runtime.)
 */

import { createTournamentAction } from "@/lib/actions/tournament";

vi.mock("@/lib/dal/session", () => ({
  requireAdmin: vi.fn(async () => ({
    user: { id: "admin1", email: "admin@example.com", role: "ADMIN" },
  })),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    tournament: {
      create: vi.fn(async () => ({ id: "t_new", slug: "demo" })),
    },
  },
}));

vi.mock("next/cache", () => ({
  updateTag: () => {},
  revalidatePath: () => {},
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    const err = new Error("NEXT_REDIRECT");
    (err as { digest?: string }).digest = url;
    throw err;
  }),
}));

describe("createTournamentAction scoring rule validation", () => {
  it("AGGREGATE: succeeds without bestN", async () => {
    const fd = new FormData();
    fd.set("name", "Demo Tournament");
    fd.set("slug", "demo");
    fd.set("scoringRule", "AGGREGATE");
    fd.set("registrationOpensAt", "2026-01-01T00:00");
    fd.set("submissionDeadline", "2099-01-02T00:00");
    fd.set("maxAchievementPct", "101");
    fd.set("sectionsOrder", "[]");
    // Should redirect to /admin/tournaments/t_new
    await expect(createTournamentAction(fd)).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("BEST_N without bestN is rejected", async () => {
    const fd = new FormData();
    fd.set("name", "Demo Tournament");
    fd.set("slug", "demo");
    fd.set("scoringRule", "BEST_N");
    fd.set("registrationOpensAt", "2026-01-01T00:00");
    fd.set("submissionDeadline", "2099-01-02T00:00");
    fd.set("maxAchievementPct", "101");
    fd.set("sectionsOrder", "[]");
    const res = await createTournamentAction(fd);
    expect(res.ok).toBe(false);
  });

  it("BEST_N with invalid bestN (out of range) is rejected", async () => {
    const fd = new FormData();
    fd.set("name", "Demo Tournament");
    fd.set("slug", "demo");
    fd.set("scoringRule", "BEST_N");
    fd.set("bestN", "999");
    fd.set("registrationOpensAt", "2026-01-01T00:00");
    fd.set("submissionDeadline", "2099-01-02T00:00");
    fd.set("maxAchievementPct", "101");
    fd.set("sectionsOrder", "[]");
    const res = await createTournamentAction(fd);
    expect(res.ok).toBe(false);
  });
});

// The test module imports the action — vi.mock hoisting works here but TS
// requires the imports to appear after describe blocks. Re-export for type.
// (No re-imports needed; `vi` is in the top-level import.)
