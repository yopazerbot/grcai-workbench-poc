import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { AgentDefinition } from "./agents/types";
import { env } from "./env";
import { AgentRunError } from "./errors";

// The only module that talks to the Claude API. Loaded lazily by the drafter,
// exclusively when ANTHROPIC_API_KEY is configured.

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }));

export interface ClaudeDraft {
  parsed: unknown;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

export async function runClaudeDraft(
  agent: AgentDefinition,
  input: Record<string, string>,
  orgContext: string
): Promise<ClaudeDraft> {
  const { system, user } = agent.buildPrompt(input, orgContext);

  try {
    const stream = getClient().beta.messages.stream({
      model: env.ANTHROPIC_MODEL,
      max_tokens: env.ANTHROPIC_MAX_TOKENS,
      // Server-side refusal fallbacks: if safety classifiers decline (e.g. a
      // cyber-adjacent threat advisory), the request is re-served by the
      // recommended fallback model inside the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // No `thinking` param: adaptive thinking is the default on claude-opus-5.
      system,
      messages: [{ role: "user", content: user }],
      output_config: { format: zodOutputFormat(agent.outputSchema) },
    });
    const msg = await stream.finalMessage();

    if (msg.stop_reason === "refusal") {
      throw new AgentRunError(
        "The model declined this request (safety classifiers). Rephrase the input or use different source material."
      );
    }
    if (msg.stop_reason === "max_tokens") {
      throw new AgentRunError(
        "The draft was truncated. Raise ANTHROPIC_MAX_TOKENS or shorten the input."
      );
    }

    const text = msg.content.find(
      (b): b is Extract<typeof b, { type: "text" }> => b.type === "text"
    )?.text;
    if (!text) throw new AgentRunError("The model returned an empty response.");

    // Re-validate: the SDK strips schema constraints it cannot enforce
    // server-side, so parse the JSON against the full Zod schema here.
    let parsed: unknown;
    try {
      parsed = agent.outputSchema.parse(JSON.parse(text));
    } catch {
      throw new AgentRunError("The model response did not match the expected format.");
    }

    return {
      parsed,
      model: msg.model,
      inputTokens: msg.usage.input_tokens ?? null,
      outputTokens: msg.usage.output_tokens ?? null,
    };
  } catch (err) {
    if (err instanceof AgentRunError) throw err;
    if (err instanceof Anthropic.AuthenticationError) {
      throw new AgentRunError("Claude API key is invalid (authentication failed).");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new AgentRunError("Claude API rate limit reached — try again shortly.");
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new AgentRunError("Could not reach the Claude API (network error).");
    }
    if (err instanceof Anthropic.APIError) {
      throw new AgentRunError(`Claude API error (${err.status ?? "unknown"}): ${err.message}`);
    }
    throw err;
  }
}
