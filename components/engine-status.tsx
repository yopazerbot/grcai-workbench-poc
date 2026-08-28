"use client";

import { FlaskConical, Sparkles } from "lucide-react";
import { useSessionKey } from "@/lib/api-key-store";
import { openKeyPanel } from "@/components/api-key-panel";
import { cx } from "@/components/ui";

/** Header pill: which engine will serve this user's next LLM-backed action. */
export function EngineStatus({ serverKey, compact = false }: { serverKey: boolean; compact?: boolean }) {
  const [sessionKey] = useSessionKey();
  const live = Boolean(sessionKey) || serverKey;
  const label = sessionKey ? "Claude · session key" : serverKey ? "Claude · server key" : "Simulated";

  return (
    <button
      type="button"
      onClick={openKeyPanel}
      title={
        live
          ? "Live Claude drafting and document analysis. Click to manage your key."
          : "Drafting is served by the built-in simulated engine. Click to add your Claude API key."
      }
      className={cx(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        live
          ? "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
      )}
    >
      {live ? <Sparkles className="size-3.5" /> : <FlaskConical className="size-3.5" />}
      <span className={compact ? "hidden sm:inline" : undefined}>{label}</span>
    </button>
  );
}
