import { getOrgName, getOrgRows } from "./data";
import { countDocuments } from "./documents";
import { sourceLabel, type SourceRef } from "./source-ref";
import type { OrgCategory } from "./types";

// Typed read access to the knowledge base. Every record (except connected-
// system snapshots) is anchored to the document it was extracted from, so
// both the live Claude prompts and the simulated drafting engine can cite
// "Access Control Policy v2.2, §4" rather than an opaque source.

export type { OrgCategory, SourceRef };
export { sourceLabel };

export interface FactRecord extends SourceRef {
  id: string;
  topic: string;
  statement: string;
}

export interface CertificationRecord extends SourceRef {
  id: string;
  name: string;
  issuer: string;
  scope: string;
  validUntil: string | null;
  status: string;
}

export interface AssetRecord extends SourceRef {
  id: string;
  name: string;
  category: string;
  details: string;
  inUse: boolean;
}

export interface ControlRecord extends SourceRef {
  id: string;
  name: string;
  description: string;
  owner: string;
  status: string;
  lastReview: string | null;
}

export interface PolicyRecord extends SourceRef {
  id: string;
  name: string;
  summary: string;
  version: string;
  owner: string;
  approvedAt: string | null;
}

export interface QaRecord extends SourceRef {
  id: string;
  question: string;
  answer: string;
  /** Human-readable origin, e.g. the questionnaire response document title. */
  source: string;
  answeredAt: string;
}

export interface SnapshotEntryRecord {
  controls: string[];
  description: string;
  whatCounts: string;
  collectedAt: string;
  gap: string | null;
}

export interface SnapshotRecord {
  key: string;
  system: string;
  summary: string;
  entries: SnapshotEntryRecord[];
}

export interface OrgData {
  orgName: string;
  facts: FactRecord[];
  certifications: CertificationRecord[];
  assets: AssetRecord[];
  controls: ControlRecord[];
  policies: PolicyRecord[];
  qaPairs: QaRecord[];
  snapshots: SnapshotRecord[];
  documentCount: number;
}

export function getOrgData(): OrgData {
  const rows = getOrgRows();
  const byCategory = (cat: OrgCategory) => rows.filter((r) => r.category === cat);
  const ref = (r: { documentId: string | null; documentTitle: string | null; anchor: string | null }): SourceRef => ({
    documentId: r.documentId,
    documentTitle: r.documentTitle,
    anchor: r.anchor,
  });

  return {
    orgName: getOrgName(),
    facts: byCategory("profile").map((r) => {
      const d = (r.data ?? {}) as Partial<FactRecord>;
      return { id: r.id, topic: d.topic ?? r.title, statement: d.statement ?? r.body, ...ref(r) };
    }),
    certifications: byCategory("certification").map((r) => {
      const d = (r.data ?? {}) as Partial<CertificationRecord>;
      return {
        id: r.id,
        name: d.name ?? r.title,
        issuer: d.issuer ?? "",
        scope: d.scope ?? "",
        validUntil: d.validUntil ?? null,
        status: d.status ?? r.body,
        ...ref(r),
      };
    }),
    assets: byCategory("asset").map((r) => {
      const d = (r.data ?? {}) as Partial<AssetRecord>;
      return {
        id: r.id,
        name: d.name ?? r.title,
        category: d.category ?? "Other",
        details: d.details ?? r.body,
        inUse: d.inUse ?? true,
        ...ref(r),
      };
    }),
    controls: byCategory("control")
      .map((r) => {
        const d = (r.data ?? {}) as Partial<ControlRecord>;
        return {
          id: d.id ?? r.refId ?? r.id,
          name: d.name ?? r.title,
          description: d.description ?? r.body,
          owner: d.owner ?? "Unassigned",
          status: d.status ?? "unknown",
          lastReview: d.lastReview ?? null,
          ...ref(r),
        };
      })
      .sort((a, b) => a.id.localeCompare(b.id)),
    policies: byCategory("policy").map((r) => {
      const d = (r.data ?? {}) as Partial<PolicyRecord>;
      return {
        id: d.id ?? r.refId ?? r.id,
        name: d.name ?? r.title,
        summary: d.summary ?? r.body,
        version: d.version ?? "",
        owner: d.owner ?? "Unassigned",
        approvedAt: d.approvedAt ?? null,
        ...ref(r),
      };
    }),
    qaPairs: byCategory("qa_pair").map((r) => {
      const d = (r.data ?? {}) as Partial<QaRecord>;
      return {
        id: d.id ?? r.refId ?? r.id,
        question: d.question ?? r.title,
        answer: d.answer ?? r.body,
        source: r.documentTitle ?? d.source ?? "Past questionnaire",
        answeredAt: d.answeredAt ?? r.updatedAt,
        ...ref(r),
      };
    }),
    snapshots: byCategory("system_snapshot").map((r) => r.data as unknown as SnapshotRecord),
    documentCount: countDocuments(),
  };
}

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "n/a");
const src = (r: SourceRef) => ` [source: ${sourceLabel(r)}]`;

