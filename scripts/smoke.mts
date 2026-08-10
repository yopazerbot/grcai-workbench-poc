/**
 * Pre-push smoke check. Run with: npm run smoke  (add --live to also make one
 * real Claude API call when ANTHROPIC_API_KEY is set).
 *
 * Verifies, without a browser:
 *  1. every agent's Zod output schema is accepted by the SDK's zodOutputFormat
 *  2. every agent's sample input passes its input schema
 *  3. a fresh DB initialises and seeds in a temp dir (org knowledge + demo runs)
 *  4. every simulated generator's output parses against the agent's output
 *     schema, and display/flag/export functions run over the produced items
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempDir = mkdtempSync(join(tmpdir(), "grcai-smoke-"));
process.env.DATABASE_PATH = join(tempDir, "smoke.db");

const { zodOutputFormat } = await import("@anthropic-ai/sdk/helpers/zod");
const { AGENT_LIST } = await import("../lib/agents");
const { getDb } = await import("../lib/db");
const { getOrgData } = await import("../lib/org-context");
const { mockQuestionnaire } = await import("../lib/mock/questionnaire");
const { mockEvidence } = await import("../lib/mock/evidence");
const { mockControlMapper } = await import("../lib/mock/control-mapper");
const { mockPolicyReviewer } = await import("../lib/mock/policy-reviewer");
const { mockThreatChecker } = await import("../lib/mock/threat-checker");

let failures = 0;
const check = (name: string, fn: () => void | Promise<void>) =>
  Promise.resolve()
    .then(fn)
    .then(() => console.log(`  ok   ${name}`))
    .catch((err) => {
      failures++;
      console.error(`  FAIL ${name}\n       ${err?.message ?? err}`);
    });

const assert = (cond: unknown, msg: string) => {
  if (!cond) throw new Error(msg);
};

console.log("1. agent schemas");
for (const agent of AGENT_LIST) {
  await check(`${agent.id}: zodOutputFormat(outputSchema) constructs`, () => {
    zodOutputFormat(agent.outputSchema);
  });
  await check(`${agent.id}: sampleInput passes inputSchema`, () => {
    agent.inputSchema.parse(agent.sampleInput);
  });
}

console.log("2. database init + seed (temp dir)");
await check("tables created and seeded", () => {
  const db = getDb();
  const count = (sql: string) => (db.prepare(sql).get() as { c: number }).c;
  assert(count("SELECT COUNT(*) c FROM org_knowledge") >= 35, "org_knowledge not seeded");
  assert(count("SELECT COUNT(*) c FROM runs") === 2, "expected 2 demo runs");
  assert(count("SELECT COUNT(*) c FROM run_items") >= 15, "demo run items missing");
  assert(count("SELECT COUNT(*) c FROM audit_log") >= 9, "demo audit trail missing");
});
await check("org knowledge parses into typed records", () => {
  const org = getOrgData();
  assert(org.controls.length === 16, `expected 16 controls, got ${org.controls.length}`);
  assert(org.snapshots.length >= 6, "system snapshots missing");
  assert(org.qaPairs.length >= 10, "qa pairs missing");
});

console.log("3. simulated generators match agent schemas");
const org = getOrgData();
const generators: Record<string, (input: Record<string, string>, o: typeof org) => unknown> = {
  questionnaire: mockQuestionnaire,
  evidence: mockEvidence,
  "control-mapper": mockControlMapper,
  "policy-reviewer": mockPolicyReviewer,
  "threat-checker": mockThreatChecker,
};
for (const agent of AGENT_LIST) {
  await check(`${agent.id}: mock output parses + items render`, () => {
    const parsed = agent.outputSchema.parse(generators[agent.id](agent.sampleInput, org));
    const items = agent.toItems(parsed);
    assert(items.length > 0, "no items produced");
    for (const item of items) {
      agent.getFlag(item);
      agent.itemTitle(item);
      assert(agent.display(item).length > 0, "empty display rows");
      agent.itemSchema.parse(item);
      agent.editableFields(item);
    }
    const md = agent.exportMarkdown(items, {
      inputSummary: agent.inputSummary(agent.sampleInput),
      createdAt: new Date().toISOString(),
    });
    assert(md.length > 50, "export markdown too short");
  });
}

if (process.argv.includes("--live")) {
  console.log("4. live Claude call (--live)");
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("  skip: ANTHROPIC_API_KEY not set");
  } else {
    const { draft } = await import("../lib/drafter");
    const questionnaire = AGENT_LIST.find((a) => a.id === "questionnaire")!;
    await check("questionnaire agent drafts via Claude", async () => {
      const result = await draft(questionnaire, {
        questionnaire:
          "1. Is your organisation ISO 27001 certified?\n2. Do you enforce MFA for administrators?",
      });
      assert(result.items.length >= 2, `expected >=2 items, got ${result.items.length}`);
      assert(result.model !== "simulated", "expected a live model id");
    });
  }
}

rmSync(tempDir, { recursive: true, force: true });

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll smoke checks passed.");
