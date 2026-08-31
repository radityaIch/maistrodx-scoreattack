import { NextResponse, type NextRequest } from "next/server";
import { syncMaimaiCatalog } from "@/lib/maimai/sync";
import { revalidateTag } from "next/cache";
import { serverEnv } from "@/lib/env";

/**
 * Vercel Cron → `POST /api/cron/sync` (PLAN §7).
 * Protected with `x-cron-secret` header (matches `MAIMAI_CRON_SECRET`).
 *
 * After upsert we `updateTag('maimai:songs')` so all `'use cache'` reads
 * immediately see the fresh data.
 */

function isAuthed(req: NextRequest): boolean {
  const expected = serverEnv().MAIMAI_CRON_SECRET;
  if (!expected) return false;
  const got = req.headers.get("x-cron-secret");
  return Boolean(got) && got === expected;
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 401 });
  }
  try {
    const result = await syncMaimaiCatalog();
    revalidateTag("maimai:songs", "max"); // invalidates cached song reads from route handlers
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}

// Allow GET for manual dev triggering (no secret) — disabled in prod.
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "use POST" }, { status: 405 });
  }
  return POST(req);
}
