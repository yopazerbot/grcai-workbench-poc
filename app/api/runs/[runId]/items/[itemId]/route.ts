import { NextResponse, type NextRequest } from "next/server";
import { getAgent } from "@/lib/agents";
import { logAudit } from "@/lib/audit";
import {
  decideItem,
  editItemData,
  getItem,
  getRunDetail,
  maybeCompleteRun,
} from "@/lib/data";
import { getActor } from "@/lib/session";

type PatchBody =
  | { action: "approve" }
  | { action: "reject" }
  | { action: "edit"; fields: Record<string, string> };

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string; itemId: string }> }
) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { runId, itemId } = await params;
  const run = getRunDetail(runId);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  const agent = getAgent(run.agentId);
  if (!agent) return NextResponse.json({ error: "Unknown agent" }, { status: 400 });
  const item = getItem(runId, itemId);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.action === "edit") {
    if (typeof body.fields !== "object" || body.fields === null) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    // Only fields the agent marks editable are merged onto the item.
    const merged: Record<string, unknown> = { ...item.data };
    const editedFields: string[] = [];
    for (const field of agent.editableFields(item.data)) {
      const value = body.fields[field.name];
      if (typeof value === "string" && value !== String(item.data[field.name] ?? "")) {
        merged[field.name] = value;
        editedFields.push(field.name);
      }
    }
    const validated = agent.itemSchema.safeParse(merged);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Edited content is not valid for this item." },
        { status: 400 }
      );
    }
    if (editedFields.length > 0) {
      if (!editItemData(runId, itemId, merged)) {
        return NextResponse.json(
          { error: "Only drafts can be edited." },
          { status: 409 }
        );
      }
      logAudit(actor, "item_edited", {
        agentId: agent.id,
        runId,
        itemId,
        details: { fields: editedFields },
      });
    }
  } else if (body.action === "approve" || body.action === "reject") {
    const status = body.action === "approve" ? "approved" : "rejected";
    if (!decideItem(runId, itemId, status, actor)) {
      return NextResponse.json(
        { error: "This item has already been decided." },
        { status: 409 }
      );
    }
    logAudit(actor, body.action === "approve" ? "item_approved" : "item_rejected", {
      agentId: agent.id,
      runId,
      itemId,
      details: { title: agent.itemTitle(item.data), flagged: item.flagged },
    });
    if (maybeCompleteRun(runId)) {
      logAudit(actor, "run_completed", { agentId: agent.id, runId });
    }
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({
    item: getItem(runId, itemId),
    run: getRunDetail(runId),
  });
}
