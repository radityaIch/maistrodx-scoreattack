"use client";

import { useTransition, useState } from "react";
import { signIn } from "@/lib/auth-client";

export function SignInButton({ next }: { next?: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await signIn.social({
                provider: "google",
                callbackURL: next ?? "/me",
              });
            } catch (e) {
              setError((e as Error).message);
            }
          })
        }
        className="btn btn-brand hover:bg-[#ff4d9d] disabled:opacity-50"
      >
        {pending ? "Redirecting…" : "Continue with Google"}
      </button>
      {error && (
        <p className="text-sm text-[color:var(--color-danger)]">{error}</p>
      )}
    </div>
  );
}
