"use client";

import { ArrowDown, ArrowUp } from "lucide-react";

const ALL_SECTIONS = [
  { id: "hero", label: "Hero" },
  { id: "ruleset", label: "Ruleset" },
  { id: "tracks", label: "Tracks" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "awards", label: "Awards" },
  { id: "contestants", label: "Contestants" },
];

export function SectionOrderEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const present = value.filter((s) =>
    ALL_SECTIONS.some((x) => x.id === s),
  );
  const hidden = ALL_SECTIONS.filter(
    (s) => !present.includes(s.id),
  ).map((s) => s.id);

  const move = (i: number, dir: -1 | 1) => {
    const next = [...present];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (id: string) => {
    onChange(present.filter((s) => s !== id));
  };
  const add = (id: string) => {
    onChange([...present, id]);
  };

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-[color:var(--color-border)] rounded-md border border-[color:var(--color-border)]">
        {present.map((id, i) => {
          const meta = ALL_SECTIONS.find((s) => s.id === id)!;
          return (
            <li
              key={id}
              className="flex items-center justify-between gap-2 px-4 py-2 text-sm"
            >
              <span>{meta.label}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded p-1 hover:bg-[color:var(--color-muted)] disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === present.length - 1}
                  className="rounded p-1 hover:bg-[color:var(--color-muted)] disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(id)}
                  className="ml-2 rounded p-1 text-xs text-[color:var(--color-danger)] hover:bg-[color:var(--color-muted)]"
                  aria-label="Hide"
                >
                  Hide
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {hidden.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="text-xs text-[color:var(--color-muted-foreground)]">
            Hidden:
          </span>
          {hidden.map((id) => {
            const meta = ALL_SECTIONS.find((s) => s.id === id)!;
            return (
              <button
                key={id}
                type="button"
                onClick={() => add(id)}
                className="rounded-full border border-[color:var(--color-border)] px-2 py-0.5 text-xs hover:border-[color:var(--color-brand)]"
              >
                + {meta.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
