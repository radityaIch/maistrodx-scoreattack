"use client";

import { useActionState, useEffect } from "react";
import type { SubmitResult } from "@/lib/actions/submission";

type Props = {
  action: (fd: FormData) => Promise<SubmitResult>;
  maxAchievementPct: number;
  existing: {
    achievementPct: string;
    screenshotUrl: string;
    status: string;
  } | null;
  disabled?: boolean;
};

type State = { ok: boolean; message?: string; error?: string };

export function SubmitForm({ action, maxAchievementPct, existing, disabled }: Props) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, fd) => {
      const res = await action(fd);
      return res.ok
        ? { ok: true, message: res.upserted ? "Updated." : "Submitted." }
        : { ok: false, error: res.error };
    },
    { ok: true },
  );

  useEffect(() => {
    if (state.message) {
      const t = setTimeout(() => {
        // noop — state will be replaced on next submit
      }, 50);
      return () => clearTimeout(t);
    }
  }, [state.message]);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
      <div>
        <label htmlFor="achievementPct">
          Achievement %{" "}
          <span className="font-normal normal-case text-[color:var(--color-muted-foreground)]">
            (max {maxAchievementPct})
          </span>
        </label>
        <input
          id="achievementPct"
          name="achievementPct"
          type="number"
          step="0.01"
          min={0}
          max={maxAchievementPct}
          defaultValue={existing?.achievementPct ?? ""}
          required
          disabled={disabled}
          className="input focus:outline-none focus:border-[color:var(--color-ring)] focus:shadow-[0_0_0_3px_rgba(255,46,136,0.25)]"
        />
      </div>
      <div>
        <label htmlFor="screenshotUrl">Screenshot URL</label>
        <input
          id="screenshotUrl"
          name="screenshotUrl"
          type="url"
          required
          placeholder="https://i.imgur.com/…"
          defaultValue={existing?.screenshotUrl ?? ""}
          disabled={disabled}
          pattern="https?://.*\.(png|jpe?g|webp|gif)(\?.*)?"
          className="input focus:outline-none focus:border-[color:var(--color-ring)] focus:shadow-[0_0_0_3px_rgba(255,46,136,0.25)]"
        />
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={disabled || pending}
          className="btn btn-brand hover:bg-[#ff4d9d] disabled:opacity-50"
        >
          {pending ? "Saving…" : existing ? "Update" : "Submit"}
        </button>
      </div>
      {state.error && (
        <p className="text-xs text-[color:var(--color-danger)] sm:col-span-3">
          {state.error}
        </p>
      )}
      {state.message && !state.error && (
        <p className="text-xs text-[color:var(--color-success)] sm:col-span-3">
          {state.message} Status: PENDING (awaits admin verification).
        </p>
      )}
    </form>
  );
}
