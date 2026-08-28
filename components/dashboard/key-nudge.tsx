"use client";

import { KeyRound, Sparkles } from "lucide-react";
import { useSessionKey } from "@/lib/api-key-store";
import { openKeyPanel } from "@/components/api-key-panel";
import { Button } from "@/components/ui";

/** Shown while drafting is simulated: invites the analyst to add a personal key. */
export function KeyNudge({ serverKey }: { serverKey: boolean }) {
  const [sessionKey] = useSessionKey();
  if (sessionKey || serverKey) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50/70 px-4 py-3">
      <p className="flex items-start gap-2 text-sm text-teal-900">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-teal-600" />
        <span>
          Drafting runs on the built-in simulated engine. Add your own Claude API key to draft with live
          AI and to analyse the documents you upload — the key stays in this browser session only.
        </span>
      </p>
      <Button size="sm" onClick={openKeyPanel}>
        <KeyRound className="size-3.5" />
        Add Claude key
      </Button>
    </div>
  );
}
