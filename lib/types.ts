// Shared view types. This module is client-safe: no db or SDK imports.

export type AgentId =
  | "questionnaire"
  | "evidence"
  | "control-mapper"
  | "policy-reviewer"
  | "threat-checker";

export type OrgCategory =
  | "profile"
  | "certification"
  | "control"
  | "policy"
  | "qa_pair"
  | "system_snapshot"
  | "assets";

export type RunStatus = "drafting" | "review" | "completed" | "failed";
export type ItemStatus = "draft" | "approved" | "rejected";

export interface RunCounts {
  total: number;
  draft: number;
  approved: number;
  rejected: number;
  flagged: number;
}

export interface RunSummary {
  id: string;
  agentId: AgentId;
  status: RunStatus;
  inputSummary: string;
  error: string | null;
  model: string | null;
  createdByName: string;
  createdAt: string;
  completedAt: string | null;
  counts: RunCounts;
}

export interface RunDetail extends RunSummary {
  input: Record<string, string>;
}

export interface ItemView {
  id: string;
  position: number;
  status: ItemStatus;
  flagged: boolean;
  flagReason: string | null;
  edited: boolean;
  data: Record<string, unknown>;
  original: Record<string, unknown> | null;
  decidedByName: string | null;
  decidedAt: string | null;
}

export interface AuditView {
  id: number;
  ts: string;
  actorName: string;
  action: string;
  agentId: AgentId | null;
  runId: string | null;
  itemId: string | null;
  details: Record<string, unknown> | null;
}

export interface Actor {
  name: string;
  email: string;
}

export type AuditAction =
  | "run_started"
  | "run_drafts_created"
  | "run_failed"
  | "run_completed"
  | "item_edited"
  | "item_approved"
  | "item_rejected"
  | "items_bulk_approved"
  | "run_exported";
