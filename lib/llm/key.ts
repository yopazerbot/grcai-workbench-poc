import { env, envKeyConfigured } from "@/lib/env";
import type { EngineSource } from "@/lib/types";

// Resolves which Claude key (if any) serves a request. A key supplied by the
// browser lives only in that user's sessionStorage and in this request's
// memory; it is never persisted, logged or echoed back.

export const API_KEY_HEADER = "x-anthropic-key";

export interface ResolvedKey {
  apiKey: string | null;
  source: EngineSource;
}

/** Loose shape check so obviously wrong values fail fast without a network call. */
export function looksLikeAnthropicKey(value: string): boolean {
  const v = value.trim();
  return v.startsWith("sk-ant-") && v.length >= 40 && v.length <= 300 && !/\s/.test(v);
}

export function resolveApiKey(headers: Headers): ResolvedKey {
  const fromHeader = headers.get(API_KEY_HEADER)?.trim() ?? "";
  if (fromHeader && looksLikeAnthropicKey(fromHeader)) {
    return { apiKey: fromHeader, source: "session_key" };
  }
  if (envKeyConfigured) {
    return { apiKey: env.ANTHROPIC_API_KEY, source: "env_key" };
  }
  return { apiKey: null, source: "simulated" };
}

export const ENGINE_LABELS: Record<EngineSource, string> = {
  session_key: "Claude · session key",
  env_key: "Claude · server key",
  simulated: "Simulated",
};
