import { z } from "zod";
import {
  baseSystemPrompt,
  truncate,
  type AgentDefinition,
} from "./types";

const itemSchema = z.object({
  question: z.string(),
  answer: z.string(),
  source_note: z.string(),
  confidence: z.enum(["confident", "unsure"]),
  needs_from_analyst: z.string().nullable(),
});

const outputSchema = z.object({ items: z.array(itemSchema) });

type Item = z.infer<typeof itemSchema>;

const SAMPLE_QUESTIONNAIRE = `1. Is your organisation certified against ISO/IEC 27001? Please provide the certificate number, issuer, validity date and scope.
2. Do you hold a SOC 2 Type II report or an ISAE 3402 assurance report? If not, which alternative assurance can you provide?
3. In which country/region is our data hosted and processed, and which sub-processors are involved in delivering the service?
4. How is our data encrypted at rest and in transit, and how are encryption keys managed and rotated?
5. Is multi-factor authentication enforced for all users, including administrators and privileged accounts?
6. What are your incident notification commitments towards us, and how do you support our DORA major ICT-related incident reporting obligations?
7. Describe your backup and disaster recovery arrangements, including RTO/RPO targets and how recovery is tested.
8. What is the coverage limit of your cyber insurance policy, and who is the insurer?`;

export const questionnaireAgent: AgentDefinition = {
  id: "questionnaire",
  name: "Questionnaire Responder",
  tagline: "Draft answers to customer security questionnaires and DORA information requests.",
  description:
    "Paste an inbound questionnaire. Each question gets a drafted answer based on the answer library, policy set and certificate scope — with a source note per answer. Questions the knowledge base cannot answer are flagged, never guessed.",
  icon: "clipboard-list",
  inputFields: [
    {
      name: "questionnaire",
      label: "Questionnaire",
      type: "textarea",
      rows: 12,
      placeholder: "Paste the questions, one per line or numbered…",
    },
  ],
  inputSchema: z.object({ questionnaire: z.string().trim().min(1) }),
  sampleInput: { questionnaire: SAMPLE_QUESTIONNAIRE },
  contextSections: ["profile", "certification", "control", "policy", "qa_pair", "asset"],
  outputSchema,
  buildPrompt(input, orgContext) {
    return {
      system: baseSystemPrompt(
        orgContext,
        `Draft answers to an inbound security questionnaire.
- Split the pasted text into individual questions yourself. Produce exactly one item per question, in order. Copy each question verbatim (including its numbering) into the "question" field. Never merge, reorder or skip questions.
- Answer from the org context only, in the register of a vendor questionnaire response (first-person plural, factual, concise — 2-5 sentences).
- Prefer reusing past questionnaire answers where they fit; otherwise ground the answer in controls, policies or certification scope.
- "source_note" cites what the answer is based on, e.g. 'Past answer — DDQ Dutch insurer' or 'Control AFG-CR-02 — Encryption at rest'.
- If the context does not cover a question: set confidence to "unsure", let the answer state only what is known (or that the knowledge base does not cover it), and set "needs_from_analyst" to what the analyst must provide. Never guess.
- Otherwise set confidence to "confident" and needs_from_analyst to null.`
      ),
      user: `Draft answers for this questionnaire:\n\n<questionnaire>\n${input.questionnaire}\n</questionnaire>`,
    };
  },
  toItems(parsed) {
    return (parsed as z.infer<typeof outputSchema>).items;
  },
  getFlag(item) {
    const i = item as Item;
    return i.confidence === "unsure"
      ? { flagged: true, reason: "Unsure — needs analyst" }
      : { flagged: false, reason: null };
  },
  itemTitle(item) {
    return truncate((item as Item).question.replace(/^\s*\d+[.)]\s*/, ""), 90);
  },
  display(item) {
    const i = item as Item;
    return [
      { kind: "title", value: i.question },
      { kind: "body", label: "Answer", value: i.answer },
      ...(i.needs_from_analyst
        ? [{ kind: "note" as const, label: "Needs from analyst", value: i.needs_from_analyst }]
        : []),
      { kind: "note", label: "Source", value: i.source_note },
    ];
  },
  editableFields: () => [
    { name: "answer", label: "Answer", kind: "textarea", rows: 6 },
    { name: "source_note", label: "Source note", kind: "textarea", rows: 2 },
  ],
  itemSchema,
  inputSummary(input) {
    const questions = input.questionnaire
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean).length;
    return `Questionnaire · ${questions} line${questions === 1 ? "" : "s"}`;
  },
  exportMarkdown(items, run) {
    const lines = [
      `# Questionnaire response draft`,
      ``,
      `_${run.inputSummary} · drafted ${run.createdAt.slice(0, 10)} · approved answers only_`,
      ``,
    ];
    for (const raw of items) {
      const i = raw as Item;
      lines.push(`### ${i.question}`, ``, i.answer, ``, `> Source: ${i.source_note}`, ``);
    }
    return lines.join("\n");
  },
};
