export type SubmissionDraft = {
  tournamentId: string;
  trackId: string;
  score: number;
  proofUrl: string;
  note?: string | null;
  submittedAt: string;
  status: "PENDING";
};

export function buildSubmissionDraft(raw: Partial<SubmissionDraft>) {
  const tournamentId = String(raw.tournamentId ?? "").trim();
  const trackId = String(raw.trackId ?? "").trim();
  const scoreValue = Number(raw.score);
  const proofUrl = String(raw.proofUrl ?? "").trim();
  const note = String(raw.note ?? "").trim();

  if (!tournamentId) {
    throw new Error("Tournament ID is required.");
  }

  if (!trackId) {
    throw new Error("Track ID is required.");
  }

  if (!Number.isFinite(scoreValue) || scoreValue < 0 || scoreValue > 1000000) {
    throw new Error("Score is invalid.");
  }

  if (!/^https?:\/\//i.test(proofUrl)) {
    throw new Error("Proof URL must start with http:// or https://.");
  }

  const cleanNote = note ? note.slice(0, 280) : null;

  return {
    tournamentId,
    trackId,
    score: Math.round(scoreValue),
    proofUrl,
    note: cleanNote,
    submittedAt: new Date().toISOString(),
    status: "PENDING" as const,
  } satisfies SubmissionDraft;
}
