import { Database, FileText, Layers, Plug } from "lucide-react";
import { getKnowledgeStats, listDocuments } from "@/lib/documents";
import { envKeyConfigured } from "@/lib/env";
import { formatDateTime, formatRelative } from "@/lib/format";
import { getOrgData } from "@/lib/org-context";
import { Badge, Card } from "@/components/ui";
import { KnowledgeWorkspace } from "@/components/knowledge/knowledge-workspace";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const stats = getKnowledgeStats();
  const documents = listDocuments();
  const org = getOrgData();

  const tiles = [
    { label: "Documents", value: stats.documents, note: `${stats.analysed} analysed${stats.awaitingAnalysis ? ` · ${stats.awaitingAnalysis} pending` : ""}${stats.failed ? ` · ${stats.failed} failed` : ""}`, icon: FileText },
    { label: "Knowledge records", value: stats.records, note: `${stats.recordsByCategory.control ?? 0} controls · ${stats.recordsByCategory.policy ?? 0} policies · ${stats.recordsByCategory.qa_pair ?? 0} past answers`, icon: Layers },
    { label: "Connected systems", value: stats.connectedSystems, note: "read-only evidence snapshots", icon: Plug },
    { label: "Last updated", value: stats.lastUpdated ? formatRelative(stats.lastUpdated) : "—", note: stats.lastUpdated ? formatDateTime(stats.lastUpdated) : "", icon: Database, text: true },
  ];

  return (
    <div className="animate-fade-up space-y-8">
      <div>
        <h1 className="mb-1 text-xl font-semibold tracking-tight">Knowledge base</h1>
        <p className="text-sm text-slate-500">
          {org.orgName}&apos;s documents, analysed into anchored records that every agent drafts from — plus
          read-only snapshots from connected systems.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-slate-500">{t.label}</p>
              <t.icon className="size-4 text-slate-300" />
            </div>
            <p className={t.text ? "mt-1 text-lg font-semibold text-slate-900" : "mt-1 text-2xl font-semibold text-slate-900"}>
              {t.value}
            </p>
            {t.note && <p className="mt-0.5 truncate text-xs text-slate-400">{t.note}</p>}
          </Card>
        ))}
      </div>

      <KnowledgeWorkspace initialDocuments={documents} serverKey={envKeyConfigured} />

      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-700">Connected systems</h2>
          <Badge tone="slate">simulated integrations</Badge>
        </div>
        <Card className="divide-y divide-slate-100">
          {org.snapshots.map((s) => {
            const newest = s.entries.reduce(
              (acc, e) => (acc && acc > e.collectedAt ? acc : e.collectedAt),
              "" as string
            );
            const gaps = s.entries.filter((e) => e.gap).length;
            return (
              <div key={s.key} className="flex items-center gap-3 px-4 py-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <Plug className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{s.system}</p>
                  <p className="truncate text-xs text-slate-500">{s.summary}</p>
                </div>
                <div className="shrink-0 text-right text-xs text-slate-500">
                  <p>
                    {s.entries.length} evidence item{s.entries.length === 1 ? "" : "s"}
                    {gaps > 0 && <span className="text-amber-600"> · {gaps} gap{gaps === 1 ? "" : "s"}</span>}
                  </p>
                  <p className="text-slate-400">latest {newest ? formatRelative(newest) : "—"}</p>
                </div>
              </div>
            );
          })}
        </Card>
      </section>
    </div>
  );
}
