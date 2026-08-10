import { z } from "zod";
import { baseSystemPrompt, type AgentDefinition, type ItemData } from "./types";

const assessmentSchema = z.object({
  exposure: z.enum(["exposed", "not_exposed", "undetermined"]),
  reasoning: z.string(),
  affected_assets: z.array(z.string()),
  affected_controls: z.array(z.string()),
  source_note: z.string(),
});

const actionSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: z.enum(["p1", "p2", "p3"]),
  related_controls: z.array(z.string()),
});

const outputSchema = z.object({
  assessment: assessmentSchema,
  actions: z.array(actionSchema),
});

const itemSchema = z.discriminatedUnion("kind", [
  assessmentSchema.extend({ kind: z.literal("assessment") }),
  actionSchema.extend({ kind: z.literal("action") }),
]);

type AssessmentItem = z.infer<typeof assessmentSchema> & { kind: "assessment" };
type ActionItem = z.infer<typeof actionSchema> & { kind: "action" };
type Item = AssessmentItem | ActionItem;

const EXPOSURE_TONE = { exposed: "red", not_exposed: "green", undetermined: "amber" } as const;
const EXPOSURE_LABEL = {
  exposed: "Exposed",
  not_exposed: "Not exposed",
  undetermined: "Undetermined",
} as const;
const PRIORITY_TONE = { p1: "red", p2: "amber", p3: "slate" } as const;

const SAMPLE_ADVISORY = `Security advisory AV-2026-0412 (TLP:CLEAR)

A critical vulnerability (CVE-2026-31337, CVSS 9.1) in PostgreSQL 15.x before 15.10 allows authenticated database users to escalate privileges via crafted extension scripts. Active exploitation has been observed in the wild since 4 August.

Affected products:
- PostgreSQL 15.0 through 15.9, all platforms, including managed cloud offerings where extension creation is permitted.
- Citrix NetScaler ADC 14.1 builds before 14.1-25.53 are affected by a related pre-auth issue (see separate advisory AV-2026-0413).

Remediation: upgrade to PostgreSQL 15.10 / 16.6 or later. As an interim mitigation, revoke CREATE EXTENSION from non-administrative roles and review extension creation logs for anomalies.`;

