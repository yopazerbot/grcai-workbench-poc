import { getDb } from "@/lib/db";
import { envKeyConfigured } from "@/lib/env";
import { SCHEMA_VERSION } from "@/lib/schema";

export const dynamic = "force-dynamic";

// Public (no session required — see middleware.ts): lets Railway healthchecks
// and browsers verify the process AND the database layer independently of
// auth. A 502 here means the process is down; a 500 names the DB failure.
export async function GET() {
  try {
    const db = getDb();
    const count = (sql: string) => (db.prepare(sql).get() as { c: number }).c;
    return Response.json({
      status: "ok",
      database: "ok",
      schema: SCHEMA_VERSION,
      runs: count("SELECT COUNT(*) AS c FROM runs"),
      documents: count("SELECT COUNT(*) AS c FROM documents"),
      engine: envKeyConfigured ? "claude (server key)" : "simulated (per-session keys accepted)",
      uptimeSeconds: Math.round(process.uptime()),
    });
  } catch (err) {
    return Response.json(
      {
        status: "error",
        database: err instanceof Error ? err.message : String(err),
        uptimeSeconds: Math.round(process.uptime()),
      },
      { status: 500 }
    );
  }
}
