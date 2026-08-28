import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { env } from "@/lib/env";
import { AgentRunError } from "@/lib/errors";

// The only module that talks to the Claude API. Loaded lazily by callers,
// exclusively when a key is available for the current request. Clients are
// created per call so a session key never outlives the request that sent it.

export interface StructuredResult<T> {
  parsed: T;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface StructuredRequest<T extends z.ZodTypeAny> {
  apiKey: string;
  system: string;
  user: string;
  schema: T;
  maxTokens?: number;
}

function mapError(err: unknown): never {
  if (err instanceof AgentRunError) throw err;
  if (err instanceof Anthropic.AuthenticationError) {
    throw new AgentRunError("Claude API key is invalid (authentication failed).");
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    throw new AgentRunError("The Claude API key is not permitted to use this model.");
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

/** One structured-output call: system + user → JSON validated against `schema`. */
export async function runStructured<T extends z.ZodTypeAny>(
  req: StructuredRequest<T>
): Promise<StructuredResult<z.infer<T>>> {
  const client = new Anthropic({ apiKey: req.apiKey });
  try {
    const stream = client.beta.messages.stream({
      model: env.ANTHROPIC_MODEL,
      max_tokens: req.maxTokens ?? env.ANTHROPIC_MAX_TOKENS,
      // Server-side refusal fallbacks: if safety classifiers decline (e.g. a
      // cyber-adjacent threat advisory), the request is re-served by the
      // recommended fallback model inside the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // No `thinking` param: adaptive thinking is the default on claude-opus-5.
      system: req.system,
      messages: [{ role: "user", content: req.user }],
      output_config: { format: zodOutputFormat(req.schema) },
    });
    const msg = await stream.finalMessage();

    if (msg.stop_reason === "refusal") {
      throw new AgentRunError(
        "The model declined this request (safety classifiers). Rephrase the input or use different source material."
      );
    }
    if (msg.stop_reason === "max_tokens") {
      throw new AgentRunError(
        "The response was truncated. Raise ANTHROPIC_MAX_TOKENS or shorten the input."
      );
    }

    const text = msg.content.find(
      (b): b is Extract<typeof b, { type: "text" }> => b.type === "text"
    )?.text;
    if (!text) throw new AgentRunError("The model returned an empty response.");

    // Re-validate: the SDK strips schema constraints it cannot enforce
    // server-side, so parse the JSON against the full Zod schema here.
    let parsed: z.infer<T>;
    try {
      parsed = req.schema.parse(JSON.parse(text));
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
    mapError(err);
  }
}

/** Zero-token key check: lists models with the given key. */
export async function verifyApiKey(apiKey: string): Promise<{ model: string }> {
  const client = new Anthropic({ apiKey });
  try {
    await client.models.list({ limit: 1 });
    return { model: env.ANTHROPIC_MODEL };
  } catch (err) {
    mapError(err);
  }
}
