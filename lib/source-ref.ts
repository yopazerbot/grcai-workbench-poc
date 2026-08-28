// Pure helpers for document-anchored provenance. No db / SDK imports, so
// simulated generators and client code can use them freely.

export interface SourceRef {
  documentId: string | null;
  documentTitle: string | null;
  anchor: string | null;
}

/** "Access Control Policy v2.2, §4 Access revocation" or a fallback label. */
export function sourceLabel(ref: SourceRef, fallback = "Knowledge base"): string {
  if (!ref.documentTitle) return fallback;
  return ref.anchor ? `${ref.documentTitle}, ${ref.anchor}` : ref.documentTitle;
}
