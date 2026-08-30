import "server-only";
import { cloudinary } from "@/lib/cloudinary";
import { serverEnv } from "@/lib/env";

/** Slots the admin tournament form can upload to (PLAN §9a). */
export type UploadSlot = "hero" | "mascot" | "logo";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per PLAN §9c
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
]);

export type UploadResult =
  | { ok: true; url: string; publicId: string; width?: number; height?: number }
  | { ok: false; error: string };

/**
 * Server-side signed Cloudinary upload (PLAN §9c).
 * Called from a Server Action with a base64-encoded data URL
 * (avoids the 1 MB Server Action body cap on raw File POSTs).
 */
export async function uploadTournamentAsset(
  slot: UploadSlot,
  dataUrl: string,
): Promise<UploadResult> {
  const env = serverEnv();

  if (!env.CLOUDINARY_CLOUD_NAME) {
    return { ok: false, error: "Cloudinary not configured" };
  }

  // Parse the data URL.
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return { ok: false, error: "Invalid data URL" };

  const [, mime, b64] = match;
  if (!ALLOWED_MIME.has(mime)) {
    return { ok: false, error: `Unsupported MIME type: ${mime}` };
  }

  const buffer = Buffer.from(b64, "base64");
  if (buffer.byteLength > MAX_BYTES) {
    return {
      ok: false,
      error: `File too large (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB > 5 MB)`,
    };
  }

  const publicId = `${env.CLOUDINARY_FOLDER}/${slot}/${Date.now()}`;

  try {
    const res = await new Promise<{
      secure_url: string;
      public_id: string;
      width?: number;
      height?: number;
    }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: "image",
          folder: undefined, // already in publicId
        },
        (err, result) => {
          if (err || !result) reject(err ?? new Error("upload failed"));
          else resolve(result as never);
        },
      );
      stream.end(buffer);
    });

    return {
      ok: true,
      url: res.secure_url,
      publicId: res.public_id,
      width: res.width,
      height: res.height,
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
