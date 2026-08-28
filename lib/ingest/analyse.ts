import "server-only";
import { logAudit } from "@/lib/audit";
import { getOrgName } from "@/lib/data";
import {
  getDocumentText,
  getDocumentView,
  replaceDocumentRecords,
  setDocumentStatus,
} from "@/lib/documents";
import { AgentRunError } from "@/lib/errors";
import { runStructured } from "@/lib/llm/client";
import type { Actor, EngineSource } from "@/lib/types";
import { buildAnalysisPrompt, extractionToRecords } from "./records";
import { extractionSchema } from "./schema";

// AI analysis of one document: text → structured, anchored knowledge records.
// Runs fire-and-forget after the document has been claimed ('analysing').

const analystActor = (): Actor => ({ name: "Document Analyst (agent)", email: "agents@lumeo.be" });

/**
 * Analyse a document that has already been claimed (status 'analysing').
 * The API key is held in memory for the duration of this call only.
 */
export async function analyseDocument(
  documentId: string,
  engine: { apiKey: string; source: EngineSource },
  requestedBy: Actor
): Promise<void> {
  const doc = getDocumentView(documentId);
  const text = getDocumentText(documentId);
  if (!doc || text == null) return;

  try {
    if (!text.trim()) throw new AgentRunError("The document has no extractable text to analyse.");

    const prompt = buildAnalysisPrompt({
      orgName: getOrgName(),
      title: doc.title,
      filename: doc.filename,
      category: doc.category,
      text,
    });
    const result = await runStructured({
      apiKey: engine.apiKey,
      system: prompt.system,
      user: prompt.user,
      schema: extractionSchema,
    });

    const analysedAt = new Date().toISOString();
    const records = extractionToRecords(documentId, result.parsed, analysedAt);
    replaceDocumentRecords(documentId, records, analysedAt);
    setDocumentStatus(documentId, "analysed", {
      summary: result.parsed.summary,
      model: result.model,
      analysedAt,
      error: null,
      title: result.parsed.title?.trim() || doc.title,
      category: result.parsed.document_type,
    });
    logAudit(analystActor(), "document_analysed", {
      documentId,
      details: {
        title: result.parsed.title || doc.title,
        records: records.length,
        model: result.model,
        engine: engine.source,
        requestedBy: requestedBy.name,
      },
    });
  } catch (err) {
    const message =
      err instanceof AgentRunError
        ? err.message
        : "Unexpected error while analysing. Check the server logs.";
    if (!(err instanceof AgentRunError)) console.error(`[document ${documentId}]`, err);
    setDocumentStatus(documentId, "failed", { error: message });
    logAudit(analystActor(), "document_analysis_failed", {
      documentId,
      details: { title: doc.title, error: message, engine: engine.source },
    });
  }
}
