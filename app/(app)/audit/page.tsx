import Link from "next/link";
import { Bot } from "lucide-react";
import { getAgent } from "@/lib/agents";
import { listAudit } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import type { AuditView } from "@/lib/types";
import { Card, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  run_started: "Run started",
  run_drafts_created: "Drafts created",
  run_failed: "Run failed",
  run_completed: "Run completed",
  item_edited: "Item edited",
  item_approved: "Item approved",
  item_rejected: "Item rejected",
  items_bulk_approved: "Bulk approval",
  run_exported: "Output exported",
};

function detailsSummary(entry: AuditView): string | null {
  const d = entry.details;
  if (!d) return null;
  switch (entry.action) {
    case "run_started":
      return typeof d.inputSummary === "string" ? d.inputSummary : null;
    case "run_drafts_created":
      return `${d.count} items · ${d.flagged} flagged`;
    case "run_failed":
      return typeof d.error === "string" ? d.error : null;
    case "item_edited":
      return Array.isArray(d.fields) ? `fields: ${(d.fields as string[]).join(", ")}` : null;
    case "item_approved":
    case "item_rejected":
      return typeof d.title === "string" ? d.title : null;
    case "items_bulk_approved":
      return `${d.count} items (${d.scope})`;
    case "run_exported":
      return `${d.format} · ${d.itemCount} items`;
    default:
      return null;
  }
}

export default async function AuditPage() {
  const entries = listAudit({ limit: 200 });

  return (
    <div className="animate-fade-up">
      <h1 className="mb-1 text-xl font-semibold tracking-tight">Audit log</h1>
      <p className="mb-5 text-sm text-slate-500">
        Every input, draft, edit, decision and export — attributed and timestamped.
      </p>

      {entries.length === 0 ? (
        <EmptyState>Nothing here yet.</EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Detail</th>
                <th className="px-4 py-3 font-semibold">Run</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry) => {
                const agent = entry.agentId ? getAgent(entry.agentId) : null;
                const isAgentActor = entry.actorName.endsWith("(agent)");
                return (
                  <tr key={entry.id} className="align-top transition-colors hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-slate-500">
                      {formatDateTime(entry.ts)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-700">
                      <span className="inline-flex items-center gap-1.5">
                        {isAgentActor && <Bot className="size-3.5 text-teal-600" />}
                        {entry.actorName.replace(" (agent)", "")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900">
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </td>
                    <td className="max-w-[300px] truncate px-4 py-2.5 text-slate-500">
                      {detailsSummary(entry) ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {entry.runId ? (
                        <Link
                          href={`/runs/${entry.runId}`}
                          className="block max-w-[150px] truncate font-medium text-teal-700 hover:text-teal-800"
                        >
                          {agent?.name ?? "View"}
                        </Link>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
