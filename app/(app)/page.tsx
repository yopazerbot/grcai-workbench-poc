import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CalendarClock,
  ClipboardCheck,
  Database,
  Flag,
  ShieldCheck,
  Table2,
} from "lucide-react";
import { getAgent } from "@/lib/agents";
import { getDashboardData } from "@/lib/dashboard";
import { envKeyConfigured } from "@/lib/env";
import { formatDateTime, formatRelative } from "@/lib/format";
import { AgentIcon } from "@/components/agent-icon";
import { KeyNudge } from "@/components/dashboard/key-nudge";
import { StackedBar, STATUS_COLORS } from "@/components/dashboard/stacked-bar";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Badge, Card, RunStatusPill } from "@/components/ui";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  run_started: "started a run",
  run_drafts_created: "drafted items",
  run_failed: "run failed",
  run_completed: "completed a run",
  item_edited: "edited an item",
  item_approved: "approved an item",
  item_rejected: "rejected an item",
  items_bulk_approved: "bulk-approved items",
  run_exported: "exported output",
  document_uploaded: "uploaded a document",
  document_analysed: "analysed a document",
  document_analysis_failed: "analysis failed",
  document_deleted: "deleted a document",
  knowledge_reset: "restored the demo knowledge base",
};

function daysUntil(iso: string, now: number): number {
  return Math.round((new Date(iso).getTime() - now) / (24 * 60 * 60 * 1000));
}

