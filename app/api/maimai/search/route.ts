import { NextResponse, type NextRequest } from "next/server";
import { searchSongs } from "@/lib/maimai/sync";

/**
 * Admin TrackPicker search endpoint. Requires admin session.
 * Returns up to 30 song matches with sheet summaries.
 */

export async function GET(req: NextRequest) {
  // Lazy require to avoid loading Prisma at module-init time on edge cases.
  const { verifySession } = await import("@/lib/dal/session");
  const session = await verifySession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await searchSongs(q, 30);
  return NextResponse.json(results);
}
