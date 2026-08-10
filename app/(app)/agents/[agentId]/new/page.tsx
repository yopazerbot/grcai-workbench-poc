import { notFound } from "next/navigation";
import { getAgent } from "@/lib/agents";
import { AgentIcon } from "@/components/agent-icon";
import { NewRunForm } from "@/components/new-run-form";

export const dynamic = "force-dynamic";

export default async function NewRunPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const agent = getAgent(agentId);
  if (!agent) notFound();

  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <div className="mb-6 flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          <AgentIcon icon={agent.icon} className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{agent.name}</h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            {agent.description}
          </p>
        </div>
      </div>
      <NewRunForm agentId={agent.id} />
    </div>
  );
}
