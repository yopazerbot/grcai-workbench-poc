import { getDb } from "./db";
import type {
  Actor,
  DocumentCategory,
  DocumentDetail,
  DocumentStatus,
  DocumentView,
  KnowledgeRecordView,
  KnowledgeStats,
  OrgCategory,
} from "./types";

// Data access for the document knowledge base: uploaded/seeded documents and
// the knowledge records extracted from them.

interface DocumentRow {
  id: string;
  title: string;
  filename: string;
  mime: string;
  size_bytes: number;
  category: string;
  status: string;
  text: string;
  summary: string | null;
  page_count: number | null;
  error: string | null;
  model: string | null;
  uploaded_by_name: string;
  uploaded_by_email: string;
  uploaded_at: string;
  analysed_at: string | null;
  seeded: number;
  record_count: number | null;
  text_length: number | null;
}

interface RecordRow {
  id: string;
  category: string;
  ref_id: string | null;
  title: string;
  body: string;
  data_json: string | null;
  document_id: string | null;
  anchor: string | null;
  updated_at: string;
  document_title: string | null;
}

const DOC_SELECT = `
  SELECT d.id, d.title, d.filename, d.mime, d.size_bytes, d.category, d.status, d.summary,
         d.page_count, d.error, d.model, d.uploaded_by_name, d.uploaded_by_email,
         d.uploaded_at, d.analysed_at, d.seeded, length(d.text) AS text_length,
         (SELECT COUNT(*) FROM org_knowledge k WHERE k.document_id = d.id) AS record_count
  FROM documents d`;

function mapDocument(row: DocumentRow): DocumentView {
  return {
    id: row.id,
    title: row.title,
    filename: row.filename,
    mime: row.mime,
    sizeBytes: row.size_bytes,
    category: row.category as DocumentCategory,
    status: row.status as DocumentStatus,
    summary: row.summary,
    pageCount: row.page_count,
    textLength: row.text_length ?? 0,
    error: row.error,
    model: row.model,
    uploadedByName: row.uploaded_by_name,
    uploadedAt: row.uploaded_at,
    analysedAt: row.analysed_at,
    seeded: row.seeded === 1,
    recordCount: row.record_count ?? 0,
  };
}

