import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { SectionComponentProps } from "@/lib/sections/registry";

export function RulesetSection({ tournament }: SectionComponentProps) {
  if (!tournament.rulesetMarkdown) return null;
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-10">
      <h2 className="text-display mb-4 text-2xl">Ruleset</h2>
      <article className="prose prose-invert max-w-none text-sm">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {tournament.rulesetMarkdown}
        </ReactMarkdown>
      </article>
    </section>
  );
}
