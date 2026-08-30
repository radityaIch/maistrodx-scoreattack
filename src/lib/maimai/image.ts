/**
 * Build the public jacket URL for a song (PLAN §7 / decision #7).
 *
 * Reads `NEXT_PUBLIC_MAIMAI_IMAGE_BASE_URL` directly from `process.env` so
 * this module can be safely imported by client components (TrackPicker).
 * Falls back to the SEGA-amiyu CDN host (community-acknowledged mirror)
 * when unset.
 *
 * Per-deploy the proxy host can be swapped without code changes.
 */
export function jacketUrl(imageName: string): string {
  const base = process.env.NEXT_PUBLIC_MAIMAI_IMAGE_BASE_URL ?? "";
  const host = base ? base.replace(/\/$/, "") : "https://maimai.sega.com/storage/jacket";
  return `${host}/${imageName}`;
}
