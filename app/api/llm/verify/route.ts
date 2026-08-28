import { NextResponse, type NextRequest } from "next/server";
import { AgentRunError } from "@/lib/errors";
import { API_KEY_HEADER, looksLikeAnthropicKey } from "@/lib/llm/key";
import { getActor } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Verifies the Claude key sent in the request header with a zero-token call.
 * The key is used for this request only and never stored or logged.
 */
export async function POST(req: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = req.headers.get(API_KEY_HEADER)?.trim() ?? "";
  if (!key) return NextResponse.json({ error: "No key supplied." }, { status: 400 });
  if (!looksLikeAnthropicKey(key)) {
    return NextResponse.json(
      { error: "That does not look like an Anthropic API key (expected sk-ant-…)." },
      { status: 400 }
    );
  }

  try {
    const { verifyApiKey } = await import("@/lib/llm/client");
    const result = await verifyApiKey(key);
    return NextResponse.json({ ok: true, model: result.model });
  } catch (err) {
    const message = err instanceof AgentRunError ? err.message : "Could not verify the key.";
    if (!(err instanceof AgentRunError)) console.error("[llm/verify]", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
