import { NextResponse, type NextRequest } from "next/server";
import { claimDocumentForAnalysis, getDocumentView } from "@/lib/documents";
import { resolveApiKey } from "@/lib/llm/key";
import { getActor } from "@/lib/session";

export const dynamic = "force-dynamic";

/** (Re-)run AI analysis on a document. Requires a Claude key for this request. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { docId } = await params;
  const view = getDocumentView(docId);
  if (!view) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (view.textLength === 0) {
    return NextResponse.json(
      { error: "This document has no extracted text to analyse. Upload it again." },
      { status: 409 }
    );
  }

  const engine = resolveApiKey(req.headers);
  if (!engine.apiKey) {
    return NextResponse.json(
      {
        error:
          "No Claude API key is available. Add your key via the user menu (kept in this browser session only) to analyse documents.",
        code: "no_api_key",
      },
      { status: 409 }
    );
  }

  if (!claimDocumentForAnalysis(docId)) {
    return NextResponse.json({ error: "This document is already being analysed." }, { status: 409 });
  }

  const { analyseDocument } = await import("@/lib/ingest/analyse");
  analyseDocument(docId, { apiKey: engine.apiKey, source: engine.source }, actor).catch((err) =>
    console.error(`[document ${docId}] analysis crashed`, err)
  );

  return NextResponse.json({ document: getDocumentView(docId), engine: engine.source }, { status: 202 });
}
