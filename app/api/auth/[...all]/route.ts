import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

/**
 * Better Auth catches all its routes here (sign-in, callback, session, sign-out).
 * (PLAN §5)
 */
export const { GET, POST } = toNextJsHandler(auth.handler);
