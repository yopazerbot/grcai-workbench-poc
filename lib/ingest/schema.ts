import { z } from "zod";

// Structured-output schema for AI document analysis. Every extracted record
// carries an `anchor` (section heading / number / page) so the knowledge base
// can cite where in the document a fact came from.

const anchor = z
  .string()
  .describe("Where in the document this comes from: section number and heading, or page (e.g. '§3 Authentication', 'Q4', 'p. 2').");

export const extractionSchema = z.object({
  title: z
    .string()
    .describe("The document's own title including version if stated, e.g. 'Access Control Policy v2.2'."),
  document_type: z.enum([
    "policy",
    "standard",
    "plan",
    "procedure",
    "certificate",
    "register",
    "inventory",
    "questionnaire",
    "overview",
    "contract",
    "report",
    "other",
  ]),
  summary: z.string().describe("2-4 sentences: what the document is, who owns it, what it establishes."),
  org_facts: z
    .array(
      z.object({
        topic: z.string().describe("Short label, e.g. 'Headcount', 'Hosting region', 'NIS2 reporting deadlines'."),
        statement: z.string().describe("The fact as stated, one or two sentences."),
        anchor,
      })
    )
    .describe("Notable organisational facts not captured by the other categories (0-15)."),
  certifications: z.array(
    z.object({
      name: z.string(),
      issuer: z.string(),
      scope: z.string(),
      valid_until: z.string().nullable().describe("ISO date if stated, else null."),
      status: z.string().describe("Certified / in progress / registered / planned … with key details."),
      anchor,
    })
  ),
  controls: z.array(
    z.object({
      id: z.string().nullable().describe("The control identifier if the document assigns one (e.g. 'LUM-AC-01'), else null."),
      name: z.string(),
      description: z.string().describe("What the control does, faithfully condensed (≤ 80 words)."),
      owner: z.string().nullable(),
      status: z.enum(["operating", "in_remediation", "planned", "unknown"]),
      last_review: z.string().nullable().describe("ISO date if stated, else null."),
      anchor,
    })
  ),
  policies: z
    .array(
      z.object({
        name: z.string(),
        version: z.string().nullable(),
        owner: z.string().nullable(),
        approved_on: z.string().nullable().describe("ISO date if stated, else null."),
        summary: z.string().describe("What the policy requires, condensed (≤ 80 words)."),
        anchor,
      })
    )
    .describe("If the document IS a policy/standard/plan/procedure, exactly one record describing it. Otherwise policies it defines or references with substance."),
  qa_pairs: z
    .array(z.object({ question: z.string(), answer: z.string(), anchor }))
    .describe("For questionnaire responses: one record per answered question, verbatim."),
  assets: z
    .array(
      z.object({
        name: z.string(),
        category: z.string().describe("e.g. 'Identity & endpoints', 'Cloud platform', 'Corporate SaaS', 'Not in use'."),
        details: z.string(),
        in_use: z.boolean().describe("false ONLY when the document explicitly states the product is not in use."),
        anchor,
      })
    )
    .describe("For inventories / architecture descriptions: one record per system, product or platform."),
});

export type Extraction = z.infer<typeof extractionSchema>;
