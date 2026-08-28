"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, X } from "lucide-react";
import { API_KEY_HEADER, maskKey, useSessionKey } from "@/lib/api-key-store";
import { Button, Spinner } from "@/components/ui";

export const OPEN_KEY_PANEL_EVENT = "grcai:open-key-panel";

export function openKeyPanel(): void {
  window.dispatchEvent(new Event(OPEN_KEY_PANEL_EVENT));
}

/**
 * Lets the analyst set a personal Claude API key for this browser session.
 * The key is kept in sessionStorage only, sent as a header with LLM-backed
 * requests, and never stored on the server.
 */
export function ApiKeyPanel({ serverKey }: { serverKey: boolean }) {
  const [open, setOpen] = useState(false);
  const [sessionKey, setSessionKey] = useSessionKey();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState<string | null>(null);

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      setError(null);
      setVerified(null);
      setValue("");
    };
    window.addEventListener(OPEN_KEY_PANEL_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_KEY_PANEL_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const verify = async (key: string): Promise<string | null> => {
    const res = await fetch("/api/llm/verify", {
      method: "POST",
      headers: { [API_KEY_HEADER]: key },
    });
    const body = (await res.json()) as { ok?: boolean; model?: string; error?: string };
    if (!res.ok || !body.ok) return body.error ?? "Could not verify the key.";
    setVerified(body.model ?? "verified");
    return null;
  };

  const saveAndVerify = async (skipVerify = false) => {
    const key = value.trim();
    if (!key) return;
    setBusy(true);
    setError(null);
    try {
      if (!skipVerify) {
        const err = await verify(key);
        if (err) {
          setError(err);
          return;
        }
      }
      setSessionKey(key);
      setValue("");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  const verifyExisting = async () => {
    if (!sessionKey) return;
    setBusy(true);
    setError(null);
    try {
      const err = await verify(sessionKey);
      if (err) setError(err);
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none transition-colors placeholder:font-sans placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15";

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-key-title"
        className="w-full max-w-md animate-fade-up rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <KeyRound className="size-4" />
            </span>
            <div>
              <h2 id="api-key-title" className="text-base font-semibold tracking-tight">
                Claude API key
              </h2>
              <p className="text-xs text-slate-500">Personal key for this browser session</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-slate-600">
          The key is kept in this tab&apos;s session storage only, sent with your own requests and
          used server-side just for that request. It is never written to the database, logs or
          audit trail, and disappears when you close the tab.
          {serverKey && (
            <>
              {" "}
              This server also has a shared key configured; a session key takes precedence for
              your requests.
            </>
          )}
        </p>

        {sessionKey ? (
          <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium text-teal-800">
                  <ShieldCheck className="size-4" />
                  Key active for this session
                </p>
                <p className="mt-0.5 truncate font-mono text-xs text-teal-700/80">
                  {maskKey(sessionKey)}
                  {verified && <span className="ml-2 font-sans">· verified ({verified})</span>}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button variant="secondary" size="sm" onClick={verifyExisting} disabled={busy}>
                  {busy ? <Spinner /> : "Verify"}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setSessionKey(null);
                    setVerified(null);
                    setError(null);
                  }}
                  disabled={busy}
                >
                  Forget
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            {sessionKey ? "Replace with another key" : "Paste your key"}
          </span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void saveAndVerify();
            }}
            placeholder="sk-ant-…"
            className={inputClass}
          />
        </label>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => saveAndVerify(true)}
            disabled={busy || !value.trim()}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50"
          >
            Save without verifying
          </button>
          <Button onClick={() => saveAndVerify()} disabled={busy || !value.trim()}>
            {busy ? <Spinner className="border-white/40 border-t-white" /> : <KeyRound className="size-4" />}
            {busy ? "Verifying…" : "Verify & use"}
          </Button>
        </div>
      </div>
    </div>
  );
}
