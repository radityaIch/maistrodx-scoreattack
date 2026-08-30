import "server-only";
import { prisma } from "@/lib/db";
import type { SectionComponentProps } from "@/lib/sections/registry";

export async function ContestantsSection({
  tournament,
}: SectionComponentProps) {
  const players = await prisma.scoreSubmission.findMany({
    where: { tournamentId: tournament.id, status: "VERIFIED" },
    distinct: ["playerId"],
    select: {
      player: { select: { email: true, displayName: true, maimaiFriendCode: true } },
    },
    orderBy: { submittedAt: "asc" },
  });
  if (players.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-10">
      <h2 className="text-display mb-4 text-2xl">
        Contestants ({players.length})
      </h2>
      <ul className="card flex flex-wrap gap-2 p-4">
        {players.map((p) => (
          <li
            key={p.player.email}
            className="rounded-full border border-[color:var(--color-border)] px-3 py-1 text-xs"
            title={p.player.maimaiFriendCode ?? ""}
          >
            {p.player.displayName ?? p.player.email}
            {p.player.maimaiFriendCode && (
              <span className="ml-1 font-mono text-[color:var(--color-muted-foreground)]">
                ({p.player.maimaiFriendCode})
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
