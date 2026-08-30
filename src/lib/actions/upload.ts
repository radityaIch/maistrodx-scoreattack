"use server";

import { requireAdmin } from "@/lib/dal/session";
import { uploadTournamentAsset, type UploadSlot } from "@/lib/storage";

/**
 * Wrapper around `uploadTournamentAsset` for use from Client Components.
 * Validates input + enforces admin gate on the server (PLAN §9c / §5).
 * No `zod` per plan (inline validation only).
 */

export type UploadActionResult =
  | { ok: true; url: string; publicId: string; width?: number; height?: number }
  | { ok: false; error: string };

const SLOTS = new Set<UploadSlot>(["hero", "mascot", "logo"]);

export async function uploadAssetAction(input: {
  slot: string;
  dataUrl: string;
}): Promise<UploadActionResult> {
  await requireAdmin();

  if (!SLOTS.has(input.slot as UploadSlot)) {
    return { ok: false, error: "invalid slot" };
  }
  if (typeof input.dataUrl !== "string" || !input.dataUrl.startsWith("data:image/")) {
    return { ok: false, error: "invalid data URL" };
  }
  if (input.dataUrl.length > 7_000_000) {
    return { ok: false, error: "data URL too large (max ~5 MB)" };
  }

  return uploadTournamentAsset(input.slot as UploadSlot, input.dataUrl);
}
