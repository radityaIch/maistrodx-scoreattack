"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  createTournamentAction,
  publishTournamentAction,
  closeTournamentAction,
  updateTournamentAction,
  addTrackAction,
  addCustomTrackAction,
  removeTrackAction,
  updateTrackDownloadUrlAction,
} from "@/lib/actions/tournament";
import { uploadAssetAction } from "@/lib/actions/upload";
import { CloudinaryUploader } from "@/components/admin/CloudinaryUploader";
import { SectionOrderEditor } from "@/components/admin/SectionOrderEditor";
import { TrackPicker } from "@/components/admin/TrackPicker";
import type {
  TournamentStatus,
  ScoringRule,
} from "@prisma/client";

export type TrackRow = {
  id: string;
  sheetId: string;
  weight: string;
  downloadUrl?: string;
  sheet: {
    type: string;
    difficulty: string;
    level: string;
    song: {
      title: string;
      artist: string;
      imageName: string;
      raw?: unknown | null;
    };
  };
};

export type TournamentFormProps = {
  mode: "create" | "edit";
  tournament?: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    status: TournamentStatus;
    scoringRule: ScoringRule;
    bestN: number | null;
    maxAchievementPct: number;
    requireProof: boolean;
    registrationOpensAt: Date;
    submissionDeadline: Date;
    accentColor: string | null;
    heroImageUrl: string | null;
    heroImagePublicId: string | null;
    mascotImageUrl: string | null;
    mascotImagePublicId: string | null;
    mascotPosition: string;
    logoOverlayUrl: string | null;
    logoOverlayPublicId: string | null;
    rulesetMarkdown: string | null;
    sectionsOrder: string[];
  };
  tracks?: TrackRow[];
};

const DEFAULT_SECTIONS = [
  "hero",
  "ruleset",
  "tracks",
  "leaderboard",
  "awards",
  "contestants",
];

const toLocalDatetime = (d: Date | string) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  const off = dt.getTimezoneOffset();
  const local = new Date(dt.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
};

function formatSelection(
  value: string,
  start: number,
  end: number,
  prefix: string,
  suffix = prefix,
  placeholder = "text",
) {
  const selected = value.slice(start, end) || placeholder;
  return {
    next: `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`,
    cursorStart: start + prefix.length,
    cursorEnd: start + prefix.length + selected.length,
  };
}

type ActionState = { ok: boolean; error?: string };

