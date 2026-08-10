import { z } from "zod";
import {
  baseSystemPrompt,
  type AgentDefinition,
} from "./types";

const evidenceEntrySchema = z.object({
  description: z.string(),
  source_system: z.string(),
  collected_at: z.string(),
  what_counts_note: z.string(),
});

const itemSchema = z.object({
  control_id: z.string(),
  control_name: z.string(),
  status: z.enum(["complete", "partial", "stale", "missing"]),
  evidence: z.array(evidenceEntrySchema),
  gap_note: z.string().nullable(),
  source_note: z.string(),
});

const outputSchema = z.object({ items: z.array(itemSchema) });

type Item = z.infer<typeof itemSchema>;

const STATUS_TONE = {
  complete: "green",
  partial: "amber",
  stale: "amber",
  missing: "red",
} as const;

export const evidenceAgent: AgentDefinition = {
  id: "evidence",
  name: "Evidence Collector",
  tagline: "Assemble live audit evidence per control from connected systems.",
  description:
    "Name the controls to evidence. Each control gets an evidence pack pulled from connected-system snapshots — time-stamped items with a note on what counts as evidence. Missing, stale or partial evidence is flagged before an auditor ever sees it.",
  icon: "folder-search",
  inputFields: [
    {
      name: "controls",
      label: "Controls to evidence",
      type: "textarea",
      rows: 5,
      placeholder: "Control IDs or names, one per line…",
    },
  ],
  inputSchema: z.object({ controls: z.string().trim().min(1) }),
  sampleInput: { controls: "AFG-AC-02\nAFG-BC-02\nAFG-TP-01" },
  contextSections: ["profile", "control", "system_snapshot"],
  outputSchema,
  buildPrompt(input, orgContext) {
    const today = new Date().toISOString().slice(0, 10);
    return {
      system: baseSystemPrompt(
        orgContext,
        `Assemble an audit evidence pack per requested control. Today's date is ${today}.
- Resolve each requested line against the internal control register (by ID or name). One item per requested control, in the order requested. A control that does not exist in the register gets status "missing" with a gap_note saying it is not in the register.
- Evidence comes EXCLUSIVELY from the connected-system snapshots in the context. Copy each entry's description, source system and collection date exactly — never fabricate evidence or timestamps.
- "what_counts_note" explains what that artefact evidences for this control (use the snapshot's own note).
- Status rules: "missing" when no snapshot covers the control; "stale" when any relevant evidence is older than 90 days; "partial" when evidence exists but a snapshot records a gap or shortfall; otherwise "complete".
- "gap_note" states precisely what is missing, stale or short — including the recorded gap text and evidence age where relevant. Null when complete.
- "source_note" names the systems the evidence came from, or states that no connected system covers the control.`
      ),
      user: `Collect evidence for these controls:\n\n<controls>\n${input.controls}\n</controls>`,
    };
  },
  toItems(parsed) {
    return (parsed as z.infer<typeof outputSchema>).items;
  },
  getFlag(item) {
    const i = item as Item;
    if (i.status === "complete") return { flagged: false, reason: null };
    const reason =
      i.status === "missing"
        ? "Evidence missing"
        : i.status === "stale"
          ? "Evidence stale"
          : "Evidence partial";
    return { flagged: true, reason };
  },
  itemTitle(item) {
    const i = item as Item;
    return `${i.control_id} — ${i.control_name}`;
  },
  display(item) {
    const i = item as Item;
    return [
      { kind: "title", value: `${i.control_id} — ${i.control_name}` },
      { kind: "badge", label: "Evidence status", value: i.status, tone: STATUS_TONE[i.status] },
      ...(i.evidence.length > 0
        ? [
            {
              kind: "list" as const,
              label: "Evidence",
              value: i.evidence.map(
                (e) =>
                  `${e.source_system} · ${e.collected_at.slice(0, 10)} — ${e.description}`
              ),
            },
            {
              kind: "note" as const,
              label: "What counts",
              value: [...new Set(i.evidence.map((e) => e.what_counts_note))].join(" "),
            },
          ]
        : []),
      ...(i.gap_note ? [{ kind: "body" as const, label: "Gap", value: i.gap_note }] : []),
      { kind: "note", label: "Source", value: i.source_note },
    ];
  },
  editableFields: () => [{ name: "gap_note", label: "Gap note", kind: "textarea", rows: 3 }],
  itemSchema: itemSchema.extend({ gap_note: z.string().nullable().or(z.string()) }),
  inputSummary(input) {
    const n = input.controls
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean).length;
    return `Evidence pack · ${n} control${n === 1 ? "" : "s"}`;
  },
  exportMarkdown(items, run) {
    const lines = [
      `# Audit evidence pack`,
      ``,
      `_${run.inputSummary} · drafted ${run.createdAt.slice(0, 10)} · approved packs only_`,
      ``,
    ];
    for (const raw of items) {
      const i = raw as Item;
      lines.push(`## ${i.control_id} — ${i.control_name}`, ``, `**Status:** ${i.status}`, ``);
      if (i.evidence.length > 0) {
        for (const e of i.evidence) {
          lines.push(
            `- **${e.source_system}** (${e.collected_at.slice(0, 10)}): ${e.description}`,
            `  - _What counts:_ ${e.what_counts_note}`
          );
        }
        lines.push(``);
      }
      if (i.gap_note) lines.push(`**Gap:** ${i.gap_note}`, ``);
      lines.push(`> Source: ${i.source_note}`, ``);
    }
    return lines.join("\n");
  },
};
