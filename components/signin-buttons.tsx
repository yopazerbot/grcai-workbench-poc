"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Spinner } from "@/components/ui";

// Sign-in via Auth.js's REST flow (CSRF cookie + fetch) instead of Server
// Actions: Server Action POSTs are rejected when a reverse proxy in front of
// the app rewrites the Host header (Origin/Host mismatch), which surfaced as
// "An unexpected response was received from the server" behind such proxies.
// Navigation after sign-in is done client-side to a sanitised RELATIVE path,
// so a mangled Host can never redirect the browser to an internal address.

function safeRelative(target: string | null): string {
  if (!target) return "/";
  try {
    const decoded = decodeURIComponent(target);
    if (decoded.startsWith("/") && !decoded.startsWith("//")) return decoded;
  } catch {
    // fall through to "/"
  }
  return "/";
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 21 21" className="size-4" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export function SignInButtons({
  microsoft,
  demo,
}: {
  microsoft: boolean;
  demo: boolean;
}) {
  const searchParams = useSearchParams();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const target = safeRelative(searchParams.get("callbackUrl"));

  const start = async (provider: "demo" | "microsoft-entra-id") => {
    setPending(provider);
    setError(null);
    try {
      const res = await signIn(provider, { redirect: false, redirectTo: target });
      if (res?.error) {
        setError("Sign-in failed. Check the server logs and try again.");
        setPending(null);
        return;
      }
      if (provider === "demo") {
        // Session cookie is set — navigate ourselves, relative only.
        window.location.assign(target);
        return;
      }
      // OAuth: follow the authorize URL Auth.js prepared.
      if (res?.url) {
        window.location.assign(res.url);
        return;
      }
      setError("Sign-in did not return a redirect. Is AUTH_URL configured?");
      setPending(null);
    } catch {
      setError("Could not reach the server. Check that the app is running behind your proxy.");
      setPending(null);
    }
  };

  return (
    <div className="space-y-3">
      {microsoft && (
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => start("microsoft-entra-id")}
          className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          {pending === "microsoft-entra-id" ? <Spinner /> : <MicrosoftLogo />}
          Sign in with Microsoft
        </button>
      )}
      {demo && (
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => start("demo")}
          className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800 disabled:opacity-60"
        >
          {pending === "demo" && <Spinner className="border-white/40 border-t-white" />}
          Continue as demo analyst
        </button>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}
    </div>
  );
}
