import Link from "next/link";
import { Suspense } from "react";
import { SignInButton } from "@/components/SignInButton";
import { verifySession } from "@/lib/dal/session";
import { redirect } from "next/navigation";

type SearchParams = Promise<{ next?: string }>;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Already signed in → bounce to destination (wrapped in Suspense so the
  // cookie read doesn't block prerender of the sign-in shell).
  return (
    <Suspense fallback={<SignInShell />}>
      <SignInRedirector searchParams={searchParams} />
    </Suspense>
  );
}

async function SignInRedirector({ searchParams }: { searchParams: SearchParams }) {
  const session = await verifySession();
  if (session) {
    const { next } = await searchParams;
    redirect(next ?? "/me");
  }
  return <SignInShell />;
}

function SignInShell() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-6 py-24">
      <div className="card w-full p-8 text-center">
        <h1 className="text-display text-3xl">Sign in</h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
          Use your Google account to participate in tournaments.
        </p>
        <div className="mt-6">
          <SignInButton />
        </div>
        <p className="mt-6 text-xs text-[color:var(--color-muted-foreground)]">
          By signing in you agree to the tournament rules.{" "}
          <Link
            href="/"
            className="underline underline-offset-2 hover:text-[color:var(--color-foreground)]"
          >
            Back home
          </Link>
        </p>
      </div>
    </div>
  );
}
