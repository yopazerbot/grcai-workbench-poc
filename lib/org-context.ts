import { getOrgRows } from "./data";
import type { OrgCategory } from "./types";

// Typed read access to the seeded org knowledge base. Both the live Claude
// prompts and the simulated drafting engine consume the same DB rows, so the
// two paths can never disagree about what the organisation looks like.

export type { OrgCategory };

export interface ControlRecord {
  id: string;
  name: string;
  description: string;
  owner: string;
  status: string;
  lastReview: string;
}

export interface PolicyRecord {
  id: string;
  name: string;
  summary: string;
  version: string;
  owner: string;
  approvedAt: string;
}

export interface QaRecord {
  id: string;
  question: string;
  answer: string;
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
  profile: string;
  certification: string;
  assets: string;
  controls: ControlRecord[];
  policies: PolicyRecord[];
  qaPairs: QaRecord[];
  snapshots: SnapshotRecord[];
}

export function getOrgData(): OrgData {
  const rows = getOrgRows();
  const byCategory = (cat: OrgCategory) => rows.filter((r) => r.category === cat);

  const profileRow = byCategory("profile")[0];
  const profileData = (profileRow?.data ?? {}) as { orgName?: string };

  return {
    orgName: profileData.orgName ?? "the organisation",
    profile: profileRow?.body ?? "",
    certification: byCategory("certification")[0]?.body ?? "",
    assets: byCategory("assets")[0]?.body ?? "",
    controls: byCategory("control")
      .map((r) => r.data as ControlRecord)
      .sort((a, b) => a.id.localeCompare(b.id)),
    policies: byCategory("policy").map((r) => r.data as PolicyRecord),
    qaPairs: byCategory("qa_pair").map((r) => {
      const d = r.data as QaRecord & { answeredAt: string };
      return { id: d.id, question: d.question, answer: d.answer, source: d.source, answeredAt: d.answeredAt };
    }),
    snapshots: byCategory("system_snapshot").map((r) => r.data as SnapshotRecord),
  };
}

const day = (isoDate: string) => isoDate.slice(0, 10);

/** Render selected knowledge categories as prompt-ready context blocks. */
export function renderOrgContext(categories: OrgCategory[], org: OrgData): string {
  const sections: string[] = [];

  if (categories.includes("profile")) {
    sections.push(`<section name="organisation_profile">\n${org.profile}\n</section>`);
  }
  if (categories.includes("certification")) {
    sections.push(`<section name="certifications_and_regulatory_scope">\n${org.certification}\n</section>`);
  }
  if (categories.includes("assets")) {
    sections.push(`<section name="asset_and_technology_stack">\n${org.assets}\n</section>`);
  }
  if (categories.includes("control")) {
    const lines = org.controls.map(
      (c) =>
        `- ${c.id} ${c.name} (owner: ${c.owner}; status: ${c.status}; last review: ${day(c.lastReview)}): ${c.description}`
    );
    sections.push(`<section name="internal_controls">\n${lines.join("\n")}\n</section>`);
  }
  if (categories.includes("policy")) {
    const lines = org.policies.map(
      (p) => `- ${p.name} (v${p.version}, owner: ${p.owner}, approved: ${day(p.approvedAt)}): ${p.summary}`
    );
    sections.push(`<section name="policy_set">\n${lines.join("\n")}\n</section>`);
  }
  if (categories.includes("qa_pair")) {
    const blocks = org.qaPairs.map(
      (q) => `Q: ${q.question}\nA: ${q.answer}\n(source: ${q.source}, ${day(q.answeredAt)})`
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
      `<section name="connected_system_snapshots">\nCurrent-state evidence available from connected systems (read-only):\n${blocks.join("\n\n")}\n</section>`
    );
  }

  return `<org_context>\n${sections.join("\n\n")}\n</org_context>`;
}
