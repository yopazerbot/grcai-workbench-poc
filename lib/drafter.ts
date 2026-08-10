import type { AgentDefinition, ItemData } from "./agents/types";
import { llmConfigured } from "./env";
import { AgentRunError } from "./errors";
import { simulateDraft } from "./mock";
import { getOrgData, renderOrgContext } from "./org-context";

export interface DraftResult {
  items: ItemData[];
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

/**
 * Produce draft items for a run. Routes to the live Claude API when a key is
 * configured, otherwise to the built-in simulated drafting engine. Both paths
 * are validated against the agent's outputSchema, so downstream code sees one
 * identical shape.
 */
export async function draft(
  agent: AgentDefinition,
  input: Record<string, string>
): Promise<DraftResult> {
  const org = getOrgData();

  if (!llmConfigured) {
    const raw = await simulateDraft(agent, input, org);
    let parsed: unknown;
    try {
      parsed = agent.outputSchema.parse(raw);
    } catch {
      throw new AgentRunError("Simulated draft did not match the expected format.");
    }
    return {
      items: agent.toItems(parsed),
      model: "simulated",
      inputTokens: null,
      outputTokens: null,
    };
  }

  // Lazy import keeps the Anthropic SDK (and its "server-only" guard) out of
  // every code path that never uses it.
  const { runClaudeDraft } = await import("./claude");
  const orgContext = renderOrgContext(agent.contextSections, org);
  const result = await runClaudeDraft(agent, input, orgContext);
  return {
    items: agent.toItems(result.parsed),
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
}