export function TournamentForm(props: TournamentFormProps) {
  const initial = props.tournament;
  const isEdit = props.mode === "edit" && initial;

  // Form state (controlled) ----------------------------------------------
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [registrationOpensAt, setOpens] = useState(
    initial ? toLocalDatetime(initial.registrationOpensAt) : "",
  );
  const [submissionDeadline, setDeadline] = useState(
    initial ? toLocalDatetime(initial.submissionDeadline) : "",
  );
  const [scoringRule, setScoringRule] = useState<ScoringRule>(
    initial?.scoringRule ?? "AGGREGATE",
  );
  const [bestN, setBestN] = useState<number>(initial?.bestN ?? 5);
  const [maxAchievementPct, setMaxPct] = useState<number>(
    initial?.maxAchievementPct ?? 101,
  );
  const [requireProof, setRequireProof] = useState<boolean>(
    initial?.requireProof ?? true,
  );

  // Theme state
  const [accentColor, setAccentColor] = useState(initial?.accentColor ?? "#ff2e88");
  const [heroImageUrl, setHeroUrl] = useState<string | null>(initial?.heroImageUrl ?? null);
  const [heroImagePublicId, setHeroPid] = useState<string | null>(
    initial?.heroImagePublicId ?? null,
  );
  const [mascotImageUrl, setMascotUrl] = useState<string | null>(
    initial?.mascotImageUrl ?? null,
  );
  const [mascotImagePublicId, setMascotPid] = useState<string | null>(
    initial?.mascotImagePublicId ?? null,
  );
  const [mascotPosition, setMascotPosition] = useState(
    initial?.mascotPosition ?? "bottom-right",
  );
  const [logoOverlayUrl, setLogoUrl] = useState<string | null>(initial?.logoOverlayUrl ?? null);
  const [logoOverlayPublicId, setLogoPid] = useState<string | null>(
    initial?.logoOverlayPublicId ?? null,
  );
  const [rulesetMarkdown, setRuleset] = useState(initial?.rulesetMarkdown ?? "");
  const [sectionsOrder, setSectionsOrder] = useState<string[]>(
    initial?.sectionsOrder ?? DEFAULT_SECTIONS,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const rulesetRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  const applyMarkdownFormat = (
    prefix: string,
    suffix = prefix,
    placeholder = "text",
  ) => {
    const el = rulesetRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const { next, cursorStart, cursorEnd } = formatSelection(
      rulesetMarkdown,
      start,
      end,
      prefix,
      suffix,
      placeholder,
    );
    setRuleset(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  const insertBlock = (block: string) => {
    const el = rulesetRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = rulesetMarkdown.slice(0, start);
    const after = rulesetMarkdown.slice(end);
    const selection = rulesetMarkdown.slice(start, end) || "text";
    const next = `${before}${block.replace("{text}", selection)}${after}`;
    setRuleset(next);
    requestAnimationFrame(() => {
      el.focus();
      const index = before.length + block.indexOf("{text}") + selection.length;
      el.setSelectionRange(index, index);
    });
  };

  // Server Actions --------------------------------------------------------
  const createBound = async (
    _prev: ActionState,
    fd: FormData,
  ): Promise<ActionState> => {
    const res = await createTournamentAction(fd);
    if (res && !res.ok) return { ok: false, error: res.error };
    return { ok: true };
  };
  const [createState, createFormAction, createPending] = useActionState<
    ActionState,
    FormData
  >(createBound, { ok: true });

  const updateBound = async (
    _prev: ActionState,
    fd: FormData,
  ): Promise<ActionState> => {
    if (!initial) return { ok: false, error: "no tournament" };
    const res = await updateTournamentAction(initial.id, fd);
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  };
  const [updateState, updateFormAction, updatePending] = useActionState<
    ActionState,
    FormData
  >(updateBound, { ok: true });

  const [statusPending, setStatusPending] = useState(false);
  const handlePublish = async () => {
    if (!initial) return;
    setStatusPending(true);
    try {
      const res = await publishTournamentAction(initial.id);
      if (res.ok) setNotice("Tournament published successfully");
      else alert(res.error);
    } finally {
      setStatusPending(false);
    }
  };
  const handleClose = async () => {
    if (!initial) return;
    if (!confirm("Close submissions for this tournament?")) return;
    setStatusPending(true);
    try {
      const res = await closeTournamentAction(initial.id);
      if (res.ok) setNotice("Tournament closed successfully");
      else alert(res.error);
    } finally {
      setStatusPending(false);
    }
  };

  useEffect(() => {
    if (updateState.ok && !notice) {
      setNotice("Changes saved successfully");
    }
  }, [updateState.ok, notice]);

  // Build FormData (sectionsOrder + theme JSON-encoded) -------------------
  function decorate(fd: FormData) {
    fd.set("sectionsOrder", JSON.stringify(sectionsOrder));
    fd.set("accentColor", accentColor);
    fd.set("heroImageUrl", heroImageUrl ?? "");
    fd.set("heroImagePublicId", heroImagePublicId ?? "");
    fd.set("mascotImageUrl", mascotImageUrl ?? "");
    fd.set("mascotImagePublicId", mascotImagePublicId ?? "");
    fd.set("mascotPosition", mascotPosition);
    fd.set("logoOverlayUrl", logoOverlayUrl ?? "");
    fd.set("logoOverlayPublicId", logoOverlayPublicId ?? "");
    fd.set("rulesetMarkdown", rulesetMarkdown);
    return fd;
  }

  return (
    <>
      {notice && (
        <div className="fixed right-5 top-5 z-50 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)]/95 px-4 py-3 text-sm text-[color:var(--color-foreground)] shadow-2xl shadow-black/30 backdrop-blur-sm">
          {notice}
        </div>
      )}
      <form
        action={(fd) => {
          decorate(fd);
          if (isEdit) updateFormAction(fd);
          else createFormAction(fd);
        }}
        className="space-y-10"
      >
      {(!isEdit && createState.error) || (isEdit && updateState.error) ? (
        <div className="card border-[color:var(--color-danger)] p-3 text-sm text-[color:var(--color-danger)]">
          {createState.error ?? updateState.error}
        </div>
      ) : null}

      {/* ===================== Basics ===================== */}
      <section className="card p-6 space-y-4">
        <h2 className="text-display text-lg">Basics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input focus:outline-none focus:border-[color:var(--color-ring)] focus:shadow-[0_0_0_3px_rgba(255,46,136,0.25)]"
            />
          </div>
          <div>
            <label htmlFor="slug">
              Slug{" "}
              <span className="font-normal normal-case text-[color:var(--color-muted-foreground)]">
                (auto from name if blank)
              </span>
            </label>
            <input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              pattern="^[a-z0-9]([a-z0-9-]*[a-z0-9])?$"
              className="input focus:outline-none focus:border-[color:var(--color-ring)] focus:shadow-[0_0_0_3px_rgba(255,46,136,0.25)]"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input focus:outline-none focus:border-[color:var(--color-ring)] focus:shadow-[0_0_0_3px_rgba(255,46,136,0.25)]"
            />
          </div>
          <div>
            <label htmlFor="registrationOpensAt">Registration opens</label>
            <input
              id="registrationOpensAt"
              name="registrationOpensAt"
              type="datetime-local"
              required
              value={registrationOpensAt}
              onChange={(e) => setOpens(e.target.value)}
              className="input focus:outline-none focus:border-[color:var(--color-ring)] focus:shadow-[0_0_0_3px_rgba(255,46,136,0.25)]"
            />
          </div>
          <div>
            <label htmlFor="submissionDeadline">Submission deadline</label>
            <input
              id="submissionDeadline"
              name="submissionDeadline"
              type="datetime-local"
              required
              value={submissionDeadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="input focus:outline-none focus:border-[color:var(--color-ring)] focus:shadow-[0_0_0_3px_rgba(255,46,136,0.25)]"
            />
          </div>
          <div>
            <label htmlFor="scoringRule">Scoring rule</label>
            <select
              id="scoringRule"
              name="scoringRule"
              value={scoringRule}
              onChange={(e) => setScoringRule(e.target.value as ScoringRule)}
              className="input focus:outline-none focus:border-[color:var(--color-ring)]"
            >
              <option value="AGGREGATE">Aggregate (sum all tracks)</option>
              <option value="BEST_N">Best N (sum top N)</option>
            </select>
          </div>
          {scoringRule === "BEST_N" && (
            <div>
              <label htmlFor="bestN">Best N</label>
              <input
                id="bestN"
                name="bestN"
                type="number"
                min={1}
                max={50}
                value={bestN}
                onChange={(e) => setBestN(Number(e.target.value))}
                className="input focus:outline-none focus:border-[color:var(--color-ring)] focus:shadow-[0_0_0_3px_rgba(255,46,136,0.25)]"
              />
            </div>
          )}
          <div>
            <label htmlFor="maxAchievementPct">Max achievement %</label>
            <input
              id="maxAchievementPct"
              name="maxAchievementPct"
              type="number"
              step="0.01"
              min={100}
              max={101}
              value={maxAchievementPct}
              onChange={(e) => setMaxPct(Number(e.target.value))}
              className="input focus:outline-none focus:border-[color:var(--color-ring)] focus:shadow-[0_0_0_3px_rgba(255,46,136,0.25)]"
            />
          </div>
          <div className="flex items-end gap-2">
            <input
              id="requireProof"
              name="requireProof"
              type="checkbox"
              checked={requireProof}
              onChange={(e) => setRequireProof(e.target.checked)}
              className="h-4 w-4 accent-[color:var(--color-brand)]"
            />
            <label htmlFor="requireProof" className="mb-0">
              Require screenshot proof
            </label>
          </div>
        </div>
      </section>

      {/* ===================== Tracks ===================== */}
      {isEdit && initial && (
        <section className="card p-6 space-y-4">
          <h2 className="text-display text-lg">Tracks</h2>
          <TrackList tracks={props.tracks ?? []} onNotice={setNotice} />
          <TrackPicker
            onAdd={async (sheetId) => {
              const res = await addTrackAction(initial.id, sheetId);
              if (res.ok) setNotice("Track added successfully");
              else alert(res.error);
            }}
            onAddCustom={async (payload) => {
              const res = await addCustomTrackAction(initial.id, payload);
              if (res.ok) setNotice("Custom track added successfully");
              return res;
            }}
          />
        </section>
      )}

      {/* ===================== Theme ===================== */}
      <section className="card p-6 space-y-6">
        <h2 className="text-display text-lg">Theme</h2>

        <div className="grid gap-6 lg:grid-cols-3">
          <CloudinaryUploader
            label="Hero image"
            slot="hero"
            value={heroImageUrl}
            publicId={heroImagePublicId}
            onUploaded={(r) => {
              setHeroUrl(r.url);
              setHeroPid(r.publicId);
            }}
            onCleared={() => {
              setHeroUrl(null);
              setHeroPid(null);
            }}
          />
          <CloudinaryUploader
            label="Mascot"
            slot="mascot"
            value={mascotImageUrl}
            publicId={mascotImagePublicId}
            onUploaded={(r) => {
              setMascotUrl(r.url);
              setMascotPid(r.publicId);
            }}
            onCleared={() => {
              setMascotUrl(null);
              setMascotPid(null);
            }}
          />
          <CloudinaryUploader
            label="Logo overlay"
            slot="logo"
            value={logoOverlayUrl}
            publicId={logoOverlayPublicId}
            onUploaded={(r) => {
              setLogoUrl(r.url);
              setLogoPid(r.publicId);
            }}
            onCleared={() => {
              setLogoUrl(null);
              setLogoPid(null);
            }}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="mascotPosition">Mascot position</label>
            <select
              id="mascotPosition"
              value={mascotPosition}
              onChange={(e) => setMascotPosition(e.target.value)}
              className="input focus:outline-none focus:border-[color:var(--color-ring)]"
            >
              <option value="bottom-right">bottom-right</option>
              <option value="bottom-left">bottom-left</option>
              <option value="top-right">top-right</option>
              <option value="top-left">top-left</option>
            </select>
          </div>
          <div>
            <label htmlFor="accentColor">Accent color</label>
            <div className="flex items-center gap-2">
              <input
                id="accentColor"
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-10 w-12 cursor-pointer rounded border border-[color:var(--color-border)] bg-[color:var(--color-input)]"
              />
              <input
                aria-label="accent hex"
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="input flex-1 focus:outline-none focus:border-[color:var(--color-ring)] focus:shadow-[0_0_0_3px_rgba(255,46,136,0.25)]"
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="rulesetMarkdown">
            Ruleset (markdown)
          </label>
          <div className="mb-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => applyMarkdownFormat("**", "**", "bold text")} className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-input)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:border-[color:var(--color-ring)]">
              Bold
            </button>
            <button type="button" onClick={() => applyMarkdownFormat("*", "*", "italic text")} className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-input)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:border-[color:var(--color-ring)]">
              Italic
            </button>
            <button type="button" onClick={() => insertBlock("\n## {text}\n")} className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-input)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:border-[color:var(--color-ring)]">
              H2
            </button>
            <button type="button" onClick={() => insertBlock("\n- {text}\n")} className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-input)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:border-[color:var(--color-ring)]">
              List
            </button>
            <button type="button" onClick={() => insertBlock("\n1. {text}\n")} className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-input)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:border-[color:var(--color-ring)]">
              Number
            </button>
            <button type="button" onClick={() => insertBlock("\n> {text}\n")} className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-input)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:border-[color:var(--color-ring)]">
              Quote
            </button>
            <button type="button" onClick={() => applyMarkdownFormat("[", "](https://example.com)", "link text")} className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-input)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:border-[color:var(--color-ring)]">
              Link
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <textarea
              ref={rulesetRef}
              id="rulesetMarkdown"
              value={rulesetMarkdown}
              onChange={(e) => setRuleset(e.target.value)}
              rows={10}
              className="input min-h-[260px] resize-y font-mono text-xs leading-6 focus:outline-none focus:border-[color:var(--color-ring)] focus:shadow-[0_0_0_3px_rgba(255,46,136,0.25)]"
              placeholder="# Rules&#10;&#10;1. Be nice.&#10;2. No cheating."
            />
            <div className="card prose prose-invert prose-sm max-w-none rounded-xl border border-white/10 bg-[#120f1d]/80 p-4 text-sm text-white/90">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {rulesetMarkdown || "_Nothing yet — preview will appear here._"}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        <div>
          <label>Sections (drag-free — use ↑ / ↓ / toggle)</label>
          <SectionOrderEditor value={sectionsOrder} onChange={setSectionsOrder} />
        </div>
      </section>

      {/* ===================== Publish ===================== */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={createPending || updatePending}
            className="btn btn-brand hover:bg-[#ff4d9d] disabled:opacity-50"
          >
            {isEdit
              ? updatePending
                ? "Saving…"
                : "Save changes"
              : createPending
                ? "Creating…"
                : "Create draft"}
          </button>
        </div>
        {isEdit && initial && (
          <div className="flex gap-2">
            {initial.status === "DRAFT" && (
              <button
                type="button"
                onClick={handlePublish}
                disabled={statusPending}
                className="btn btn-ghost hover:bg-[color:var(--color-muted)] disabled:opacity-50"
              >
                Publish
              </button>
            )}
            {initial.status === "OPEN" && (
              <button
                type="button"
                onClick={handleClose}
                disabled={statusPending}
                className="btn btn-ghost hover:bg-[color:var(--color-muted)] disabled:opacity-50"
              >
                Close submissions
              </button>
            )}
            <span className="self-center text-xs uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
              status: {initial.status.toLowerCase()}
            </span>
          </div>
        )}
      </div>
    </form>
    </>
  );
}

