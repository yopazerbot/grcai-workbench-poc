import { getDb } from "./db";
import type { Actor, AuditAction } from "./types";

export interface AuditContext {
  agentId?: string;
  runId?: string;
  itemId?: string;
  documentId?: string;
  details?: Record<string, unknown>;
  /** Override the timestamp (used by demo seeding). */
  ts?: string;
}

export function logAudit(actor: Actor, action: AuditAction, ctx: AuditContext = {}): void {
  getDb()
    .prepare(
      `INSERT INTO audit_log (ts, actor_name, actor_email, action, agent_id, run_id, item_id, document_id, details_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      ctx.ts ?? new Date().toISOString(),
      actor.name,
      actor.email,
      action,
      ctx.agentId ?? null,
      ctx.runId ?? null,
      ctx.itemId ?? null,
      ctx.documentId ?? null,
      ctx.details ? JSON.stringify(ctx.details) : null
    );
}