/** Render selected knowledge categories as prompt-ready context blocks. */
export function renderOrgContext(categories: OrgCategory[], org: OrgData): string {
  const sections: string[] = [];

  if (categories.includes("profile")) {
    const lines = org.facts.map((f) => `- ${f.topic}: ${f.statement}${src(f)}`);
    sections.push(
      `<section name="organisation_profile">\nOrganisation: ${org.orgName}\n${lines.join("\n")}\n</section>`
    );
  }
  if (categories.includes("certification")) {
    const lines = org.certifications.map(
      (c) =>
        `- ${c.name} (issuer: ${c.issuer}; valid until: ${day(c.validUntil)}): ${c.status}. Scope: ${c.scope}${src(c)}`
    );
    sections.push(`<section name="certifications_and_regulatory_scope">\n${lines.join("\n")}\n</section>`);
  }
  if (categories.includes("asset")) {
    const inUse = org.assets.filter((a) => a.inUse);
    const notInUse = org.assets.filter((a) => !a.inUse);
    const lines = inUse.map((a) => `- ${a.name} [${a.category}]: ${a.details}${src(a)}`);
    const absent = notInUse.map((a) => `- ${a.name}${a.details ? ` — ${a.details}` : ""}${src(a)}`);
    sections.push(
      `<section name="asset_and_technology_stack">\nIn use:\n${lines.join("\n")}\n\nExplicitly NOT in use (verified absent):\n${absent.join("\n") || "- (none recorded)"}\n</section>`
    );
  }
  if (categories.includes("control")) {
    const lines = org.controls.map(
      (c) =>
        `- ${c.id} ${c.name} (owner: ${c.owner}; status: ${c.status}; last review: ${day(c.lastReview)}): ${c.description}${src(c)}`
    );
    sections.push(`<section name="internal_controls">\n${lines.join("\n")}\n</section>`);
  }
  if (categories.includes("policy")) {
    const lines = org.policies.map(
      (p) =>
        `- ${p.name} (v${p.version}, owner: ${p.owner}, approved: ${day(p.approvedAt)}): ${p.summary}${src(p)}`
    );
    sections.push(`<section name="policy_set">\n${lines.join("\n")}\n</section>`);
  }
  if (categories.includes("qa_pair")) {
    const blocks = org.qaPairs.map(
      (q) => `Q: ${q.question}\nA: ${q.answer}\n(answered ${day(q.answeredAt)})${src(q)}`
    );
    sections.push(`<section name="past_questionnaire_answers">\n${blocks.join("\n\n")}\n</section>`);
  }
  if (categories.includes("system_snapshot")) {
    const blocks = org.snapshots.map((s) => {
      const entries = s.entries.map(
        (e) =>
          `  - [${e.controls.join(", ")}] collected ${day(e.collectedAt)}: ${e.description}` +
          (e.gap ? `\n    gap: ${e.gap}` : "")
      );
      return `${s.system} (${s.summary})\n${entries.join("\n")}`;
    });
    sections.push(
      `<section name="connected_system_snapshots">\nCurrent-state evidence available from connected systems (read-only integrations):\n${blocks.join("\n\n")}\n</section>`
    );
  }

  return `<org_context>\n${sections.join("\n\n")}\n</org_context>`;
}