export default async function DashboardPage() {
  const d = getDashboardData();
  const now = new Date(d.generatedAt).getTime();
  const staleOrMissing = d.evidence.controls
    .filter((c) => c.status === "stale" || c.status === "missing")
    .slice(0, 5);

  return (
    <div className="animate-fade-up space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{d.orgName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Compliance posture, evidence freshness and the review queue — computed from the latest
            agent runs and the knowledge base.
          </p>
        </div>
        <Link href="/agents" className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800">
          Start a run <ArrowRight className="size-4" />
        </Link>
      </div>

      <KeyNudge serverKey={envKeyConfigured} />

      {/* KPI row --------------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Controls operating"
          value={`${d.controls.operating}/${d.controls.total}`}
          note={`${d.controls.inRemediation} in remediation`}
          icon={ShieldCheck}
          href="/knowledge"
        />
        <StatTile
          label="Runs awaiting review"
          value={d.queue.runsInReview}
          note={`${d.queue.draftItems} draft items to decide`}
          icon={ClipboardCheck}
          href="/history"
          tone={d.queue.runsInReview > 0 ? "attention" : "default"}
        />
        <StatTile
          label="Flagged drafts"
          value={d.queue.flaggedDrafts}
          note="need analyst judgement"
          icon={Flag}
          href="/history"
        />
        <StatTile
          label="Knowledge records"
          value={d.knowledge.records}
          note={`from ${d.knowledge.documents} documents · ${d.knowledge.connectedSystems} connected systems`}
          icon={Database}
          href="/knowledge"
        />
      </div>

      {/* Posture + evidence ------------------------------------------------ */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Framework coverage</h2>
              <p className="text-xs text-slate-500">Latest coverage mapping per framework, rejected rows excluded.</p>
            </div>
            <Table2 className="size-4 text-slate-300" />
          </div>
          <div className="space-y-5">
            {d.posture.map((p) => (
              <div key={p.key}>
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">{p.shortName}</span>
                    {p.runStatus && (
                      <Badge tone={p.runStatus === "completed" ? "green" : "amber"}>
                        {p.runStatus === "completed" ? "reviewed" : `in review · ${p.undecided} undecided`}
                      </Badge>
                    )}
                  </div>
                  {p.runId ? (
                    <Link href={`/runs/${p.runId}`} className="text-xs text-slate-500 hover:text-teal-700">
                      <span className="font-semibold text-slate-900">{p.fullPct}%</span> fully covered ·{" "}
                      {p.assessedAt && formatRelative(p.assessedAt)} <ArrowRight className="inline size-3" />
                    </Link>
                  ) : (
                    <Link href="/agents/control-mapper/new" className="text-xs font-medium text-teal-700 hover:text-teal-800">
                      Not assessed yet — run the Control Mapper
                    </Link>
                  )}
                </div>
                <StackedBar
                  total={p.total}
                  emptyLabel="No mapping run yet"
                  segments={[
                    { key: "full", label: "Full", value: p.full, color: STATUS_COLORS.good },
                    { key: "partial", label: "Partial", value: p.partial, color: STATUS_COLORS.warning },
                    { key: "none", label: "Gap", value: p.none, color: STATUS_COLORS.serious },
                  ]}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-800">Evidence freshness</h2>
            <p className="text-xs text-slate-500">
              {d.evidence.total} controls vs connected-system snapshots (stale after 90 days).
            </p>
          </div>
          <StackedBar
            total={d.evidence.total}
            segments={[
              { key: "complete", label: "Complete", value: d.evidence.complete, color: STATUS_COLORS.good },
              { key: "partial", label: "Partial", value: d.evidence.partial, color: STATUS_COLORS.warning },
              { key: "stale", label: "Stale", value: d.evidence.stale, color: STATUS_COLORS.serious },
              { key: "missing", label: "No source", value: d.evidence.missing, color: STATUS_COLORS.none },
            ]}
          />
          {staleOrMissing.length > 0 && (
            <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
              {staleOrMissing.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-800">
                      {c.id} — {c.name}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {c.status === "stale"
                        ? `latest evidence ${c.maxAgeDays} days old · ${c.systems.join(", ")}`
                        : "no connected system covers this control"}
                    </span>
                  </span>
                  <Badge tone={c.status === "stale" ? "red" : "slate"}>{c.status === "stale" ? "stale" : "no source"}</Badge>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/agents/evidence/new"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800"
          >
            Collect an evidence pack <ArrowRight className="size-3" />
          </Link>
        </Card>
      </div>

      {/* Queue + upcoming + activity --------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Review queue</h2>
            <Link href="/history" className="text-xs font-medium text-teal-700 hover:text-teal-800">
              History
            </Link>
          </div>
          {d.queue.runs.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Nothing waiting for review.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.queue.runs.map((run) => {
                const agent = getAgent(run.agentId);
                return (
                  <li key={run.id}>
                    <Link href={`/runs/${run.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                      {agent && (
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                          <AgentIcon icon={agent.icon} className="size-4" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{run.inputSummary}</span>
                        <span className="block text-xs text-slate-500">
                          {run.counts.draft} to decide
                          {run.counts.flagged > 0 && <span className="text-amber-600"> · {run.counts.flagged} flagged</span>}
                          {" · "}
                          {formatRelative(run.createdAt)}
                        </span>
                      </span>
                      <RunStatusPill status={run.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Upcoming dates</h2>
            <CalendarClock className="size-4 text-slate-300" />
          </div>
          {d.upcoming.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">No dated items in the knowledge base.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.upcoming.map((u) => {
                const days = daysUntil(u.dueAt, now);
                const inner = (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800">{u.label}</span>
                      <span className="block truncate text-xs text-slate-500">{u.detail}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <Badge tone={u.overdue ? "red" : days <= 60 ? "amber" : "slate"}>
                        {u.overdue ? `${Math.abs(days)}d overdue` : `in ${days}d`}
                      </Badge>
                      <span className="mt-0.5 block text-[11px] text-slate-400">{u.dueAt.slice(0, 10)}</span>
                    </span>
                  </>
                );
                return (
                  <li key={`${u.kind}-${u.label}`}>
                    {u.href ? (
                      <Link href={u.href} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                        {inner}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Recent activity</h2>
            <Link href="/audit" className="text-xs font-medium text-teal-700 hover:text-teal-800">
              Audit log
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {d.recentAudit.map((e) => {
              const isAgent = e.actorName.endsWith("(agent)");
              const href = e.runId ? `/runs/${e.runId}` : e.documentId ? `/knowledge/${e.documentId}` : null;
              const line = (
                <>
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    {isAgent ? <Bot className="size-3.5 text-teal-600" /> : <span className="text-[10px] font-semibold">{e.actorName.slice(0, 1)}</span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-slate-800">
                      <span className="font-medium">{e.actorName.replace(" (agent)", "")}</span>{" "}
                      {ACTION_LABELS[e.action] ?? e.action}
                    </span>
                    <span className="block text-xs text-slate-400" title={formatDateTime(e.ts)}>
                      {formatRelative(e.ts)}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={e.id}>
                  {href ? (
                    <Link href={href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                      {line}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-2.5">{line}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
