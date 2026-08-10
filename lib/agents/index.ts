import type { AgentId } from "@/lib/types";
import type { AgentDefinition } from "./types";
import { questionnaireAgent } from "./questionnaire";
import { evidenceAgent } from "./evidence";
import { controlMapperAgent } from "./control-mapper";
import { policyReviewerAgent } from "./policy-reviewer";
import { threatCheckerAgent } from "./threat-checker";

export const AGENTS: Record<string, AgentDefinition> = {
  [questionnaireAgent.id]: questionnaireAgent,
  [evidenceAgent.id]: evidenceAgent,
  [controlMapperAgent.id]: controlMapperAgent,
  [policyReviewerAgent.id]: policyReviewerAgent,
  [threatCheckerAgent.id]: threatCheckerAgent,
};

export const AGENT_LIST: AgentDefinition[] = Object.values(AGENTS);

export function getAgent(id: string): AgentDefinition | null {
  return AGENTS[id] ?? null;
}

export function isAgentId(id: string): id is AgentId {
  return id in AGENTS;
}
