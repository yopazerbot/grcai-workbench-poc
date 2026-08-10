import Link from "next/link";
import { Flag } from "lucide-react";
import { getAgent } from "@/lib/agents";
import { listRuns } from "@/lib/data";
import { formatRelative } from "@/lib/format";
import { AgentIcon } from "@/components/agent-icon";
import { Card, EmptyState, RunStatusPill } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const runs = listRuns({ limit: 100 });

  return (
    <div className="animate-fade-up">
      <h1 className="mb-1 text-xl font-semibold tracking-tight">History</h1>
      <p className="mb-5 text-sm text-slate-500">All runs, newest first.</p>

      {runs.length === 0 ? (
        <EmptyState>
          No runs yet — pick an agent on the <Link href="/" className="font-medium text-teal-700">Agents</Link> page.
        </EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-semibold">Run</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Approved</th>
                <th className="px-4 py-3 font-semibold">Flagged</th>
                <th className="px-4 py-3 font-semibold">By</th>
                <th className="px-4 py-3 font-semibold">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.map((run) => {
                const agent = getAgent(run.agentId);
                return (
                  <tr key={run.id} className="group relative transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/runs/${run.id}`} className="flex items-center gap-2.5 after:absolute after:inset-0">
                        {agent && (
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                            <AgentIcon icon={agent.icon} className="size-4" />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block max-w-[280px] truncate font-medium text-slate-900">
                            {run.inputSummary}
                          </span>
                          <span className="block text-xs text-slate-500">{agent?.name}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <RunStatusPill status={run.status} />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">
                      {run.counts.approved}/{run.counts.total}
                    </td>
                    <td className="px-4 py-3">
                      {run.counts.flagged > 0 ? (
                        <span className="inline-flex items-center gap-1 font-medium text-amber-600">
                          <Flag className="size-3.5" />
                          {run.counts.flagged}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{run.createdByName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {formatRelative(run.createdAt)}
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
