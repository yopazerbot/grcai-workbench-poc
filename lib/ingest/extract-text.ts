import "server-only";
import { AgentRunError } from "@/lib/errors";

// Plain-text extraction for uploaded documents. Keeps the AI step format-
// agnostic: PDF, DOCX, Markdown and text all become one text blob.

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_TEXT_CHARS = 400_000;

export const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".md", ".txt", ".csv"] as const;

export interface ExtractedText {
  text: string;
  pageCount: number | null;
}

export function extensionOf(filename: string): string {
  const m = /\.[a-z0-9]+$/i.exec(filename);
  return m ? m[0].toLowerCase() : "";
}

export function isAcceptedFile(filename: string): boolean {
  return (ACCEPTED_EXTENSIONS as readonly string[]).includes(extensionOf(filename));
}

function normalise(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

export async function extractText(buffer: Buffer, filename: string): Promise<ExtractedText> {
  const ext = extensionOf(filename);

  if (ext === ".pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      const text = normalise(result.text ?? "");
      if (!text) {
        throw new AgentRunError(
          "No text could be extracted from this PDF (scanned image without OCR?)."
        );
      }
      return { text, pageCount: result.total || null };
    } finally {
      await parser.destroy?.();
    }
  }

  if (ext === ".docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    const text = normalise(result.value ?? "");
    if (!text) throw new AgentRunError("The Word document contains no extractable text.");
    return { text, pageCount: estimatePages(text) };
  }

  if (ext === ".md" || ext === ".txt" || ext === ".csv") {
    const text = normalise(buffer.toString("utf8"));
    if (!text) throw new AgentRunError("The file is empty.");
    return { text, pageCount: estimatePages(text) };
  }

  throw new AgentRunError(
    `Unsupported file type "${ext || "unknown"}". Upload PDF, DOCX, Markdown or text files.`
  );
}

function estimatePages(text: string): number {
  return Math.max(1, Math.round(text.length / 3000));
}

/** "LUM-POL-002 Access Control Policy v2.2.docx" → "LUM-POL-002 Access Control Policy v2.2" */
export function titleFromFilename(filename: string): string {
  return filename.replace(/\.[a-z0-9]+$/i, "").replace(/[_]+/g, " ").trim() || filename;
}