export function mapRecord(row: RecordRow): KnowledgeRecordView {
  return {
    id: row.id,
    category: row.category as OrgCategory,
    refId: row.ref_id,
    title: row.title,
    body: row.body,
    data: row.data_json ? (JSON.parse(row.data_json) as Record<string, unknown>) : null,
    documentId: row.document_id,
    documentTitle: row.document_title,
    anchor: row.anchor,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Documents

export function createDocument(opts: {
  id: string;
  title: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  category: DocumentCategory;
  status: DocumentStatus;
  text: string;
  pageCount: number | null;
  actor: Actor;
  uploadedAt?: string;
  seeded?: boolean;
  summary?: string | null;
  analysedAt?: string | null;
  model?: string | null;
}): void {
  getDb()
    .prepare(
      `INSERT INTO documents (id, title, filename, mime, size_bytes, category, status, text, summary,
         page_count, model, uploaded_by_name, uploaded_by_email, uploaded_at, analysed_at, seeded)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      opts.id,
      opts.title,
      opts.filename,
      opts.mime,
      opts.sizeBytes,
      opts.category,
      opts.status,
      opts.text,
      opts.summary ?? null,
      opts.pageCount,
      opts.model ?? null,
      opts.actor.name,
      opts.actor.email,
      opts.uploadedAt ?? new Date().toISOString(),
      opts.analysedAt ?? null,
      opts.seeded ? 1 : 0
    );
}

export function listDocuments(): DocumentView[] {
  const rows = getDb()
    .prepare(`${DOC_SELECT} ORDER BY d.uploaded_at DESC`)
    .all() as DocumentRow[];
  return rows.map(mapDocument);
}

export function getDocumentView(id: string): DocumentView | null {
  const row = getDb().prepare(`${DOC_SELECT} WHERE d.id = ?`).get(id) as DocumentRow | undefined;
  return row ? mapDocument(row) : null;
}

export function getDocumentText(id: string): string | null {
  const row = getDb().prepare(`SELECT text FROM documents WHERE id = ?`).get(id) as
    | { text: string }
    | undefined;
  return row?.text ?? null;
}

export function getDocumentDetail(id: string): DocumentDetail | null {
  const view = getDocumentView(id);
  if (!view) return null;
  return {
    ...view,
    text: getDocumentText(id) ?? "",
    records: listRecords({ documentId: id }),
  };
}

export function countDocuments(): number {
  return (getDb().prepare(`SELECT COUNT(*) AS c FROM documents`).get() as { c: number }).c;
}

export function setDocumentStatus(
  id: string,
  status: DocumentStatus,
  extra: {
    error?: string | null;
    summary?: string | null;
    model?: string | null;
    analysedAt?: string | null;
    title?: string;
    category?: DocumentCategory;
  } = {}
): void {
  const sets = ["status = ?"];
  const params: unknown[] = [status];
  if (extra.title) {
    sets.push("title = ?");
    params.push(extra.title);
  }
  if (extra.category) {
    sets.push("category = ?");
    params.push(extra.category);
  }
  if ("error" in extra) {
    sets.push("error = ?");
    params.push(extra.error ?? null);
  }
  if ("summary" in extra) {
    sets.push("summary = ?");
    params.push(extra.summary ?? null);
  }
  if ("model" in extra) {
    sets.push("model = ?");
    params.push(extra.model ?? null);
  }
  if ("analysedAt" in extra) {
    sets.push("analysed_at = ?");
    params.push(extra.analysedAt ?? null);
  }
  params.push(id);
  getDb().prepare(`UPDATE documents SET ${sets.join(", ")} WHERE id = ?`).run(...params);
}

/** Atomically claim a document for analysis. Returns false if it is not claimable. */
export function claimDocumentForAnalysis(id: string): boolean {
  const res = getDb()
    .prepare(
      `UPDATE documents SET status = 'analysing', error = NULL
       WHERE id = ? AND status IN ('awaiting_analysis', 'analysed', 'failed')`
    )
    .run(id);
  return res.changes > 0;
}

export function deleteDocument(id: string): boolean {
  const db = getDb();
  return db.transaction(() => {
    db.prepare(`DELETE FROM org_knowledge WHERE document_id = ?`).run(id);
    const res = db.prepare(`DELETE FROM documents WHERE id = ?`).run(id);
    return res.changes > 0;
  })();
}

const STALE_ANALYSIS_MS = 15 * 60 * 1000;

/** Marks a document stuck in 'analysing' (e.g. server restart) as failed. */
export function applyStaleAnalysisFailsafe(doc: DocumentView): DocumentView {
  if (doc.status !== "analysing") return doc;
  const startedAt = doc.analysedAt ?? doc.uploadedAt;
  if (Date.now() - new Date(startedAt).getTime() < STALE_ANALYSIS_MS) return doc;
  const error = "Analysis timed out — the server likely restarted mid-run. Re-run the analysis.";
  setDocumentStatus(doc.id, "failed", { error });
  return { ...doc, status: "failed", error };
}

// ---------------------------------------------------------------------------
// Knowledge records

export interface NewRecord {
  id: string;
  category: OrgCategory;
  refId: string | null;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  anchor: string | null;
}

export function replaceDocumentRecords(documentId: string, records: NewRecord[], updatedAt?: string): void {
  const db = getDb();
  const now = updatedAt ?? new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO org_knowledge (id, category, ref_id, title, body, data_json, document_id, anchor, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  db.transaction(() => {
    db.prepare(`DELETE FROM org_knowledge WHERE document_id = ?`).run(documentId);
    for (const r of records) {
      insert.run(
        r.id,
        r.category,
        r.refId,
        r.title,
        r.body,
        r.data == null ? null : JSON.stringify(r.data),
        documentId,
        r.anchor,
        now
      );
    }
  })();
}

export function insertStandaloneRecord(record: NewRecord, updatedAt?: string): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO org_knowledge (id, category, ref_id, title, body, data_json, document_id, anchor, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`
    )
    .run(
      record.id,
      record.category,
      record.refId,
      record.title,
      record.body,
      record.data == null ? null : JSON.stringify(record.data),
      record.anchor,
      updatedAt ?? new Date().toISOString()
    );
}

const RECORD_SELECT = `
  SELECT k.*, d.title AS document_title
  FROM org_knowledge k LEFT JOIN documents d ON d.id = k.document_id`;

export function listRecords(opts: { documentId?: string; category?: OrgCategory } = {}): KnowledgeRecordView[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.documentId) {
    where.push("k.document_id = ?");
    params.push(opts.documentId);
  }
  if (opts.category) {
    where.push("k.category = ?");
    params.push(opts.category);
  }
  const rows = getDb()
    .prepare(
      `${RECORD_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY k.category, k.id`
    )
    .all(...params) as RecordRow[];
  return rows.map(mapRecord);
}

export function getKnowledgeStats(): KnowledgeStats {
  const db = getDb();
  const docs = db
    .prepare(`SELECT status, COUNT(*) AS c FROM documents GROUP BY status`)
    .all() as Array<{ status: string; c: number }>;
  const byStatus = Object.fromEntries(docs.map((d) => [d.status, d.c]));
  const recs = db
    .prepare(`SELECT category, COUNT(*) AS c FROM org_knowledge GROUP BY category`)
    .all() as Array<{ category: OrgCategory; c: number }>;
  const recordsByCategory: Partial<Record<OrgCategory, number>> = {};
  let records = 0;
  for (const r of recs) {
    recordsByCategory[r.category] = r.c;
    if (r.category !== "system_snapshot") records += r.c;
  }
  const last = db
    .prepare(
      `SELECT MAX(ts) AS ts FROM (
         SELECT MAX(COALESCE(analysed_at, uploaded_at)) AS ts FROM documents
         UNION ALL SELECT MAX(updated_at) FROM org_knowledge)`
    )
    .get() as { ts: string | null };
  return {
    documents: docs.reduce((n, d) => n + d.c, 0),
    analysed: byStatus.analysed ?? 0,
    awaitingAnalysis: (byStatus.awaiting_analysis ?? 0) + (byStatus.analysing ?? 0) + (byStatus.extracting ?? 0),
    failed: byStatus.failed ?? 0,
    records,
    recordsByCategory,
    connectedSystems: recordsByCategory.system_snapshot ?? 0,
    lastUpdated: last.ts,
  };
}

/** Remove all documents and knowledge records (the caller re-seeds). */
export function wipeKnowledge(): void {
  const db = getDb();
  db.transaction(() => {
    db.prepare(`DELETE FROM org_knowledge`).run();
    db.prepare(`DELETE FROM documents`).run();
  })();
}
