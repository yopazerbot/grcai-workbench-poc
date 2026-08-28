import { UNCOVERED_CONTROL_NOTES } from "@/lib/seed/lumeo/register";
import { evidenceForControl, STALE_DAYS } from "@/lib/evidence-status";
import { sourceLabel } from "@/lib/source-ref";
import type { ControlRecord, OrgData } from "@/lib/org-context";

// Deterministic evidence collector over the seeded connected-system
// snapshots. Timestamps are the snapshots' real materialised dates, so
// staleness findings are genuine, not scripted.

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

  const registerLabel = org.controls[0] ? sourceLabel(org.controls[0]).split(",")[0] : "Control register";

  const items = tokens.map((token) => {
    const control = resolveControl(token, org);
    if (!control) {
      return {
        control_id: token.toUpperCase().slice(0, 24),
        control_name: "Not found in control register",
        status: "missing" as const,
        evidence: [],
        gap_note: `"${token}" does not match any control in the register. Check the identifier or add the control before collecting evidence.`,
        source_note: registerLabel,
      };
    }

    const ev = evidenceForControl(control.id, org.snapshots);

    if (ev.status === "missing") {
      return {
        control_id: control.id,
        control_name: control.name,
        status: "missing" as const,
        evidence: [],
        gap_note:
          UNCOVERED_CONTROL_NOTES[control.id] ??
          "No connected system provides evidence for this control; evidence must be collected manually.",
        source_note: `No connected system coverage; control defined in ${sourceLabel(control)}`,
      };
    }

    let gap_note: string | null = null;
    if (ev.status === "stale") {
      gap_note = `Most recent relevant evidence is ${ev.maxAgeDays} days old (threshold: ${STALE_DAYS} days). Re-collect current-state evidence before the audit.${
        ev.gaps.length > 0 ? ` Also recorded: ${ev.gaps.join(" ")}` : ""
      }`;
    } else if (ev.status === "partial") {
      gap_note = ev.gaps.join(" ");
    }

    return {
      control_id: control.id,
      control_name: control.name,
      status: ev.status,
      evidence: ev.evidence.map(({ gap: _gap, ...e }) => e),
      gap_note,
      source_note: `Connected systems: ${ev.systems.join(", ")}; control defined in ${sourceLabel(control)}`,
    };
  });

  return { items };
}
