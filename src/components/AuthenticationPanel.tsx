"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignIn, SignUp, useSession } from "@clerk/nextjs";
import { AUTHENTICATED_HOME, SIGN_IN_URL, SIGN_UP_URL } from "@/lib/auth-navigation";
import { verifyWorkspaceSession } from "@/lib/auth-completion";
import AccountButton from "@/components/AccountButton";
import { Button } from "@/components/ui";

const appearance = {
  variables: {
    colorPrimary: "#C75B39", colorBackground: "#FBFAF7", colorForeground: "#20201E",
    colorMutedForeground: "#686761", borderRadius: "8px", fontFamily: "var(--font-dm-sans), sans-serif",
  },
  elements: { card: "border border-line shadow-none" },
};

export default function AuthenticationPanel({ mode }: { mode: "sign-in" | "sign-up" }) {
  const { isLoaded, isSignedIn, session } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [authReason, setAuthReason] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const opening = isLoaded && isSignedIn && session.status === "active";
  useEffect(() => {
    if (isLoaded) return;
    const timer = setTimeout(() => setError("Sign-in is taking longer than expected. Check your connection and reload this page."), 15_000);
    return () => clearTimeout(timer);
  }, [isLoaded]);
  useEffect(() => {
    if (!opening || !session) return;
    let active = true;
    verifyWorkspaceSession(
      () => fetch("/api/stats", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(15_000) }),
      () => session.getToken({ skipCache: true }),
    ).then((result) => {
      if (!active) return;
      if (result.ready) window.location.replace(AUTHENTICATED_HOME);
      else {
        if (result.reason) console.warn(`[auth] Server rejected completed sign-in: ${result.reason}`);
        setAuthReason(result.reason ?? null);
        setError(result.error);
      }
    });
    return () => { active = false; };
  }, [opening, session, attempt]);

  const signingUp = mode === "sign-up";
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-5 py-10">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-[26px] font-semibold tracking-tight text-ink">
          {opening ? "Opening your workspace" : signingUp ? "Create your workspace" : "Welcome back"}
        </h1>
        <p className="mt-1 text-[14px] text-ink2">
          {opening ? "Checking your sign-in and preparing your dashboard." : signingUp ? "Start writing content that sounds like your brand." : "Sign in to your ContentForge workspace."}
        </p>
      </div>
      {(!isLoaded || opening) ? (
        error ? <div className="max-w-md text-center" role="alert">
          <p className="text-sm text-danger">{error}</p>
          {authReason && <p className="mt-2 text-xs text-ink2">Support code: <code>{authReason}</code></p>}
          <div className="mt-4 flex items-center justify-center gap-4">
            <Button onClick={() => {
              if (!isLoaded) { window.location.reload(); return; }
              setError(null); setAuthReason(null); setAttempt((value) => value + 1);
            }}>Try again</Button>
            {opening && <AccountButton />}
            <Link href="/" className="text-sm text-accent">Home</Link>
          </div>
        </div> : <p role="status" className="text-sm text-ink2">{opening ? "Preparing your dashboard…" : "Loading secure sign-in…"}</p>
      ) : signingUp ? (
        <SignUp routing="path" path={SIGN_UP_URL} signInUrl={SIGN_IN_URL}
          forceRedirectUrl={AUTHENTICATED_HOME} signInForceRedirectUrl={AUTHENTICATED_HOME}
          fallbackRedirectUrl={AUTHENTICATED_HOME} appearance={appearance}
          fallback={<p role="status">Loading secure sign-up…</p>} />
      ) : (
        <SignIn routing="path" path={SIGN_IN_URL} signUpUrl={SIGN_UP_URL}
          forceRedirectUrl={AUTHENTICATED_HOME} signUpForceRedirectUrl={AUTHENTICATED_HOME}
          fallbackRedirectUrl={AUTHENTICATED_HOME} appearance={appearance}
          fallback={<p role="status">Loading secure sign-in…</p>} />
      )}
    </div>
  );
}
