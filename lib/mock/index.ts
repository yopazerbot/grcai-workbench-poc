import type { AgentDefinition } from "@/lib/agents/types";
import type { OrgData } from "@/lib/org-context";
import { AgentRunError } from "@/lib/errors";
import { mockQuestionnaire } from "./questionnaire";
import { mockEvidence } from "./evidence";
import { mockControlMapper } from "./control-mapper";
import { mockPolicyReviewer } from "./policy-reviewer";
import { mockThreatChecker } from "./threat-checker";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Simulated drafting engine, used when no ANTHROPIC_API_KEY is configured.
 * Generators are input-aware and read the same seeded org knowledge the live
 * prompts use; their raw output is validated against the agent's outputSchema
 * by the drafter, so the two paths always produce identical shapes.
 */
export async function simulateDraft(
  agent: AgentDefinition,
  input: Record<string, string>,
  org: OrgData
): Promise<unknown> {
  // Staged latency so the drafting state is visible and feels real.
  await sleep(1400 + Math.random() * 1400);

  switch (agent.id) {
    case "questionnaire":
      return mockQuestionnaire(input, org);
    case "evidence":
      return mockEvidence(input, org);
    case "control-mapper":
      return mockControlMapper(input, org);
    case "policy-reviewer":
      return mockPolicyReviewer(input, org);
    case "threat-checker":
      return mockThreatChecker(input, org);
    default:
      throw new AgentRunError(`No simulated generator for agent "${agent.id}".`);
  }
}
