import { NextResponse } from "next/server";
import { applyStaleDraftingFailsafe, getItemsForRun, getRunDetail } from "@/lib/data";
import { getActor } from "@/lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { runId } = await params;
  const run = getRunDetail(runId);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

  const checked = applyStaleDraftingFailsafe(run);
  const items = checked.status === "drafting" ? [] : getItemsForRun(runId);
  return NextResponse.json({ run: { ...run, ...checked }, items });
}
