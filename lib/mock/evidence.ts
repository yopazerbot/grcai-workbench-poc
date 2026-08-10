import { UNCOVERED_CONTROL_NOTES } from "@/lib/seed/org-data";
import type { ControlRecord, OrgData } from "@/lib/org-context";

// Deterministic evidence collector over the seeded connected-system
// snapshots. Timestamps are the snapshots' real materialised dates, so
// staleness findings are genuine, not scripted.

const STALE_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

function resolveControl(token: string, org: OrgData): ControlRecord | null {
  const t = token.trim().toLowerCase();
  if (!t) return null;
  return (
    org.controls.find((c) => c.id.toLowerCase() === t) ??
    org.controls.find((c) => t.includes(c.id.toLowerCase())) ??
    org.controls.find(
      (c) => c.name.toLowerCase().includes(t) || t.includes(c.name.toLowerCase())
    ) ??
    null
  );
}

export function mockEvidence(input: Record<string, string>, org: OrgData): unknown {
  const tokens = (input.controls ?? "")
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 25);

  const items = tokens.map((token) => {
    const control = resolveControl(token, org);
    if (!control) {
      return {
        control_id: token.toUpperCase().slice(0, 24),
        control_name: "Not found in control register",
        status: "missing" as const,
        evidence: [],
        gap_note: `"${token}" does not match any control in the register. Check the identifier or add the control before collecting evidence.`,
        source_note: "Internal control register",
      };
    }

    const evidence = org.snapshots.flatMap((snap) =>
      snap.entries
        .filter((e) => e.controls.includes(control.id))
        .map((e) => ({
          description: e.description,
          source_system: snap.system,
          collected_at: e.collectedAt,
          what_counts_note: e.whatCounts,
          gap: e.gap,
        }))
    );

    if (evidence.length === 0) {
      return {
        control_id: control.id,
        control_name: control.name,
        status: "missing" as const,
        evidence: [],
        gap_note:
          UNCOVERED_CONTROL_NOTES[control.id] ??
          "No connected system provides evidence for this control; evidence must be collected manually.",
        source_note: "No connected system coverage",
      };
    }

    const ages = evidence.map((e) =>
      Math.floor((Date.now() - new Date(e.collected_at).getTime()) / DAY_MS)
    );
    const maxAge = Math.max(...ages);
    const gaps = evidence.map((e) => e.gap).filter((g): g is string => Boolean(g));
    const systems = [...new Set(evidence.map((e) => e.source_system))];

    let status: "complete" | "partial" | "stale";
    let gap_note: string | null = null;
    if (maxAge > STALE_DAYS) {
      status = "stale";
      gap_note = `Most recent relevant evidence is ${maxAge} days old (threshold: ${STALE_DAYS} days). Re-collect current-state evidence before the audit.${
        gaps.length > 0 ? ` Also recorded: ${gaps.join(" ")}` : ""
      }`;
    } else if (gaps.length > 0) {
      status = "partial";
      gap_note = gaps.join(" ");
    } else {
      status = "complete";
    }

    return {
      control_id: control.id,
      control_name: control.name,
      status,
      evidence: evidence.map(({ gap: _gap, ...e }) => e),
      gap_note,
      source_note: `Connected systems: ${systems.join(", ")}`,
    };
  });

  return { items };
}
