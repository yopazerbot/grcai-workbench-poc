import { getDb } from "./db";
import type {
  Actor,
  AgentId,
  AuditView,
  ItemStatus,
  ItemView,
  RunCounts,
  RunDetail,
  RunSummary,
} from "./types";

// ---------------------------------------------------------------------------
// Row types (snake_case, as stored)

interface RunRow {
  id: string;
  agent_id: string;
  status: string;
  input_json: string;
  input_summary: string;
  error: string | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_by_name: string;
  created_by_email: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface RunRowWithCounts extends RunRow {
  c_total: number | null;
  c_draft: number | null;
  c_approved: number | null;
  c_rejected: number | null;
  c_flagged: number | null;
}

interface ItemRow {
  id: string;
  run_id: string;
  position: number;
  status: string;
  data_json: string;
  original_json: string;
  flagged: number;
  flag_reason: string | null;
  edited_at: string | null;
  decided_at: string | null;
  decided_by_name: string | null;
  decided_by_email: string | null;
}

interface AuditRow {
  id: number;
  ts: string;
  actor_name: string;
  actor_email: string;
  action: string;
  agent_id: string | null;
  run_id: string | null;
  item_id: string | null;
  details_json: string | null;
}

const COUNTS_JOIN = `
  LEFT JOIN (
    SELECT run_id,
      COUNT(*) AS c_total,
      SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS c_draft,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS c_approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS c_rejected,
      SUM(CASE WHEN flagged = 1 THEN 1 ELSE 0 END) AS c_flagged
    FROM run_items GROUP BY run_id
  ) c ON c.run_id = r.id`;

function mapCounts(row: RunRowWithCounts): RunCounts {
  return {
    total: row.c_total ?? 0,
    draft: row.c_draft ?? 0,
    approved: row.c_approved ?? 0,
    rejected: row.c_rejected ?? 0,
    flagged: row.c_flagged ?? 0,
  };
}

function mapRunSummary(row: RunRowWithCounts): RunSummary {
  return {
    id: row.id,
    agentId: row.agent_id as AgentId,
    status: row.status as RunSummary["status"],
    inputSummary: row.input_summary,
    error: row.error,
    model: row.model,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    counts: mapCounts(row),
  };
}

function mapItem(row: ItemRow): ItemView {
  const edited = row.edited_at != null;
  return {
    id: row.id,
    position: row.position,
    status: row.status as ItemStatus,
    flagged: row.flagged === 1,
    flagReason: row.flag_reason,
    edited,
    data: JSON.parse(row.data_json) as Record<string, unknown>,
    original: edited ? (JSON.parse(row.original_json) as Record<string, unknown>) : null,
    decidedByName: row.decided_by_name,
    decidedAt: row.decided_at,
  };
}

// ---------------------------------------------------------------------------
// Runs

export function createRun(opts: {
  id: string;
  agentId: string;
  input: Record<string, string>;
  inputSummary: string;
  actor: Actor;
}): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO runs (id, agent_id, status, input_json, input_summary,
         created_by_name, created_by_email, created_at, updated_at)
       VALUES (?, ?, 'drafting', ?, ?, ?, ?, ?, ?)`
    )
    .run(
      opts.id,
      opts.agentId,
      JSON.stringify(opts.input),
      opts.inputSummary,
      opts.actor.name,
      opts.actor.email,
      now,
      now
    );
}

export function getRunDetail(id: string): RunDetail | null {
  const row = getDb()
    .prepare(`SELECT r.*, c.c_total, c.c_draft, c.c_approved, c.c_rejected, c.c_flagged
              FROM runs r ${COUNTS_JOIN} WHERE r.id = ?`)
    .get(id) as RunRowWithCounts | undefined;
  if (!row) return null;
  return {
    ...mapRunSummary(row),
    input: JSON.parse(row.input_json) as Record<string, string>,
  };
}

export function listRuns(opts: { agentId?: string; limit?: number; offset?: number } = {}): RunSummary[] {
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;
  const where = opts.agentId ? "WHERE r.agent_id = ?" : "";
  const params: unknown[] = opts.agentId ? [opts.agentId, limit, offset] : [limit, offset];
  const rows = getDb()
    .prepare(`SELECT r.*, c.c_total, c.c_draft, c.c_approved, c.c_rejected, c.c_flagged
              FROM runs r ${COUNTS_JOIN} ${where}
              ORDER BY r.created_at DESC LIMIT ? OFFSET ?`)
    .all(...params) as RunRowWithCounts[];
  return rows.map(mapRunSummary);
}

export function setRunReview(
  id: string,
  result: { model: string; inputTokens: number | null; outputTokens: number | null }
): void {
  getDb()
    .prepare(
      `UPDATE runs SET status = 'review', model = ?, input_tokens = ?, output_tokens = ?, updated_at = ?
       WHERE id = ? AND status = 'drafting'`
    )
    .run(result.model, result.inputTokens, result.outputTokens, new Date().toISOString(), id);
}

export function setRunFailed(id: string, error: string): void {
  getDb()
    .prepare(`UPDATE runs SET status = 'failed', error = ?, updated_at = ? WHERE id = ?`)
    .run(error, new Date().toISOString(), id);
}

/** If every item is decided, move a run in review to completed. Returns true on transition. */
export function maybeCompleteRun(id: string): boolean {
  const db = getDb();
  const pending = (
    db
      .prepare(`SELECT COUNT(*) AS c FROM run_items WHERE run_id = ? AND status = 'draft'`)
      .get(id) as { c: number }
  ).c;
  if (pending > 0) return false;
  const now = new Date().toISOString();
  const res = db
    .prepare(
      `UPDATE runs SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ? AND status = 'review'`
    )
    .run(now, now, id);
  return res.changes > 0;
}

const STALE_DRAFTING_MS = 10 * 60 * 1000;

/** Marks a run stuck in drafting (e.g. dev-server restart mid-call) as failed. */
export function applyStaleDraftingFailsafe(run: RunSummary): RunSummary {
  if (run.status !== "drafting") return run;
  if (Date.now() - new Date(run.createdAt).getTime() < STALE_DRAFTING_MS) return run;
  const error = "Drafting timed out — the server likely restarted mid-run. Start a new run.";
  setRunFailed(run.id, error);
  return { ...run, status: "failed", error };
}

// ---------------------------------------------------------------------------
// Items

export interface NewItem {
  data: Record<string, unknown>;
  flagged: boolean;
  flagReason: string | null;
}

export function insertRunItems(runId: string, items: NewItem[]): void {
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO run_items (id, run_id, position, status, data_json, original_json, flagged, flag_reason)
     VALUES (?, ?, ?, 'draft', ?, ?, ?, ?)`
  );
  db.transaction(() => {
    items.forEach((item, i) => {
      const json = JSON.stringify(item.data);
      insert.run(
        crypto.randomUUID(),
        runId,
        i,
        json,
        json,
        item.flagged ? 1 : 0,
        item.flagReason
      );
    });
  })();
}

