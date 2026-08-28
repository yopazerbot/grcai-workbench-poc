import type { SnapshotRecord } from "./org-context";

// Shared evidence-freshness logic: used by the simulated Evidence Collector
// and by the dashboard, so both tell the same story about the same snapshots.

export const STALE_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export type EvidenceStatus = "complete" | "partial" | "stale" | "missing";

export interface EvidenceEntry {
  description: string;
  source_system: string;
  collected_at: string;
  what_counts_note: string;
  gap: string | null;
}

export interface ControlEvidence {
  status: EvidenceStatus;
  evidence: EvidenceEntry[];
  maxAgeDays: number | null;
  gaps: string[];
  systems: string[];
}

export function evidenceForControl(
  controlId: string,
  snapshots: SnapshotRecord[],
  now: number = Date.now()
): ControlEvidence {
  const evidence: EvidenceEntry[] = snapshots.flatMap((snap) =>
    snap.entries
      .filter((e) => e.controls.includes(controlId))
      .map((e) => ({
        description: e.description,
        source_system: snap.system,
        collected_at: e.collectedAt,
        what_counts_note: e.whatCounts,
        gap: e.gap,
      }))
  );

  if (evidence.length === 0) {
    return { status: "missing", evidence, maxAgeDays: null, gaps: [], systems: [] };
  }

  const ages = evidence.map((e) => Math.floor((now - new Date(e.collected_at).getTime()) / DAY_MS));
  const maxAgeDays = Math.max(...ages);
  const gaps = evidence.map((e) => e.gap).filter((g): g is string => Boolean(g));
  const systems = [...new Set(evidence.map((e) => e.source_system))];

  const status: EvidenceStatus =
    maxAgeDays > STALE_DAYS ? "stale" : gaps.length > 0 ? "partial" : "complete";
  return { status, evidence, maxAgeDays, gaps, systems };
}
