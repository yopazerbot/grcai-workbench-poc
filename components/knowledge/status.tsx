import { DOCUMENT_CATEGORY_LABELS, type DocumentCategory, type DocumentStatus } from "@/lib/types";
import { Badge } from "@/components/ui";

const STATUS: Record<DocumentStatus, { label: string; tone: "slate" | "teal" | "amber" | "green" | "red" | "blue"; pulse?: boolean }> = {
  extracting: { label: "Extracting text", tone: "blue", pulse: true },
  awaiting_analysis: { label: "Awaiting analysis", tone: "amber" },
  analysing: { label: "Analysing", tone: "blue", pulse: true },
  analysed: { label: "Analysed", tone: "green" },
  failed: { label: "Failed", tone: "red" },
};

export function DocumentStatusPill({ status }: { status: DocumentStatus }) {
  const s = STATUS[status];
  return (
    <Badge tone={s.tone}>
      {s.pulse && <span className="size-1.5 animate-pulse rounded-full bg-sky-500" />}
      {s.label}
    </Badge>
  );
}

export function DocumentCategoryBadge({ category }: { category: DocumentCategory }) {
  return <Badge tone="slate">{DOCUMENT_CATEGORY_LABELS[category] ?? category}</Badge>;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
