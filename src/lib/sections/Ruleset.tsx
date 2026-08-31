import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { SectionComponentProps } from "@/lib/sections/registry";

export function RulesetSection({ tournament }: SectionComponentProps) {
  if (!tournament.rulesetMarkdown) return null;
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h2 className="text-display mb-5 text-2xl sm:text-3xl">Ruleset</h2>
      <article className="prose prose-invert prose-base sm:prose-lg max-w-none text-[15px] leading-8 text-white/90 sm:text-[17px]">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {tournament.rulesetMarkdown}
        </ReactMarkdown>
      </article>
    </section>
  );
}
