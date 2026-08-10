import { getAgent } from "./agents";
import { logAudit } from "./audit";
import { getRunDetail, insertRunItems, setRunFailed, setRunReview } from "./data";
import { draft } from "./drafter";
import { AgentRunError } from "./errors";
import type { Actor } from "./types";

const agentActor = (agentName: string): Actor => ({
  name: `${agentName} (agent)`,
  email: "agents@grcai.app",
});

/**
 * Background drafting pipeline: drafting → review (or failed). Fired
 * fire-and-forget from POST /api/runs — safe on a persistent Node server.
 * Note for dev mode: an HMR restart mid-call orphans this promise; the
 * stale-drafting failsafe in GET /api/runs/[runId] covers that case.
 */
export async function processRun(runId: string): Promise<void> {
  const run = getRunDetail(runId);
  if (!run || run.status !== "drafting") return;

  const agent = getAgent(run.agentId);
  if (!agent) {
    setRunFailed(runId, `Unknown agent "${run.agentId}".`);
    return;
  }

  try {
    const result = await draft(agent, run.input);
    if (result.items.length === 0) {
      throw new AgentRunError("The draft came back empty — adjust the input and retry.");
    }

    insertRunItems(
      runId,
      result.items.map((data) => {
        const flag = agent.getFlag(data);
        return { data, flagged: flag.flagged, flagReason: flag.reason };
      })
    );
    setRunReview(runId, {
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });

    const flaggedCount = result.items.filter((d) => agent.getFlag(d).flagged).length;
    logAudit(agentActor(agent.name), "run_drafts_created", {
      agentId: agent.id,
      runId,
      details: { count: result.items.length, flagged: flaggedCount, model: result.model },
    });
  } catch (err) {
    const message =
      err instanceof AgentRunError
        ? err.message
        : "Unexpected error while drafting. Check the server logs.";
    if (!(err instanceof AgentRunError)) console.error(`[run ${runId}]`, err);
    setRunFailed(runId, message);
    logAudit(agentActor(agent.name), "run_failed", {
      agentId: agent.id,
      runId,
      details: { error: message },
    });
  }
}
