import "server-only";

/**
 * Strict, server-only env reader (PLAN §10).
 * Throws a helpful error if a required variable is missing.
 *
 * @example
 *   const { DATABASE_URL } = serverEnv();
 */
export function serverEnv() {
  const required = [
    "DATABASE_URL",
    "BETTER_AUTH_URL",
    "BETTER_AUTH_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
  ] as const;

  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `[env] Missing required env vars: ${missing.join(", ")}. ` +
        `Copy .env.example to .env and fill them in.`,
    );
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL!,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
    ADMIN_EMAILS: (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    MAIMAI_CF_BASE_URL:
      process.env.MAIMAI_CF_BASE_URL ??
      "https://dp4p6x0xfi5o9.cloudfront.net/maimai",
    MAIMAI_IMAGE_BASE_URL:
      process.env.MAIMAI_IMAGE_BASE_URL ??
      process.env.NEXT_PUBLIC_MAIMAI_IMAGE_BASE_URL ??
      "",
    MAIMAI_CRON_SECRET: process.env.MAIMAI_CRON_SECRET ?? "",
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? "",
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? "",
    CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER ?? "maistrodx",
  };
}
