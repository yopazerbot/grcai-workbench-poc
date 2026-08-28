import { notFound } from "next/navigation";
import { applyStaleAnalysisFailsafe, getDocumentDetail, getDocumentView } from "@/lib/documents";
import { envKeyConfigured } from "@/lib/env";
import { DocumentDetail } from "@/components/knowledge/document-detail";

export const dynamic = "force-dynamic";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ docId: string }>;
}) {
  const { docId } = await params;
  const view = getDocumentView(docId);
  if (!view) notFound();
  applyStaleAnalysisFailsafe(view);
  const detail = getDocumentDetail(docId);
  if (!detail) notFound();

  return <DocumentDetail initial={detail} serverKey={envKeyConfigured} />;
}
