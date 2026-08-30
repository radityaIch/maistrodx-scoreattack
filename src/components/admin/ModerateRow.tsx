"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveSubmissionAction, rejectSubmissionAction } from "@/lib/actions/moderation";

type Submission = {
  id: string;
  achievementPct: string;
  screenshotUrl: string;
  note: string | null;
  playerEmail: string;
  playerName: string | null;
  songTitle: string;
  difficulty: string;
  type: string;
  level: string;
  submittedAt: string;
};

export function ModerateRow({ submission }: { submission: Submission }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const approve = () =>
    startTransition(async () => {
      setError(null);
      const res = await approveSubmissionAction(submission.id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });

  const reject = () =>
    startTransition(async () => {
      setError(null);
      if (!reason.trim()) {
        setError("reason required");
        return;
      }
      const fd = new FormData();
      fd.set("submissionId", submission.id);
      fd.set("reason", reason);
      const res = await rejectSubmissionAction(fd);
      if (!res.ok) setError(res.error);
      else {
        setShowReject(false);
        setReason("");
        router.refresh();
      }
    });

  return (
    <li className="card p-4">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-sm">
              <span className="font-medium">{submission.playerName ?? submission.playerEmail}</span>
              <span className="ml-2 text-xs text-[color:var(--color-muted-foreground)]">
                {new Date(submission.submittedAt).toLocaleString()}
              </span>
            </div>
            <span className="font-mono text-xl tabular-nums text-[color:var(--color-brand)]">
              {Number(submission.achievementPct).toFixed(2)}%
            </span>
          </div>
          <div className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
            {submission.songTitle} · {submission.type} · {submission.difficulty} · Lv {submission.level}
          </div>
          {submission.note && (
            <p className="mt-2 text-xs italic text-[color:var(--color-muted-foreground)]">
              “{submission.note}”
            </p>
          )}
          <a
            href={submission.screenshotUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={submission.screenshotUrl}
              alt="screenshot"
              className="max-h-48 rounded border border-[color:var(--color-border)]"
            />
          </a>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          {!showReject ? (
            <>
              <button
                type="button"
                onClick={approve}
                disabled={pending}
                className="btn btn-brand hover:bg-[#ff4d9d] disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => setShowReject(true)}
                disabled={pending}
                className="btn btn-ghost hover:bg-[color:var(--color-muted)] disabled:opacity-50"
              >
                Reject
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (required)"
                className="input focus:outline-none focus:border-[color:var(--color-ring)] focus:shadow-[0_0_0_3px_rgba(255,46,136,0.25)]"
                autoFocus
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={reject}
                  disabled={pending}
                  className="btn btn-brand hover:bg-[#ff4d9d] disabled:opacity-50"
                >
                  Confirm reject
                </button>
                <button
                  type="button"
                  onClick={() => setShowReject(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {error && (
            <p className="text-xs text-[color:var(--color-danger)]">{error}</p>
          )}
        </div>
      </div>
    </li>
  );
}
