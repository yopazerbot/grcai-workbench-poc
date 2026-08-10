import { NextResponse, type NextRequest } from "next/server";
import { listAudit } from "@/lib/data";
import { getActor } from "@/lib/session";

export async function GET(req: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const entries = listAudit({
    limit: Number(params.get("limit") ?? 100),
    offset: Number(params.get("offset") ?? 0),
    runId: params.get("runId") ?? undefined,
  });
  return NextResponse.json({ entries });
}
