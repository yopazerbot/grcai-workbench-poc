// Typed access to environment configuration. Safe to import from edge code
// (auth.ts / middleware) — reads process.env only, no node APIs.

export const env = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || "claude-opus-5",
  ANTHROPIC_MAX_TOKENS: Number(process.env.ANTHROPIC_MAX_TOKENS || 32000),
  DATABASE_PATH: process.env.DATABASE_PATH || "./data/grcai.db",
  AUTH_MICROSOFT_ENTRA_ID_ID: process.env.AUTH_MICROSOFT_ENTRA_ID_ID ?? "",
  AUTH_MICROSOFT_ENTRA_ID_SECRET: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET ?? "",
  AUTH_MICROSOFT_ENTRA_ID_ISSUER: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER ?? "",
};

/** Live Claude calls are made only when an API key is present. */
export const llmConfigured = env.ANTHROPIC_API_KEY.length > 0;

/** Microsoft SSO is offered only when the full app registration is configured. */
export const entraConfigured =
  env.AUTH_MICROSOFT_ENTRA_ID_ID.length > 0 &&
  env.AUTH_MICROSOFT_ENTRA_ID_SECRET.length > 0 &&
  env.AUTH_MICROSOFT_ENTRA_ID_ISSUER.length > 0;

/** Demo login is on when forced via env, or whenever SSO is not configured. */
export const demoLoginEnabled =
  process.env.DEMO_LOGIN === "true" || !entraConfigured;
