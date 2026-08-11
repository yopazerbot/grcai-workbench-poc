import { getDb } from "@/lib/db";
import { llmConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

// Public (no session required — see middleware.ts): lets Railway healthchecks
// and browsers verify the process AND the database layer independently of
// auth. A 502 here means the process is down; a 500 names the DB failure.
export async function GET() {
  try {
    const db = getDb();
    const runs = (
      db.prepare("SELECT COUNT(*) AS c FROM runs").get() as { c: number }
    ).c;
    return Response.json({
      status: "ok",
      database: "ok",
      runs,
      engine: llmConfigured ? "claude" : "simulated",
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
