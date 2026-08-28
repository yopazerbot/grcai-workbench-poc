import { NextResponse, type NextRequest } from "next/server";
import { logAudit } from "@/lib/audit";
import {
  claimDocumentForAnalysis,
  createDocument,
  getDocumentView,
  listDocuments,
  setDocumentStatus,
} from "@/lib/documents";
import { AgentRunError } from "@/lib/errors";
import {
  extractText,
  isAcceptedFile,
  MAX_UPLOAD_BYTES,
  titleFromFilename,
} from "@/lib/ingest/extract-text";
import { resolveApiKey } from "@/lib/llm/key";
import { getActor } from "@/lib/session";
import { DOCUMENT_CATEGORY_LABELS, type DocumentCategory, type DocumentView } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ documents: listDocuments() });
}

const MAX_FILES = 10;

/**
 * Multipart upload of one or more documents. Text is extracted immediately;
 * AI analysis starts in the background when a Claude key is available for
 * this request, otherwise the document waits ("awaiting analysis").
 */
export async function POST(req: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files received." }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Upload at most ${MAX_FILES} files at a time.` }, { status: 400 });
  }

  const rawCategory = String(form.get("category") ?? "other");
  const category: DocumentCategory =
    rawCategory in DOCUMENT_CATEGORY_LABELS ? (rawCategory as DocumentCategory) : "other";

  const engine = resolveApiKey(req.headers);
  const created: DocumentView[] = [];
  const rejected: Array<{ filename: string; error: string }> = [];

  for (const file of files) {
    if (!isAcceptedFile(file.name)) {
      rejected.push({ filename: file.name, error: "Unsupported file type (PDF, DOCX, MD, TXT, CSV)." });
      continue;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      rejected.push({ filename: file.name, error: "File is larger than 15 MB." });
      continue;
    }

    const id = crypto.randomUUID();
    const title = titleFromFilename(file.name);
    let text = "";
    let pageCount: number | null = null;
    let error: string | null = null;
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const extracted = await extractText(buffer, file.name);
      text = extracted.text;
      pageCount = extracted.pageCount;
    } catch (err) {
      error =
        err instanceof AgentRunError
          ? err.message
          : "Could not read this file. Check that it is not corrupted or password-protected.";
      if (!(err instanceof AgentRunError)) console.error(`[upload ${file.name}]`, err);
    }

    createDocument({
      id,
      title,
      filename: file.name,
      mime: file.type || "application/octet-stream",
      sizeBytes: file.size,
      category,
      status: error ? "failed" : "awaiting_analysis",
      text,
      pageCount,
      actor,
    });
    if (error) setDocumentStatus(id, "failed", { error });
    logAudit(actor, "document_uploaded", {
      documentId: id,
      details: { title, filename: file.name, sizeBytes: file.size, category, extracted: !error },
    });

    if (!error && engine.apiKey && claimDocumentForAnalysis(id)) {
      const { analyseDocument } = await import("@/lib/ingest/analyse");
      analyseDocument(id, { apiKey: engine.apiKey, source: engine.source }, actor).catch((err) =>
        console.error(`[document ${id}] analysis crashed`, err)
      );
    }

    const view = getDocumentView(id);
    if (view) created.push(view);
  }

  return NextResponse.json(
    { documents: created, rejected, engine: engine.source },
    { status: created.length > 0 ? 201 : 400 }
  );
}
