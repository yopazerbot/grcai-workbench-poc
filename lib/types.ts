// Shared view types. This module is client-safe: no db or SDK imports.

export type AgentId =
  | "questionnaire"
  | "evidence"
  | "control-mapper"
  | "policy-reviewer"
  | "threat-checker";

/** Knowledge record categories. All but system_snapshot are document-derived. */
export type OrgCategory =
  | "profile"
  | "certification"
  | "asset"
  | "control"
  | "policy"
  | "qa_pair"
  | "system_snapshot";

export const ORG_CATEGORY_LABELS: Record<OrgCategory, string> = {
  profile: "Organisation facts",
  certification: "Certifications & regulatory scope",
  asset: "Assets & technology",
  control: "Controls",
  policy: "Policies",
  qa_pair: "Past questionnaire answers",
  system_snapshot: "Connected systems",
};

export type DocumentStatus =
  | "extracting"
  | "awaiting_analysis"
  | "analysing"
  | "analysed"
  | "failed";

export type DocumentCategory =
  | "policy"
  | "standard"
  | "plan"
  | "procedure"
  | "certificate"
  | "register"
  | "inventory"
  | "questionnaire"
  | "overview"
  | "contract"
  | "report"
  | "other";

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  policy: "Policy",
  standard: "Standard",
  plan: "Plan",
  procedure: "Procedure",
  certificate: "Certificate / attestation",
  register: "Register",
  inventory: "Inventory",
  questionnaire: "Questionnaire response",
  overview: "Company overview",
  contract: "Contract",
  report: "Report",
  other: "Other",
};

export interface DocumentView {
  id: string;
  title: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  category: DocumentCategory;
  status: DocumentStatus;
  summary: string | null;
  pageCount: number | null;
  textLength: number;
  error: string | null;
  model: string | null;
  uploadedByName: string;
  uploadedAt: string;
  analysedAt: string | null;
  seeded: boolean;
  recordCount: number;
}

export interface DocumentDetail extends DocumentView {
  text: string;
  records: KnowledgeRecordView[];
}

export interface KnowledgeRecordView {
  id: string;
  category: OrgCategory;
  refId: string | null;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  documentId: string | null;
  documentTitle: string | null;
  anchor: string | null;
  updatedAt: string;
}

export interface KnowledgeStats {
  documents: number;
  analysed: number;
  awaitingAnalysis: number;
  failed: number;
  records: number;
  recordsByCategory: Partial<Record<OrgCategory, number>>;
  connectedSystems: number;
  lastUpdated: string | null;
}

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
  documentId: string | null;
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
  | "run_exported"
  | "document_uploaded"
  | "document_analysed"
  | "document_analysis_failed"
  | "document_deleted"
  | "knowledge_reset";

/** Which engine served an LLM-backed action; never includes the key itself. */
export type EngineSource = "session_key" | "env_key" | "simulated";
