/** A drafting failure whose message is safe to show to the analyst. */
export class AgentRunError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentRunError";
  }
}
