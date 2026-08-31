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
  const raw = (imageName ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  const base = process.env.NEXT_PUBLIC_MAIMAI_IMAGE_BASE_URL ?? "";
  const host = base ? base.replace(/\/$/, "") : "https://maimai.sega.com/storage/jacket";
  return `${host}/${raw}`;
}

/** Accept either a maimai jacket filename, a direct image URL, or a Next image proxy URL. */
export function resolveTrackArtUrl(value: string | null | undefined): string {
  const raw = value?.trim() ?? "";
  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      const proxied = parsed.pathname === "/_next/image" && parsed.searchParams.get("url");
      if (proxied) {
        const target = proxied.trim();
        if (/^https?:\/\//i.test(target)) return target;
      }
      return raw;
    } catch {
      return raw;
    }
  }

  return jacketUrl(raw);
}

/** Stable custom-track ids for community or AstroDX entries. */
export function customSongIdFromTitle(title: string): string {
  const base = (title || "custom-track")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return base ? `custom-${base}` : "custom-track";
}