function TrackList({
  tracks,
  onNotice,
}: {
  tracks: TrackRow[];
  onNotice: (message: string) => void;
}) {
  const [removing, setRemoving] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, string> = {};
      for (const tr of tracks) {
        next[tr.id] = prev[tr.id] ?? tr.downloadUrl ?? "";
      }
      return next;
    });
  }, [tracks]);

  if (tracks.length === 0)
    return (
      <p className="text-sm text-[color:var(--color-muted-foreground)]">
        No tracks yet — add at least one below.
      </p>
    );

  return (
    <ul className="divide-y divide-[color:var(--color-border)] rounded-md border border-[color:var(--color-border)]">
      {tracks.map((tr) => {
        const value = drafts[tr.id] ?? tr.downloadUrl ?? "";
        return (
          <li key={tr.id} className="px-4 py-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{tr.sheet.song.title}</div>
                <div className="text-xs text-[color:var(--color-muted-foreground)]">
                  {tr.sheet.song.artist} · {tr.sheet.type} · {tr.sheet.difficulty} · Lv {tr.sheet.level}
                </div>
              </div>
              <button
                type="button"
                disabled={removing === tr.id}
                onClick={async () => {
                  setRemoving(tr.id);
                  try {
                    const res = await removeTrackAction(tr.id);
                    if (res.ok) onNotice("Track removed successfully");
                    else alert(res.error);
                  } finally {
                    setRemoving(null);
                  }
                }}
                className="rounded-md px-2 py-1 text-xs text-[color:var(--color-danger)] hover:bg-[color:var(--color-muted)] disabled:opacity-50"
              >
                Remove
              </button>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted-foreground)]">
                Chart download link
              </label>
              <input
                type="url"
                value={value}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [tr.id]: e.target.value,
                  }))
                }
                onBlur={async () => {
                  const nextUrl = (drafts[tr.id] ?? value).trim();
                  const prevUrl = (tr.downloadUrl ?? "").trim();
                  if (nextUrl === prevUrl) return;

                  const res = await updateTrackDownloadUrlAction(tr.id, nextUrl);
                  if (res.ok) {
                    onNotice("Chart link updated successfully");
                  } else {
                    alert(res.error);
                  }
                }}
                placeholder="https://example.com/chart.zip"
                className="input w-full focus:outline-none focus:border-[color:var(--color-ring)] focus:shadow-[0_0_0_3px_rgba(255,46,136,0.25)]"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// Suppress TS unused-warning for the action (referenced via Server Action strings).
void uploadAssetAction;
