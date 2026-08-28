import { NextResponse, type NextRequest } from "next/server";
import { getAgent } from "@/lib/agents";
import { logAudit } from "@/lib/audit";
import { createRun, listRuns } from "@/lib/data";
import { resolveApiKey } from "@/lib/llm/key";
import { getActor } from "@/lib/session";
import { processRun } from "@/lib/run-processor";

export async function POST(req: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { agentId?: string; input?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const agent = getAgent(body.agentId ?? "");
  if (!agent) return NextResponse.json({ error: "Unknown agent" }, { status: 400 });

  const parsedInput = agent.inputSchema.safeParse(body.input ?? {});
  if (!parsedInput.success) {
    return NextResponse.json(
      { error: "Fill in the required input fields." },
      { status: 400 }
    );
  }

  // Session key (browser header) > server env key > simulated. Held in memory
  // for this request and the background drafting call only.
  const engine = resolveApiKey(req.headers);

  const runId = crypto.randomUUID();
  const input = parsedInput.data;
  createRun({
    id: runId,
    agentId: agent.id,
    input,
    inputSummary: agent.inputSummary(input),
    actor,
  });
  logAudit(actor, "run_started", {
    agentId: agent.id,
    runId,
    details: { inputSummary: agent.inputSummary(input), engine: engine.source },
  });

  // Fire-and-forget: the run page polls for progress.
  processRun(runId, { apiKey: engine.apiKey, source: engine.source }).catch((err) =>
    console.error(`[run ${runId}] processor crashed`, err)
  );

  return NextResponse.json({ runId, engine: engine.source }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const runs = listRuns({
    agentId: params.get("agentId") ?? undefined,
    limit: Number(params.get("limit") ?? 50),
    offset: Number(params.get("offset") ?? 0),
  });
  return NextResponse.json({ runs });
}
