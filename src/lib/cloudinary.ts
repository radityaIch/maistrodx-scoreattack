import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { serverEnv } from "@/lib/env";

/**
 * Singleton-configured Cloudinary SDK (PLAN §9c).
 * Used by the signed-upload Server Action.
 */
const env = serverEnv();

if (env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export { cloudinary };
