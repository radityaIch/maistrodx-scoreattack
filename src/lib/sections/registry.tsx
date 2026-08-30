import "server-only";
import type { ComponentType } from "react";
import type { PublicTournament } from "@/lib/dal/tournaments";
import { HeroSection } from "@/lib/sections/Hero";
import { RulesetSection } from "@/lib/sections/Ruleset";
import { TracksSection } from "@/lib/sections/Tracks";
import { LeaderboardSection } from "@/lib/sections/Leaderboard";
import { AwardsSection } from "@/lib/sections/Awards";
import { ContestantsSection } from "@/lib/sections/Contestants";

/**
 * Section registry (PLAN §9b).
 * Server-only RSC composer — zero client JS for the page itself.
 * Adding a new section = create file + add to this map.
 */
export const SECTIONS = {
  hero: HeroSection,
  ruleset: RulesetSection,
  tracks: TracksSection,
  leaderboard: LeaderboardSection,
  awards: AwardsSection,
  contestants: ContestantsSection,
} as const;

export type SectionKey = keyof typeof SECTIONS;

export const ALL_SECTIONS: SectionKey[] = [
  "hero",
  "ruleset",
  "tracks",
  "leaderboard",
  "awards",
  "contestants",
];

export function isSectionKey(s: string): s is SectionKey {
  return s in SECTIONS;
}

/**
 * Renders a tournament page by iterating the admin-chosen `sectionsOrder`.
 * Unknown sections are skipped silently.
 */
export async function TournamentSections({
  tournament,
}: {
  tournament: PublicTournament;
}) {
  const order = (tournament.sectionsOrder ?? ALL_SECTIONS).filter(isSectionKey);
  return (
    <>
      {order.map((key) => {
        const Section = SECTIONS[key];
        return <Section key={key} tournament={tournament} />;
      })}
    </>
  );
}

export type SectionComponentProps = {
  tournament: PublicTournament;
};

export type AnySectionComponent = ComponentType<SectionComponentProps>;
