import type { Database } from "better-sqlite3";
import { DOCUMENTS } from "./documents";
import { SYSTEM_SNAPSHOTS } from "./connectors";
import { ORG } from "./register";
import type { DocumentSeed, RecordSeed } from "./types";

// Seeds the knowledge base with Lumeo's pre-ingested documents (text +
// hand-authored extraction records) and the connected-system snapshots.
// Uses direct inserts so timestamps can be backdated relative to `now`.

export const SEED_ACTOR = { name: "Elke Van Damme", email: "elke.vandamme@lumeo.be" };

const iso = (now: Date, daysAgo: number) =>
  new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

interface RowOut {
  id: string;
  category: string;
  refId: string | null;
  title: string;
  body: string;
  data: Record<string, unknown>;
  anchor: string;
}

/** Turn a seed record into an org_knowledge row (shared with the smoke test). */
export function recordToRow(doc: DocumentSeed, r: RecordSeed, index: number, now: Date): RowOut {
  switch (r.kind) {
    case "profile":
      return {
        id: `${doc.id}:profile:${index}`,
        category: "profile",
        refId: null,
        title: r.topic,
        body: r.statement,
        data: { topic: r.topic, statement: r.statement },
        anchor: r.anchor,
      };
    case "certification":
      return {
        id: `${doc.id}:certification:${slug(r.name)}`,
        category: "certification",
        refId: null,
        title: r.name,
        body: r.status,
        data: { name: r.name, issuer: r.issuer, scope: r.scope, validUntil: r.validUntil, status: r.status },
        anchor: r.anchor,
      };
    case "asset":
      return {
        id: `${doc.id}:asset:${slug(r.name)}`,
        category: "asset",
        refId: null,
        title: r.name,
        body: r.details,
        data: { name: r.name, category: r.category, details: r.details, inUse: r.inUse },
        anchor: r.anchor,
      };
    case "control":
      return {
        id: `control-${r.id.toLowerCase()}`,
        category: "control",
        refId: r.id,
        title: `${r.id} — ${r.name}`,
        body: r.description,
        data: {
          id: r.id,
          name: r.name,
          description: r.description,
          owner: r.owner,
          status: r.status,
          lastReview: iso(now, r.lastReviewDaysAgo),
        },
        anchor: r.anchor,
      };
    case "policy":
      return {
        id: `policy-${r.id}`,
        category: "policy",
        refId: r.id,
        title: `${r.name} v${r.version}`,
        body: r.summary,
        data: {
          id: r.id,
          name: r.name,
          version: r.version,
          owner: r.owner,
          approvedAt: iso(now, r.approvedDaysAgo),
          summary: r.summary,
        },
        anchor: r.anchor,
      };
    case "qa_pair":
      return {
        id: r.id,
        category: "qa_pair",
        refId: r.id,
        title: r.question,
        body: r.answer,
        data: {
          id: r.id,
          question: r.question,
          answer: r.answer,
          answeredAt: iso(now, doc.uploadedDaysAgo),
        },
        anchor: r.anchor,
      };
  }
}

export function seedKnowledge(db: Database, now: Date): void {
  const insertDoc = db.prepare(
    `INSERT INTO documents (id, title, filename, mime, size_bytes, category, status, text, summary,
       page_count, model, uploaded_by_name, uploaded_by_email, uploaded_at, analysed_at, seeded)
     VALUES (?, ?, ?, ?, ?, ?, 'analysed', ?, ?, ?, 'seeded', ?, ?, ?, ?, 1)`
  );
  const insertRecord = db.prepare(
    `INSERT INTO org_knowledge (id, category, ref_id, title, body, data_json, document_id, anchor, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const meta = db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`);

  db.transaction(() => {
    meta.run("org_name", ORG.name);

    for (const doc of DOCUMENTS) {
      const uploadedAt = iso(now, doc.uploadedDaysAgo);
      // Analysis "took" a couple of minutes after upload.
      const analysedAt = new Date(new Date(uploadedAt).getTime() + 2 * 60 * 1000).toISOString();
      const sizeBytes = Math.round(doc.text.length * (doc.mime === "application/pdf" ? 9.5 : 3.2));
      insertDoc.run(
        doc.id,
        doc.title,
        doc.filename,
        doc.mime,
        sizeBytes,
        doc.category,
        doc.text,
        doc.summary,
        doc.pageCount,
        SEED_ACTOR.name,
        SEED_ACTOR.email,
        uploadedAt,
        analysedAt
      );
      doc.records.forEach((r, i) => {
        const row = recordToRow(doc, r, i, now);
        insertRecord.run(
          row.id,
          row.category,
          row.refId,
          row.title,
          row.body,
          JSON.stringify(row.data),
          doc.id,
          row.anchor,
          analysedAt
        );
      });
    }

    for (const s of SYSTEM_SNAPSHOTS) {
      const entries = s.entries.map((e) => ({
        controls: e.controls,
        description: e.description,
        whatCounts: e.whatCounts,
        collectedAt: iso(now, e.collectedDaysAgo),
        gap: e.gap ?? null,
      }));
      const newest = Math.min(...s.entries.map((e) => e.collectedDaysAgo));
      insertRecord.run(
        `snap-${s.key}`,
        "system_snapshot",
        s.key,
        s.system,
        s.summary,
        JSON.stringify({ key: s.key, system: s.system, summary: s.summary, entries }),
        null,
        null,
        iso(now, newest)
      );
    }
  })();
}
