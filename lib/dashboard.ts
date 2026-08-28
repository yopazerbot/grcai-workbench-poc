import {
  getItemsForRun,
  getLatestRunForInput,
  getWorkQueueCounts,
  listAudit,
  listRuns,
  type WorkQueueCounts,
} from "./data";
import { getKnowledgeStats } from "./documents";
import { evidenceForControl, type EvidenceStatus } from "./evidence-status";
import { FRAMEWORK_LIST, type FrameworkKey } from "./frameworks";
import { getOrgData } from "./org-context";
import { POLICY_REVIEW_INTERVAL_DAYS } from "./seed/lumeo/register";
import type { AuditView, KnowledgeStats, RunStatus, RunSummary } from "./types";

// Everything the dashboard shows, computed from live data: the latest mapping
// runs (posture), connected-system snapshots (evidence freshness), runs and
// items (work queue), the knowledge base, and dated records (upcoming).

export interface FrameworkPosture {
  key: FrameworkKey;
  name: string;
  shortName: string;
  runId: string | null;
  runStatus: RunStatus | null;
  assessedAt: string | null;
  total: number;
  full: number;
  partial: number;
  none: number;
  /** Requirements still awaiting an analyst decision on the latest run. */
  undecided: number;
  fullPct: number;
  partialPct: number;
}

export interface EvidenceOverview {
  total: number;
  complete: number;
  partial: number;
  stale: number;
  missing: number;
  controls: Array<{
    id: string;
    name: string;
    owner: string;
    controlStatus: string;
    status: EvidenceStatus;
    maxAgeDays: number | null;
    systems: string[];
  }>;
}

export interface UpcomingItem {
  kind: "policy_review" | "certificate" | "control_review";
  label: string;
  detail: string;
  dueAt: string;
  overdue: boolean;
  href?: string;
}

export interface DashboardData {
  orgName: string;
  generatedAt: string;
  posture: FrameworkPosture[];
  evidence: EvidenceOverview;
  queue: WorkQueueCounts & { runs: RunSummary[] };
  knowledge: KnowledgeStats;
  controls: { total: number; operating: number; inRemediation: number };
  upcoming: UpcomingItem[];
  recentAudit: AuditView[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function framePosture(key: FrameworkKey): FrameworkPosture {
  const fw = FRAMEWORK_LIST.find((f) => f.key === key)!;
  const run = getLatestRunForInput("control-mapper", "framework", key);
  const base: FrameworkPosture = {
    key,
    name: fw.name,
    shortName: fw.shortName,
    runId: null,
    runStatus: null,
    assessedAt: null,
    total: fw.requirements.length,
    full: 0,
    partial: 0,
    none: 0,
    undecided: 0,
    fullPct: 0,
    partialPct: 0,
  };
  if (!run) return base;

  const items = getItemsForRun(run.id).filter((i) => i.status !== "rejected");
  const counts = { full: 0, partial: 0, none: 0 };
  let undecided = 0;
  for (const item of items) {
    const c = String(item.data.coverage ?? "none") as keyof typeof counts;
    if (c in counts) counts[c]++;
    if (item.status === "draft") undecided++;
  }
  const total = items.length || fw.requirements.length;
  return {
    ...base,
    runId: run.id,
    runStatus: run.status,
    assessedAt: run.completedAt ?? run.createdAt,
    total,
    ...counts,
    undecided,
    fullPct: Math.round((counts.full / total) * 100),
    partialPct: Math.round((counts.partial / total) * 100),
  };
}

export function getDashboardData(): DashboardData {
  const now = Date.now();
  const org = getOrgData();

  const posture = FRAMEWORK_LIST.map((f) => framePosture(f.key));

  const evidenceControls = org.controls.map((c) => {
    const ev = evidenceForControl(c.id, org.snapshots, now);
    return {
      id: c.id,
      name: c.name,
      owner: c.owner,
      controlStatus: c.status,
      status: ev.status,
      maxAgeDays: ev.maxAgeDays,
      systems: ev.systems,
    };
  });
  const evidence: EvidenceOverview = {
    total: evidenceControls.length,
    complete: evidenceControls.filter((c) => c.status === "complete").length,
    partial: evidenceControls.filter((c) => c.status === "partial").length,
    stale: evidenceControls.filter((c) => c.status === "stale").length,
    missing: evidenceControls.filter((c) => c.status === "missing").length,
    controls: evidenceControls,
  };

  const queueCounts = getWorkQueueCounts();
  const queue = { ...queueCounts, runs: listRuns({ status: ["review", "drafting"], limit: 6 }) };

  const policyReviews: UpcomingItem[] = [];
  const certificates: UpcomingItem[] = [];
  for (const p of org.policies) {
    if (!p.approvedAt) continue;
    const due = new Date(new Date(p.approvedAt).getTime() + POLICY_REVIEW_INTERVAL_DAYS * DAY_MS);
    policyReviews.push({
      kind: "policy_review",
      label: `${p.name} v${p.version}`,
      detail: `Annual review · owner ${p.owner}`,
      dueAt: due.toISOString(),
      overdue: due.getTime() < now,
      href: p.documentId ? `/knowledge/${p.documentId}` : undefined,
    });
  }
  for (const c of org.certifications) {
    if (!c.validUntil) continue;
    const due = new Date(c.validUntil);
    if (Number.isNaN(due.getTime())) continue;
    certificates.push({
      kind: "certificate",
      label: c.name,
      detail: `Expires · ${c.issuer}`,
      dueAt: due.toISOString(),
      overdue: due.getTime() < now,
      href: c.documentId ? `/knowledge/${c.documentId}` : undefined,
    });
  }
  // Certificates are few and important: always keep them, fill the rest with
  // the soonest policy reviews.
  const UPCOMING_MAX = 10;
  policyReviews.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const upcoming = [...certificates, ...policyReviews.slice(0, Math.max(0, UPCOMING_MAX - certificates.length))];
  upcoming.sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  return {
    orgName: org.orgName,
    generatedAt: new Date(now).toISOString(),
    posture,
    evidence,
    queue,
    knowledge: getKnowledgeStats(),
    controls: {
      total: org.controls.length,
      operating: org.controls.filter((c) => c.status === "operating").length,
      inRemediation: org.controls.filter((c) => c.status === "in_remediation").length,
    },
    upcoming,
    recentAudit: listAudit({ limit: 8 }),
  };
}
