import { z } from "zod";
import {
  ACCESS_CONTROL_POLICY_CHANGE_NOTE,
  ACCESS_CONTROL_POLICY_TEXT,
} from "@/lib/seed/lumeo/access-control-policy";
import { baseSystemPrompt, truncate, type AgentDefinition } from "./types";

const itemSchema = z.object({
  section: z.string(),
  current_text: z.string(),
  proposed_text: z.string(),
  reason: z.string(),
  confidence: z.enum(["confident", "uncertain"]),
  source_note: z.string(),
});

const outputSchema = z.object({ items: z.array(itemSchema) });

type Item = z.infer<typeof itemSchema>;

const SAMPLE_POLICY = ACCESS_CONTROL_POLICY_TEXT;
const SAMPLE_CHANGES = ACCESS_CONTROL_POLICY_CHANGE_NOTE;

export const policyReviewerAgent: AgentDefinition = {
  id: "policy-reviewer",
  name: "Policy Reviewer",
  tagline: "Draft the review delta — only what needs to change, with reasons.",
  description:
    "Paste an existing policy plus a note of what changed since the last review. The draft shows only the proposed changes — current text next to proposed text, each with a reason. You accept or reject every change individually; the source policy is never modified.",
  icon: "file-diff",
  inputFields: [
    {
      name: "policy",
      label: "Current policy",
      type: "textarea",
      rows: 12,
      placeholder: "Paste the policy text…",
    },
    {
      name: "changes",
      label: "What changed since the last review",
      type: "textarea",
      rows: 4,
      placeholder: "Business, organisational or regulatory changes…",
    },
  ],
  inputSchema: z.object({
    policy: z.string().trim().min(1),
    changes: z.string().trim().min(1),
  }),
  sampleInput: { policy: SAMPLE_POLICY, changes: SAMPLE_CHANGES },
  contextSections: ["profile", "certification", "control", "policy"],
  outputSchema,
  buildPrompt(input, orgContext) {
    return {
      system: baseSystemPrompt(
        orgContext,
        `Review a policy against a change note and draft the delta — only what needs to change.
- One item per discrete proposed change. "section" names the heading or clause reference from the pasted policy.
- "current_text" must be a VERBATIM excerpt of the pasted policy (the sentences being changed). Never paraphrase it and never rewrite the whole policy. For an addition with no existing text, use "(not currently covered)".
- "proposed_text" is the replacement (or new) wording, consistent with the org context (controls, other policies, regulatory scope).
- "reason" ties the change to the change note or org context in 1-2 sentences.
- When you cannot tell from the context whether a change is needed, or where it belongs: still raise the item but set confidence to "uncertain" — never silently decide.
- If a point in the change note maps to no section, raise an "uncertain" item proposing where it could be added.
- "source_note" cites what the proposal is grounded in (change note point, control ID, policy).`
      ),
      user: `Review this policy against the change note.\n\n<policy>\n${input.policy}\n</policy>\n\n<change_note>\n${input.changes}\n</change_note>`,
    };
  },
  toItems(parsed) {
    return (parsed as z.infer<typeof outputSchema>).items;
  },
  getFlag(item) {
    const i = item as Item;
    return i.confidence === "uncertain"
      ? { flagged: true, reason: "Uncertain — needs analyst" }
      : { flagged: false, reason: null };
  },
  itemTitle(item) {
    return truncate((item as Item).section, 90);
  },
  display(item) {
    const i = item as Item;
    return [
      { kind: "title", value: i.section },
      { kind: "diff-old", label: "Current", value: i.current_text },
      { kind: "diff-new", label: "Proposed", value: i.proposed_text },
      { kind: "body", label: "Reason", value: i.reason },
      { kind: "note", label: "Source", value: i.source_note },
    ];
  },
  editableFields: () => [
    { name: "proposed_text", label: "Proposed text", kind: "textarea", rows: 5 },
    { name: "reason", label: "Reason", kind: "textarea", rows: 2 },
  ],
  itemSchema,
  inputSummary(input) {
    const firstLine = input.policy.split("\n").map((l) => l.trim()).find(Boolean) ?? "Policy";
    return `Policy review · ${truncate(firstLine, 60)}`;
  },
  exportMarkdown(items, run) {
    const lines = [
      `# Policy review — accepted changes`,
      ``,
      `_${run.inputSummary} · drafted ${run.createdAt.slice(0, 10)} · approved changes only_`,
      ``,
    ];
    items.forEach((raw, idx) => {
      const i = raw as Item;
      lines.push(
        `## ${idx + 1}. ${i.section}`,
        ``,
        `**Current**`,
        ``,
        `> ${i.current_text.replace(/\n/g, "\n> ")}`,
        ``,
        `**Proposed**`,
        ``,
        `> ${i.proposed_text.replace(/\n/g, "\n> ")}`,
        ``,
        `**Reason:** ${i.reason}`,
        ``
      );
    });
    return lines.join("\n");
  },
};
