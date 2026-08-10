import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AGENT_LIST, getAgent } from "@/lib/agents";
import { listRuns } from "@/lib/data";
import { formatRelative } from "@/lib/format";
import { AgentIcon } from "@/components/agent-icon";
import { Card, RunStatusPill } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const recent = listRuns({ limit: 5 });

  return (
    <div className="space-y-10 animate-fade-up">
      <section>
        <h1 className="mb-1 text-xl font-semibold tracking-tight">Agents</h1>
        <p className="mb-5 text-sm text-slate-500">
          Every agent drafts. You review, edit and approve.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {AGENT_LIST.map((agent) => (
            <Link key={agent.id} href={`/agents/${agent.id}/new`} className="group">
              <Card className="flex h-full items-start gap-4 p-5 transition-all group-hover:border-teal-600/40 group-hover:shadow-md">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <AgentIcon icon={agent.icon} className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">{agent.name}</span>
                    <ArrowRight className="size-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-teal-700" />
                  </span>
                  <span className="mt-1 block text-sm leading-snug text-slate-500">
                    {agent.tagline}
                  </span>
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Recent runs</h2>
            <Link
              href="/history"
              className="text-sm font-medium text-teal-700 hover:text-teal-800"
            >
              View all
            </Link>
          </div>
          <Card className="divide-y divide-slate-100">
            {recent.map((run) => {
              const agent = getAgent(run.agentId);
              return (
                <Link
                  key={run.id}
                  href={`/runs/${run.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  {agent && (
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                      <AgentIcon icon={agent.icon} className="size-4" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {run.inputSummary}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {agent?.name} · {formatRelative(run.createdAt)}
                    </span>
                  </span>
                  <RunStatusPill status={run.status} />
                </Link>
              );
            })}
          </Card>
        </section>
      )}
    </div>
  );
}
