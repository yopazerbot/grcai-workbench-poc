import type { DocumentCategory } from "@/lib/types";

// Shape of a pre-ingested demo document: the text an upload would have
// produced, plus the knowledge records the AI analysis would have extracted
// from it (hand-authored here so the demo is deterministic and high quality).
// Day-offsets are materialised relative to "now" at seed time.

export type RecordSeed =
  | { kind: "profile"; topic: string; statement: string; anchor: string }
  | {
      kind: "certification";
      name: string;
      issuer: string;
      scope: string;
      validUntil: string | null;
      status: string;
      anchor: string;
    }
  | {
      kind: "asset";
      name: string;
      category: string;
      details: string;
      inUse: boolean;
      anchor: string;
    }
  | {
      kind: "control";
      id: string;
      name: string;
      description: string;
      owner: string;
      status: "operating" | "in_remediation";
      lastReviewDaysAgo: number;
      anchor: string;
    }
  | {
      kind: "policy";
      id: string;
      name: string;
      version: string;
      owner: string;
      approvedDaysAgo: number;
      summary: string;
      anchor: string;
    }
  | { kind: "qa_pair"; id: string; question: string; answer: string; anchor: string };

export interface DocumentSeed {
  /** Stable id, e.g. "doc-access-control". */
  id: string;
  title: string;
  filename: string;
  mime: string;
  category: DocumentCategory;
  uploadedDaysAgo: number;
  pageCount: number;
  /** The AI summary shown on the document card (2-4 sentences). */
  summary: string;
  /** Full extracted text (Markdown). */
  text: string;
  records: RecordSeed[];
}
