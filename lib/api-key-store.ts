"use client";

import { useCallback, useEffect, useState } from "react";

// Browser-side store for the analyst's personal Claude API key. The key lives
// in sessionStorage only (cleared when the tab closes), is sent as a request
// header to the app's own API routes, and never reaches the database or logs.

const STORAGE_KEY = "grcai.anthropic-key";
const EVENT = "grcai:api-key-changed";
export const API_KEY_HEADER = "x-anthropic-key";

function read(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getSessionKey(): string | null {
  if (typeof window === "undefined") return null;
  return read();
}

export function setSessionKey(key: string | null): void {
  try {
    if (key) window.sessionStorage.setItem(STORAGE_KEY, key);
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked (private mode etc.) — the key simply is not remembered.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Headers to attach to any request that may trigger an LLM call. */
export function llmHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const key = getSessionKey();
  return key ? { ...extra, [API_KEY_HEADER]: key } : extra;
}

export function maskKey(key: string): string {
  if (key.length <= 12) return "••••";
  return `${key.slice(0, 10)}…${key.slice(-4)}`;
}

/** React hook: the current session key, re-rendering when it changes. */
export function useSessionKey(): [string | null, (key: string | null) => void] {
  const [key, setKey] = useState<string | null>(null);
  useEffect(() => {
    setKey(read());
    const onChange = () => setKey(read());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  const update = useCallback((next: string | null) => setSessionKey(next), []);
  return [key, update];
}
