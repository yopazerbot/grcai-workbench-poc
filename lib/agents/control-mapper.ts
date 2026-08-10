import { z } from "zod";
import { FRAMEWORKS, type Framework } from "@/lib/frameworks";
import { baseSystemPrompt, type AgentDefinition } from "./types";

const itemSchema = z.object({
  requirement_id: z.string(),
  requirement_title: z.string(),
  covering_controls: z.array(z.string()),
  coverage: z.enum(["full", "partial", "none"]),
  rationale: z.string(),
  gap_note: z.string().nullable(),
  source_note: z.string(),
});

const outputSchema = z.object({ items: z.array(itemSchema) });

type Item = z.infer<typeof itemSchema>;

const COVERAGE_TONE = { full: "green", partial: "amber", none: "red" } as const;

export function frameworkFromInput(input: Record<string, string>): Framework {
  return FRAMEWORKS[(input.framework as Framework["key"]) ?? "iso27001"] ?? FRAMEWORKS.iso27001;
}

function renderCatalog(framework: Framework): string {
  const lines = framework.requirements.map(
    (r) => `- ${r.id} ${r.title}: ${r.summary}`
  );
  return `<framework_requirements name="${framework.name}">\n${lines.join("\n")}\n</framework_requirements>`;
}

export const controlMapperAgent: AgentDefinition = {
  id: "control-mapper",
  name: "Control Mapper",
  tagline: "Map the control set to a framework and surface the gaps.",
  description:
    "Pick a target framework. Every requirement gets a mapping row — which internal controls cover it, full or partial, with a rationale. Requirements with no covering control become an explicit gap list you confirm or correct.",
  icon: "table",
  inputFields: [
    {
      name: "framework",
      label: "Target framework",
      type: "select",
      options: [
        { value: "iso27001", label: "ISO/IEC 27001:2022 (Annex A)" },
        { value: "dora", label: "DORA" },
        { value: "nis2", label: "NIS2 (Art. 21)" },
      ],
    },
  ],
  inputSchema: z.object({ framework: z.enum(["iso27001", "dora", "nis2"]) }),
  sampleInput: { framework: "nis2" },
  contextSections: ["profile", "certification", "control"],
  outputSchema,
  buildPrompt(input, orgContext) {
    const framework = frameworkFromInput(input);
    return {
      system: baseSystemPrompt(
        `${orgContext}\n\n${renderCatalog(framework)}`,
        `Map the internal control register to ${framework.name}.
- Produce exactly one item per requirement in <framework_requirements>, in catalog order, copying requirement_id and requirement_title verbatim.
- "covering_controls" lists internal control IDs from the register (may be empty). Never invent control IDs.
- Judge "coverage" strictly: "full" only when the control set clearly satisfies the requirement's intent; "partial" when scope, frequency or formalisation falls short; "none" when no control addresses it.
- "rationale" cites both sides in 1-3 sentences: what the requirement asks and what the mapped controls do (or lack).
- For "partial" and "none", "gap_note" states what is missing and a suggested remediation direction. Null for "full".
- "source_note" is "Internal control register + ${framework.name}".`
      ),
      user: `Produce the coverage mapping for ${framework.name}.`,
    };
  },
  toItems(parsed) {
    return (parsed as z.infer<typeof outputSchema>).items;
  },
  getFlag(item) {
    const i = item as Item;
    if (i.coverage === "full") return { flagged: false, reason: null };
    return {
      flagged: true,
      reason: i.coverage === "none" ? "Gap — no covering control" : "Partial coverage",
    };
  },
  itemTitle(item) {
    const i = item as Item;
    return `${i.requirement_id} — ${i.requirement_title}`;
  },
  display(item) {
    const i = item as Item;
    return [
      { kind: "title", value: `${i.requirement_id} — ${i.requirement_title}` },
      { kind: "badge", label: "Coverage", value: i.coverage, tone: COVERAGE_TONE[i.coverage] },
      {
        kind: "list",
        label: "Covering controls",
        value: i.covering_controls.length > 0 ? i.covering_controls : ["None"],
      },
      { kind: "body", label: "Rationale", value: i.rationale },
      ...(i.gap_note ? [{ kind: "body" as const, label: "Gap", value: i.gap_note }] : []),
      { kind: "note", label: "Source", value: i.source_note },
    ];
  },
  editableFields: () => [
    { name: "coverage", label: "Coverage", kind: "select", options: ["full", "partial", "none"] },
    { name: "rationale", label: "Rationale", kind: "textarea", rows: 3 },
    { name: "gap_note", label: "Gap note", kind: "textarea", rows: 2 },
  ],
  itemSchema,
  inputSummary(input) {
    return `Coverage matrix · ${frameworkFromInput(input).name.split(" (")[0]}`;
  },
  exportMarkdown(items, run) {
    const lines = [
      `# Coverage matrix`,
      ``,
      `_${run.inputSummary} · drafted ${run.createdAt.slice(0, 10)} · approved rows only_`,
      ``,
      `| Requirement | Coverage | Controls | Rationale |`,
      `| --- | --- | --- | --- |`,
    ];
    const clean = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
    for (const raw of items) {
      const i = raw as Item;
      lines.push(
        `| ${i.requirement_id} ${clean(i.requirement_title)} | ${i.coverage} | ${
          i.covering_controls.join(", ") || "—"
        } | ${clean(i.rationale)} |`
      );
    }
    const gaps = items.filter((r) => (r as Item).coverage !== "full") as Item[];
    if (gaps.length > 0) {
      lines.push(``, `## Gap list`, ``);
      for (const g of gaps) {
        lines.push(`- **${g.requirement_id} ${g.requirement_title}** (${g.coverage}): ${g.gap_note ?? g.rationale}`);
      }
    }
    return lines.join("\n");
  },
};