export const threatCheckerAgent: AgentDefinition = {
  id: "threat-checker",
  name: "Threat Checker",
  tagline: "Check an advisory against the actual stack and control posture.",
  description:
    "Paste a threat advisory. You get a plain-language exposure conclusion — exposed, not exposed, or explicitly undetermined — grounded in the asset register, plus the relevant controls and a drafted action plan when something needs to move.",
  icon: "radar",
  inputFields: [
    {
      name: "advisory",
      label: "Threat advisory",
      type: "textarea",
      rows: 12,
      placeholder: "Paste the advisory / threat report…",
    },
  ],
  inputSchema: z.object({ advisory: z.string().trim().min(1) }),
  sampleInput: { advisory: SAMPLE_ADVISORY },
  contextSections: ["profile", "assets", "control", "system_snapshot"],
  outputSchema,
  buildPrompt(input, orgContext) {
    return {
      system: baseSystemPrompt(
        orgContext,
        `Assess whether the organisation is exposed to the pasted threat advisory.
- Extract the affected products/versions from the advisory and compare them ONLY against the asset & technology stack in the context.
- "exposed" requires a concrete match with the stack. "not_exposed" requires that the affected products are verifiably absent (the asset summary lists what is not in use). Anything else is "undetermined" — state explicitly what information is missing; never guess.
- "reasoning" is plain language for an analyst: what the advisory affects, what the org runs, and the conclusion. Mention advisory components the org does NOT run where that helps.
- "affected_assets" lists matched items from the asset register (empty if none). "affected_controls" lists internal control IDs relevant to assessing or responding (e.g. vulnerability management, patching, logging).
- Draft "actions" only when exposed or undetermined: concrete, prioritised (p1 urgent → p3 routine), each tied to related controls. Empty when not exposed.
- "source_note" cites the context sections used.`
      ),
      user: `Check this advisory against our environment:\n\n<advisory>\n${input.advisory}\n</advisory>`,
    };
  },
  toItems(parsed) {
    const p = parsed as z.infer<typeof outputSchema>;
    return [
      { kind: "assessment", ...p.assessment },
      ...p.actions.map((a) => ({ kind: "action", ...a })),
    ] as ItemData[];
  },
  getFlag(item) {
    const i = item as Item;
    if (i.kind === "assessment" && i.exposure === "undetermined") {
      return { flagged: true, reason: "Exposure undetermined — needs analyst" };
    }
    return { flagged: false, reason: null };
  },
  itemTitle(item) {
    const i = item as Item;
    return i.kind === "assessment" ? "Exposure assessment" : i.title;
  },
  display(item) {
    const i = item as Item;
    if (i.kind === "assessment") {
      return [
        { kind: "title", value: "Exposure assessment" },
        {
          kind: "badge",
          label: "Conclusion",
          value: EXPOSURE_LABEL[i.exposure],
          tone: EXPOSURE_TONE[i.exposure],
        },
        { kind: "body", value: i.reasoning },
        ...(i.affected_assets.length > 0
          ? [{ kind: "list" as const, label: "Affected assets", value: i.affected_assets }]
          : []),
        ...(i.affected_controls.length > 0
          ? [{ kind: "list" as const, label: "Relevant controls", value: i.affected_controls }]
          : []),
        { kind: "note", label: "Source", value: i.source_note },
      ];
    }
    return [
      { kind: "title", value: i.title },
      { kind: "badge", label: "Priority", value: i.priority.toUpperCase(), tone: PRIORITY_TONE[i.priority] },
      { kind: "body", value: i.description },
      ...(i.related_controls.length > 0
        ? [{ kind: "list" as const, label: "Related controls", value: i.related_controls }]
        : []),
    ];
  },
  editableFields: (item) =>
    (item as Item).kind === "assessment"
      ? [{ name: "reasoning", label: "Reasoning", kind: "textarea", rows: 5 }]
      : [
          { name: "description", label: "Action", kind: "textarea", rows: 4 },
          { name: "priority", label: "Priority", kind: "select", options: ["p1", "p2", "p3"] },
        ],
  itemSchema,
  inputSummary(input) {
    const first =
      input.advisory
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.length > 8) ?? "Advisory";
    return `Threat check · ${first.length > 60 ? `${first.slice(0, 59)}…` : first}`;
  },
  exportMarkdown(items, run) {
    const assessment = items.find((i) => (i as Item).kind === "assessment") as
      | AssessmentItem
      | undefined;
    const actions = items.filter((i) => (i as Item).kind === "action") as ActionItem[];
    const lines = [
      `# Threat exposure assessment`,
      ``,
      `_${run.inputSummary} · drafted ${run.createdAt.slice(0, 10)} · approved items only_`,
      ``,
    ];
    if (assessment) {
      lines.push(
        `**Conclusion: ${EXPOSURE_LABEL[assessment.exposure]}**`,
        ``,
        assessment.reasoning,
        ``
      );
      if (assessment.affected_assets.length > 0) {
        lines.push(`**Affected assets:** ${assessment.affected_assets.join("; ")}`, ``);
      }
      if (assessment.affected_controls.length > 0) {
        lines.push(`**Relevant controls:** ${assessment.affected_controls.join(", ")}`, ``);
      }
      lines.push(`> Source: ${assessment.source_note}`, ``);
    }
    if (actions.length > 0) {
      lines.push(`## Actions`, ``);
      for (const a of actions) {
        lines.push(
          `- [ ] **[${a.priority.toUpperCase()}] ${a.title}** — ${a.description}${
            a.related_controls.length > 0 ? ` _(controls: ${a.related_controls.join(", ")})_` : ""
          }`
        );
      }
    }
    return lines.join("\n");
  },
};