export function getItemsForRun(runId: string): ItemView[] {
  const rows = getDb()
    .prepare(`SELECT * FROM run_items WHERE run_id = ? ORDER BY position ASC`)
    .all(runId) as ItemRow[];
  return rows.map(mapItem);
}

export function getItem(runId: string, itemId: string): ItemView | null {
  const row = getDb()
    .prepare(`SELECT * FROM run_items WHERE id = ? AND run_id = ?`)
    .get(itemId, runId) as ItemRow | undefined;
  return row ? mapItem(row) : null;
}

/** Overwrite an item's current data (drafts only). Returns false if not editable. */
export function editItemData(runId: string, itemId: string, data: Record<string, unknown>): boolean {
  const res = getDb()
    .prepare(
      `UPDATE run_items SET data_json = ?, edited_at = ? WHERE id = ? AND run_id = ? AND status = 'draft'`
    )
    .run(JSON.stringify(data), new Date().toISOString(), itemId, runId);
  return res.changes > 0;
}

/** Approve or reject a draft item. Returns false if it was not a draft. */
export function decideItem(
  runId: string,
  itemId: string,
  status: "approved" | "rejected",
  actor: Actor
): boolean {
  const res = getDb()
    .prepare(
      `UPDATE run_items SET status = ?, decided_at = ?, decided_by_name = ?, decided_by_email = ?
       WHERE id = ? AND run_id = ? AND status = 'draft'`
    )
    .run(status, new Date().toISOString(), actor.name, actor.email, itemId, runId);
  return res.changes > 0;
}

/** Approve a set of draft items in one statement. Returns the number updated. */
export function bulkApproveItems(runId: string, itemIds: string[], actor: Actor): number {
  if (itemIds.length === 0) return 0;
  const placeholders = itemIds.map(() => "?").join(", ");
  const res = getDb()
    .prepare(
      `UPDATE run_items SET status = 'approved', decided_at = ?, decided_by_name = ?, decided_by_email = ?
       WHERE run_id = ? AND status = 'draft' AND id IN (${placeholders})`
    )
    .run(new Date().toISOString(), actor.name, actor.email, runId, ...itemIds);
  return res.changes;
}

// ---------------------------------------------------------------------------
// Audit

export function listAudit(opts: { limit?: number; offset?: number; runId?: string } = {}): AuditView[] {
  const limit = Math.min(opts.limit ?? 100, 500);
  const offset = opts.offset ?? 0;
  const where = opts.runId ? "WHERE run_id = ?" : "";
  const params: unknown[] = opts.runId ? [opts.runId, limit, offset] : [limit, offset];
  const rows = getDb()
    .prepare(
      `SELECT * FROM audit_log ${where} ORDER BY ts DESC, id DESC LIMIT ? OFFSET ?`
    )
    .all(...params) as AuditRow[];
  return rows.map((r) => ({
    id: r.id,
    ts: r.ts,
    actorName: r.actor_name,
    action: r.action,
    agentId: r.agent_id as AgentId | null,
    runId: r.run_id,
    itemId: r.item_id,
    details: r.details_json ? (JSON.parse(r.details_json) as Record<string, unknown>) : null,
  }));
}

// ---------------------------------------------------------------------------
// Org knowledge

export interface OrgKnowledgeRow {
  id: string;
  category: string;
  refId: string | null;
  title: string;
  body: string;
  data: unknown;
}

export function getOrgRows(categories?: string[]): OrgKnowledgeRow[] {
  const db = getDb();
  const rows = (
    categories && categories.length > 0
      ? db
          .prepare(
            `SELECT * FROM org_knowledge WHERE category IN (${categories.map(() => "?").join(", ")}) ORDER BY category, id`
          )
          .all(...categories)
      : db.prepare(`SELECT * FROM org_knowledge ORDER BY category, id`).all()
  ) as Array<{
    id: string;
    category: string;
    ref_id: string | null;
    title: string;
    body: string;
    data_json: string | null;
  }>;
  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    refId: r.ref_id,
    title: r.title,
    body: r.body,
    data: r.data_json ? JSON.parse(r.data_json) : null,
  }));
}
