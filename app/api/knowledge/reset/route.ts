import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { getKnowledgeStats, wipeKnowledge } from "@/lib/documents";
import { seedKnowledge } from "@/lib/seed/lumeo";
import { getActor } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Restore the demo knowledge base: removes all documents/records and re-seeds Lumeo's. */
export async function POST() {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const before = getKnowledgeStats();
  wipeKnowledge();
  seedKnowledge(getDb(), new Date());
  const after = getKnowledgeStats();

  logAudit(actor, "knowledge_reset", {
    details: { removedDocuments: before.documents, restoredDocuments: after.documents, records: after.records },
  });
  return NextResponse.json({ stats: after });
}
