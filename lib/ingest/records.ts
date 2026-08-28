import type { NewRecord } from "@/lib/documents";
import type { DocumentCategory } from "@/lib/types";
import type { Extraction } from "./schema";

// Pure helpers for document analysis (no SDK / db imports), shared by the
// server-only analyser and the smoke test.

export const MAX_PROMPT_CHARS = 150_000;

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

export function buildAnalysisPrompt(opts: {
  orgName: string;
  title: string;
  filename: string;
  category: DocumentCategory;
  text: string;
}): { system: string; user: string } {
  const truncated = opts.text.length > MAX_PROMPT_CHARS;
  const text = opts.text.slice(0, MAX_PROMPT_CHARS);
  return {
    system: `You are a senior GRC analyst building an anchored knowledge base for ${opts.orgName}. You read ONE document and extract the facts a compliance team will later rely on when answering questionnaires, mapping controls to frameworks, assembling audit evidence, reviewing policies and assessing threats.

Hard rules:
- Extract ONLY what the document states. Never infer, complete or embellish. If a field is not stated, use null.
- Every record carries an "anchor": the section number and heading (preferred), question number, or page where the fact appears — so a reviewer can find it.
- Keep wording faithful and concise. Do not paraphrase numbers, dates, product names, SLAs or identifiers.
- Use the category that fits the document: a policy/standard/plan/procedure yields exactly one "policies" record describing itself (name, version, owner, approval date, what it requires) plus org_facts for concrete commitments in it (deadlines, RTO/RPO, retention periods, thresholds). A control register yields one "controls" record per control with its identifier. A questionnaire response yields one "qa_pairs" record per answered question. An inventory yields "assets" records — mark in_use=false only for products the document explicitly lists as not in use. A certificate or company overview yields "certifications" and "org_facts".
- Do not duplicate the same fact across categories.
- "summary" is 2-4 sentences in plain language for an analyst.`,
    user: `Analyse this document.

<document title="${opts.title}" filename="${opts.filename}" declared_category="${opts.category}"${truncated ? ' truncated="true"' : ""}>
${text}
</document>`,
  };
}

/** Convert a validated extraction into knowledge records for the document. */
export function extractionToRecords(documentId: string, ex: Extraction, analysedAt: string): NewRecord[] {
  const out: NewRecord[] = [];
  ex.org_facts.forEach((f, i) =>
    out.push({
      id: `${documentId}:profile:${i}`,
      category: "profile",
      refId: null,
      title: f.topic,
      body: f.statement,
      data: { topic: f.topic, statement: f.statement },
      anchor: f.anchor,
    })
  );
  ex.certifications.forEach((c, i) =>
    out.push({
      id: `${documentId}:certification:${i}`,
      category: "certification",
      refId: null,
      title: c.name,
      body: c.status,
      data: { name: c.name, issuer: c.issuer, scope: c.scope, validUntil: c.valid_until, status: c.status },
      anchor: c.anchor,
    })
  );
  ex.controls.forEach((c, i) => {
    const id = c.id?.trim() || slug(c.name).toUpperCase();
    out.push({
      id: `${documentId}:control:${i}`,
      category: "control",
      refId: id,
      title: `${id} — ${c.name}`,
      body: c.description,
      data: {
        id,
        name: c.name,
        description: c.description,
        owner: c.owner ?? "Unassigned",
        status: c.status,
        lastReview: c.last_review,
      },
      anchor: c.anchor,
    });
  });
  ex.policies.forEach((p, i) => {
    const id = slug(p.name);
    out.push({
      id: `${documentId}:policy:${i}`,
      category: "policy",
      refId: id,
      title: p.version ? `${p.name} v${p.version}` : p.name,
      body: p.summary,
      data: {
        id,
        name: p.name,
        version: p.version ?? "",
        owner: p.owner ?? "Unassigned",
        approvedAt: p.approved_on,
        summary: p.summary,
      },
      anchor: p.anchor,
    });
  });
  ex.qa_pairs.forEach((q, i) => {
    const id = `${documentId}:qa:${i}`;
    out.push({
      id,
      category: "qa_pair",
      refId: id,
      title: q.question,
      body: q.answer,
      data: { id, question: q.question, answer: q.answer, answeredAt: analysedAt },
      anchor: q.anchor,
    });
  });
  ex.assets.forEach((a, i) =>
    out.push({
      id: `${documentId}:asset:${i}`,
      category: "asset",
      refId: null,
      title: a.name,
      body: a.details,
      data: { name: a.name, category: a.category, details: a.details, inUse: a.in_use },
      anchor: a.anchor,
    })
  );
  return out;
}
