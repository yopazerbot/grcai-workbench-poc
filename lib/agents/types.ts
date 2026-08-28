import type { z } from "zod";
import type { AgentId, OrgCategory } from "@/lib/types";

// The contract every agent plugs into. Agent modules are pure TypeScript +
// Zod (no db / SDK imports), so both server routes and client components can
// import them.

export interface InputField {
  name: string;
  label: string;
  type: "textarea" | "text" | "select";
  placeholder?: string;
  rows?: number;
  options?: Array<{ value: string; label: string }>;
}

export type DisplayKind =
  | "title"
  | "body"
  | "mono"
  | "badge"
  | "diff-old"
  | "diff-new"
  | "list"
  | "note";

export type BadgeTone = "slate" | "teal" | "amber" | "green" | "red" | "blue";

export interface DisplayRow {
  kind: DisplayKind;
  value: string | string[];
  label?: string;
  tone?: BadgeTone;
}

export interface EditableField {
  name: string;
  label: string;
  kind: "textarea" | "select";
  rows?: number;
  options?: string[];
}

export type ItemData = Record<string, unknown>;

export type AgentIconName =
  | "clipboard-list"
  | "folder-search"
  | "table"
  | "file-diff"
  | "radar";

export interface AgentDefinition {
  id: AgentId;
  name: string;
  tagline: string;
  description: string;
  icon: AgentIconName;
  inputFields: InputField[];
  inputSchema: z.ZodType<Record<string, string>>;
  sampleInput: Record<string, string>;
  /** Org knowledge categories injected into the prompt / read by the mock engine. */
  contextSections: OrgCategory[];
  /** Schema for the full model response (object root). */
  outputSchema: z.ZodTypeAny;
  buildPrompt(
    input: Record<string, string>,
    orgContext: string
  ): { system: string; user: string };
  /** Response → ordered reviewable items. */
  toItems(parsed: unknown): ItemData[];
  getFlag(item: ItemData): { flagged: boolean; reason: string | null };
  itemTitle(item: ItemData): string;
  display(item: ItemData): DisplayRow[];
  /** Top-level fields the inline editor exposes for a given item. */
  editableFields(item: ItemData): EditableField[];
  /** Validates an item after an analyst edit. */
  itemSchema: z.ZodTypeAny;
  inputSummary(input: Record<string, string>): string;
  exportMarkdown(
    items: ItemData[],
    run: { inputSummary: string; createdAt: string }
  ): string;
}

/** Shared system-prompt frame: role, hard rules, org context, agent task. */
export function baseSystemPrompt(orgContext: string, taskSection: string): string {
  return `You are a senior GRC analyst assistant at the organisation described in <org_context>. You draft work products for review by a human analyst — you never make final decisions.

Hard rules:
- Use ONLY the information in <org_context>. Never invent facts, evidence, systems, dates or timestamps.
- When the context does not cover something, say so explicitly through the schema's uncertainty field — never guess.
- Every fact in the context carries a [source: …] tag naming the document and section it was extracted from. Every item you produce must carry a source note citing those sources — document title plus section (e.g. "Access Control Policy v2.2, §3 Authentication"), control ID, past-answer document and question, or connected system — so an analyst can verify it.
- You are read-only towards source material: describe changes, never claim to have made them.

${orgContext}

# Task
${taskSection}`;
}

export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}
