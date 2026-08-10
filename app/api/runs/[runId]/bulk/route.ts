import { NextResponse, type NextRequest } from "next/server";
import { getAgent } from "@/lib/agents";
import { logAudit } from "@/lib/audit";
import { bulkApproveItems, getRunDetail, maybeCompleteRun } from "@/lib/data";
import { getActor } from "@/lib/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { runId } = await params;
  const run = getRunDetail(runId);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  const agent = getAgent(run.agentId);
  if (!agent) return NextResponse.json({ error: "Unknown agent" }, { status: 400 });

  let body: { action?: string; itemIds?: unknown; scope?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    body.action !== "approve" ||
    !Array.isArray(body.itemIds) ||
    body.itemIds.length === 0 ||
    body.itemIds.length > 500 ||
    !body.itemIds.every((id) => typeof id === "string")
  ) {
    return NextResponse.json({ error: "Invalid bulk request" }, { status: 400 });
  }

  const itemIds = body.itemIds as string[];
  const updated = bulkApproveItems(runId, itemIds, actor);
  if (updated > 0) {
    logAudit(actor, "items_bulk_approved", {
      agentId: agent.id,
      runId,
      details: {
        count: updated,
        scope: body.scope === "unflagged" ? "unflagged" : "all",
        itemIds,
      },
    });
    if (maybeCompleteRun(runId)) {
      logAudit(actor, "run_completed", { agentId: agent.id, runId });
    }
  }

  return NextResponse.json({ updated, run: getRunDetail(runId) });
}
