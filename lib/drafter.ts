import type { AgentDefinition, ItemData } from "./agents/types";
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
 * available for this request (session key or server env), otherwise to the
 * built-in simulated drafting engine. Both paths are validated against the
 * agent's outputSchema, so downstream code sees one identical shape.
 */
export async function draft(
  agent: AgentDefinition,
  input: Record<string, string>,
  apiKey: string | null
): Promise<DraftResult> {
  const org = getOrgData();

  if (!apiKey) {
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
  const { runStructured } = await import("./llm/client");
  const orgContext = renderOrgContext(agent.contextSections, org);
  const { system, user } = agent.buildPrompt(input, orgContext);
  const result = await runStructured({ apiKey, system, user, schema: agent.outputSchema });
  return {
    items: agent.toItems(result.parsed),
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
}
