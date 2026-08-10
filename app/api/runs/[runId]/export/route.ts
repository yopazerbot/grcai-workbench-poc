import { NextResponse, type NextRequest } from "next/server";
import { getAgent } from "@/lib/agents";
import { logAudit } from "@/lib/audit";
import { getItemsForRun, getRunDetail } from "@/lib/data";
import { getActor } from "@/lib/session";

export async function GET(
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

  const approved = getItemsForRun(runId).filter((i) => i.status === "approved");
  if (approved.length === 0) {
    return NextResponse.json({ error: "No approved items to export." }, { status: 409 });
  }

  const format = req.nextUrl.searchParams.get("format") === "json" ? "json" : "markdown";
  const download = req.nextUrl.searchParams.get("download") === "1";
  const filenameBase = `${agent.id}-${runId.slice(0, 8)}`;

  logAudit(actor, "run_exported", {
    agentId: agent.id,
    runId,
    details: { format, itemCount: approved.length },
  });

  if (format === "json") {
    const payload = JSON.stringify(
      {
        run: {
          id: run.id,
          agent: agent.name,
          inputSummary: run.inputSummary,
          createdAt: run.createdAt,
          exportedAt: new Date().toISOString(),
          exportedBy: actor.name,
        },
        items: approved.map((i) => ({
          position: i.position,
          edited: i.edited,
          approvedBy: i.decidedByName,
          approvedAt: i.decidedAt,
          ...i.data,
        })),
      },
      null,
      2
    );
    return new NextResponse(payload, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...(download
          ? { "Content-Disposition": `attachment; filename="${filenameBase}.json"` }
          : {}),
      },
    });
  }

  const markdown = agent.exportMarkdown(
    approved.map((i) => i.data),
    { inputSummary: run.inputSummary, createdAt: run.createdAt }
  );
  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      ...(download
        ? { "Content-Disposition": `attachment; filename="${filenameBase}.md"` }
        : {}),
    },
  });
}
