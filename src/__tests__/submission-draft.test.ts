import { describe, expect, it } from "vitest";
import { buildSubmissionDraft } from "@/lib/submission-draft";

describe("buildSubmissionDraft", () => {
  it("creates a sanitized draft from valid input", () => {
    const result = buildSubmissionDraft({
      tournamentId: "   t_123   ",
      trackId: " track_456 ",
      score: 987654,
      proofUrl: "https://example.com/score-proof.jpg",
      note: "Submitted from my phone   ",
    });

    expect(result).toMatchObject({
      tournamentId: "t_123",
      trackId: "track_456",
      score: 987654,
      proofUrl: "https://example.com/score-proof.jpg",
      note: "Submitted from my phone",
      status: "PENDING",
    });
    expect(result.submittedAt).toBeTypeOf("string");
  });

  it("rejects missing tournamentId", () => {
    expect(() =>
      buildSubmissionDraft({
        trackId: "track_456",
        score: 100,
        proofUrl: "https://example.com/score-proof.jpg",
      }),
    ).toThrow("Tournament ID is required.");
  });

  it("rejects invalid proof URLs", () => {
    expect(() =>
      buildSubmissionDraft({
        tournamentId: "t_123",
        trackId: "track_456",
        score: 100,
        proofUrl: "ftp://example.com/score-proof.jpg",
      }),
    ).toThrow("Proof URL must start with http:// or https://.");
  });
});
