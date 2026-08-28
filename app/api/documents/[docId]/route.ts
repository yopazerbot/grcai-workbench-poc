import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import {
  applyStaleAnalysisFailsafe,
  deleteDocument,
  getDocumentDetail,
  getDocumentView,
} from "@/lib/documents";
import { getActor } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ docId: string }> }
) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { docId } = await params;
  const view = getDocumentView(docId);
  if (!view) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  applyStaleAnalysisFailsafe(view);
  const detail = getDocumentDetail(docId);
  return NextResponse.json({ document: detail });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ docId: string }> }
) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { docId } = await params;
  const view = getDocumentView(docId);
  if (!view) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (view.status === "analysing") {
    return NextResponse.json({ error: "Wait for the analysis to finish first." }, { status: 409 });
  }

  deleteDocument(docId);
  logAudit(actor, "document_deleted", {
    documentId: docId,
    details: { title: view.title, records: view.recordCount, seeded: view.seeded },
  });
  return NextResponse.json({ ok: true });
}
