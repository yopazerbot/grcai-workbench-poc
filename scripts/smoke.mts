/**
 * Pre-push smoke check. Run with: npm run smoke  (add --live to also make real
 * Claude API calls when ANTHROPIC_API_KEY is set).
 *
 * Verifies, without a browser:
 *  1. every agent's Zod output schema (and the document-extraction schema) is
 *     accepted by the SDK's zodOutputFormat; sample inputs pass input schemas
 *  2. a fresh DB initialises and seeds in a temp dir: Lumeo's documents,
 *     anchored records, connected systems and demo runs
 *  3. the knowledge base parses into typed records with document provenance
 *  4. every simulated generator's output parses against the agent's output
 *     schema, display/flag/export functions run, and the demo story holds
 *  5. the ingestion helpers (prompt, extraction → records) round-trip
 *  6. per-request key resolution (session header > env > simulated)
 *  7. the dashboard aggregates compute from the seeded data
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempDir = mkdtempSync(join(tmpdir(), "grcai-smoke-"));
process.env.DATABASE_PATH = join(tempDir, "smoke.db");
const liveKey = process.env.ANTHROPIC_API_KEY ?? "";
// Keep key resolution deterministic for the non-live checks.
process.env.ANTHROPIC_API_KEY = "";

const { zodOutputFormat } = await import("@anthropic-ai/sdk/helpers/zod");
const { AGENT_LIST, getAgent } = await import("../lib/agents");
const { getDb } = await import("../lib/db");
const { getOrgData, renderOrgContext } = await import("../lib/org-context");
const { getKnowledgeStats, listDocuments, listRecords } = await import("../lib/documents");
const { mockQuestionnaire } = await import("../lib/mock/questionnaire");
const { mockEvidence } = await import("../lib/mock/evidence");
const { mockControlMapper } = await import("../lib/mock/control-mapper");
const { mockPolicyReviewer } = await import("../lib/mock/policy-reviewer");
const { mockThreatChecker } = await import("../lib/mock/threat-checker");
const { extractionSchema } = await import("../lib/ingest/schema");
const { buildAnalysisPrompt, extractionToRecords } = await import("../lib/ingest/records");
const { resolveApiKey, looksLikeAnthropicKey } = await import("../lib/llm/key");
const { getDashboardData } = await import("../lib/dashboard");
const { DOCUMENTS } = await import("../lib/seed/lumeo/documents");
const { CONTROLS, POLICIES } = await import("../lib/seed/lumeo/register");
const { QA_PAIRS } = await import("../lib/seed/lumeo/qa");
const { SYSTEM_SNAPSHOTS } = await import("../lib/seed/lumeo/connectors");

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

console.log("1. schemas");
for (const agent of AGENT_LIST) {
  await check(`${agent.id}: zodOutputFormat(outputSchema) constructs`, () => {
    zodOutputFormat(agent.outputSchema);
  });
  await check(`${agent.id}: sampleInput passes inputSchema`, () => {
    agent.inputSchema.parse(agent.sampleInput);
  });
}
await check("document extraction schema constructs", () => {
  zodOutputFormat(extractionSchema);
});

console.log("2. database init + seed (temp dir)");
await check("tables created and seeded", () => {
  const db = getDb();
  const count = (sql: string) => (db.prepare(sql).get() as { c: number }).c;
  assert(count("SELECT COUNT(*) c FROM documents") === DOCUMENTS.length, `expected ${DOCUMENTS.length} documents`);
  assert(count("SELECT COUNT(*) c FROM org_knowledge WHERE document_id IS NOT NULL") >= 120, "document records missing");
  assert(count("SELECT COUNT(*) c FROM org_knowledge WHERE category = 'system_snapshot'") === SYSTEM_SNAPSHOTS.length, "snapshots missing");
  assert(count("SELECT COUNT(*) c FROM runs") === 6, `expected 6 demo runs, got ${count("SELECT COUNT(*) c FROM runs")}`);
  assert(count("SELECT COUNT(*) c FROM run_items") >= 60, "demo run items missing");
  assert(count("SELECT COUNT(*) c FROM audit_log") >= 18, "demo audit trail missing");
  assert(count("SELECT COUNT(*) c FROM meta WHERE key = 'schema_version' AND value = '2'") === 1, "schema_version not set");
});
await check("seeded documents are analysed, anchored and unique", () => {
  const docs = listDocuments();
  assert(docs.every((d) => d.status === "analysed" && d.seeded && d.summary), "seeded doc not analysed");
  assert(docs.every((d) => d.recordCount > 0), "seeded doc without records");
  const records = listRecords();
  const anchored = records.filter((r) => r.documentId);
  assert(anchored.every((r) => r.anchor && r.documentTitle), "record without anchor/document title");
  assert(new Set(records.map((r) => r.id)).size === records.length, "duplicate record ids");
  const stats = getKnowledgeStats();
  assert(stats.documents === DOCUMENTS.length && stats.analysed === DOCUMENTS.length, "stats mismatch");
  assert(stats.connectedSystems === SYSTEM_SNAPSHOTS.length, "connected systems mismatch");
});

console.log("3. knowledge base parses into typed records");
const org = getOrgData();
await check("org data shape", () => {
  assert(org.orgName === "Lumeo Software NV", `orgName = ${org.orgName}`);
  assert(org.controls.length === CONTROLS.length, `expected ${CONTROLS.length} controls, got ${org.controls.length}`);
  assert(org.policies.length === POLICIES.length, `expected ${POLICIES.length} policies, got ${org.policies.length}`);
  assert(org.qaPairs.length === QA_PAIRS.length, `expected ${QA_PAIRS.length} qa pairs, got ${org.qaPairs.length}`);
  assert(org.assets.filter((a) => a.inUse).length >= 25, "in-use assets missing");
  assert(org.assets.some((a) => !a.inUse), "not-in-use assets missing");
  assert(org.certifications.length >= 5, "certifications missing");
  assert(org.facts.length >= 20, "org facts missing");
  assert(org.snapshots.length === SYSTEM_SNAPSHOTS.length, "snapshots missing");
  assert(org.controls.every((c) => c.documentTitle && c.anchor), "control without provenance");
  assert(org.qaPairs.every((q) => q.documentTitle && q.anchor), "qa pair without provenance");
});
await check("prompt context cites sources", () => {
  const ctx = renderOrgContext(["profile", "certification", "asset", "control", "policy", "qa_pair", "system_snapshot"], org);
  assert(ctx.includes("[source: Information Security Control Register v2.3, §3.2 Authentication]"), "control source tag missing");
  assert(ctx.includes("Explicitly NOT in use"), "not-in-use block missing");
  assert((ctx.match(/\[source: /g) ?? []).length >= 100, "too few source tags");
});

console.log("4. simulated generators match agent schemas + demo story");
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
await check("questionnaire sample: 8 answers, cyber insurance unsure, sources cite documents", () => {
  const q = getAgent("questionnaire")!;
  const items = q.toItems(q.outputSchema.parse(mockQuestionnaire(q.sampleInput, org))) as Array<Record<string, string>>;
  assert(items.length === 8, `expected 8 items, got ${items.length}`);
  assert(items[7].confidence === "unsure", "last question should be unsure");
  assert(items.slice(0, 7).every((i) => i.confidence === "confident"), "first 7 should be confident");
  assert(items.slice(0, 7).every((i) => /questionnaire|Register|Policy|Overview/i.test(i.source_note)), "source notes should cite documents");
});
await check("evidence sample: complete / stale / missing", () => {
  const e = getAgent("evidence")!;
  const items = e.toItems(e.outputSchema.parse(mockEvidence(e.sampleInput, org))) as Array<Record<string, string>>;
  const byId = Object.fromEntries(items.map((i) => [i.control_id, i.status]));
  assert(byId["LUM-AC-02"] === "complete", `LUM-AC-02 = ${byId["LUM-AC-02"]}`);
  assert(byId["LUM-BC-02"] === "stale", `LUM-BC-02 = ${byId["LUM-BC-02"]}`);
  assert(byId["LUM-TP-01"] === "missing", `LUM-TP-01 = ${byId["LUM-TP-01"]}`);
});
await check("control mapper: every framework fully mapped, NIS2 has exactly one gap", () => {
  for (const fw of ["iso27001", "nis2", "soc2"]) {
    const m = getAgent("control-mapper")!;
    const items = m.toItems(m.outputSchema.parse(mockControlMapper({ framework: fw }, org))) as Array<Record<string, unknown>>;
    const ids = new Set(org.controls.map((c) => c.id));
    for (const it of items) {
      for (const c of it.covering_controls as string[]) assert(ids.has(c), `${fw}: unknown control ${c}`);
      assert(it.coverage === "full" ? it.gap_note === null : typeof it.gap_note === "string", `${fw}: gap_note rule broken for ${it.requirement_id}`);
    }
    const none = items.filter((i) => i.coverage === "none").length;
    if (fw === "nis2") assert(none === 1, `nis2 gaps = ${none}`);
    else assert(none === 0, `${fw} gaps = ${none}`);
  }
});
await check("policy reviewer sample: 3 confident diffs + uncertain NIS2 addition", () => {
  const p = getAgent("policy-reviewer")!;
  const items = p.toItems(p.outputSchema.parse(mockPolicyReviewer(p.sampleInput, org))) as Array<Record<string, string>>;
  const confident = items.filter((i) => i.confidence === "confident");
  const uncertain = items.filter((i) => i.confidence === "uncertain");
  assert(confident.length === 3, `confident = ${confident.length}`);
  assert(uncertain.length >= 1 && /incident/i.test(uncertain[0].section), "NIS2 incident addition missing");
});
await check("threat checker: sample exposed via PostgreSQL, GitLab advisory not exposed", () => {
  const t = getAgent("threat-checker")!;
  const sample = t.outputSchema.parse(mockThreatChecker(t.sampleInput, org)) as { assessment: { exposure: string; affected_assets: string[] }; actions: unknown[] };
  assert(sample.assessment.exposure === "exposed", `exposure = ${sample.assessment.exposure}`);
  assert(sample.assessment.affected_assets.some((a) => /postgres/i.test(a)), "PostgreSQL not matched");
  assert(sample.actions.length === 3, "expected 3 actions");
  const gitlab = t.outputSchema.parse(mockThreatChecker({ advisory: "CVE-2026-1111 in GitLab CE/EE 17.x allows account takeover." }, org)) as { assessment: { exposure: string } };
  assert(gitlab.assessment.exposure === "not_exposed", `gitlab exposure = ${gitlab.assessment.exposure}`);
});

console.log("5. ingestion helpers");
await check("extraction → records round-trip", () => {
  const ex = extractionSchema.parse({
    title: "Test Policy v1.0",
    document_type: "policy",
    summary: "A test policy.",
    org_facts: [{ topic: "Retention", statement: "Logs are kept 12 months.", anchor: "§4" }],
    certifications: [],
    controls: [{ id: null, name: "Log retention", description: "Keep logs.", owner: null, status: "unknown", last_review: null, anchor: "§4" }],
    policies: [{ name: "Test Policy", version: "1.0", owner: "CISO", approved_on: "2026-01-01", summary: "Requires logging.", anchor: "Document control" }],
    qa_pairs: [{ question: "Do you log?", answer: "Yes.", anchor: "Q1" }],
    assets: [{ name: "Sentinel", category: "Security operations", details: "SIEM", in_use: true, anchor: "§2" }],
  });
  const records = extractionToRecords("doc-x", ex, "2026-08-28T00:00:00.000Z");
  assert(records.length === 5, `expected 5 records, got ${records.length}`);
  assert(records.every((r) => r.anchor), "record without anchor");
  const control = records.find((r) => r.category === "control")!;
  assert(control.refId === "LOG-RETENTION", `derived control id = ${control.refId}`);
  const policy = records.find((r) => r.category === "policy")!;
  assert(policy.title === "Test Policy v1.0", `policy title = ${policy.title}`);
  const prompt = buildAnalysisPrompt({ orgName: "Lumeo Software NV", title: "T", filename: "t.pdf", category: "policy", text: "hello" });
  assert(prompt.system.includes("anchor") && prompt.user.includes("<document"), "prompt malformed");
});

console.log("6. key resolution");
await check("session header > env > simulated", () => {
  const fake = "sk-ant-" + "a".repeat(60);
  assert(looksLikeAnthropicKey(fake) && !looksLikeAnthropicKey("hello"), "shape check broken");
  const withHeader = resolveApiKey(new Headers({ "x-anthropic-key": fake }));
  assert(withHeader.source === "session_key" && withHeader.apiKey === fake, "header key not used");
  const bad = resolveApiKey(new Headers({ "x-anthropic-key": "not-a-key" }));
  assert(bad.source === "simulated" && bad.apiKey === null, "malformed header should be ignored");
  assert(resolveApiKey(new Headers()).source === "simulated", "no key should be simulated");
});

console.log("7. dashboard aggregates");
await check("posture, evidence, queue and upcoming compute", () => {
  const d = getDashboardData();
  const iso = d.posture.find((p) => p.key === "iso27001")!;
  assert(iso.runId && iso.runStatus === "completed" && iso.fullPct > 50, `iso posture: ${JSON.stringify(iso)}`);
  const nis2 = d.posture.find((p) => p.key === "nis2")!;
  assert(nis2.runStatus === "review" && nis2.none === 1 && nis2.undecided === nis2.total, "nis2 posture wrong");
  assert(d.evidence.complete + d.evidence.partial + d.evidence.stale + d.evidence.missing === d.evidence.total, "evidence counts don't add up");
  assert(d.evidence.stale >= 1 && d.evidence.missing >= 5, "evidence story missing");
  assert(d.queue.runsInReview === 2 && d.queue.flaggedDrafts > 0, `queue: ${JSON.stringify(d.queue)}`);
  assert(d.upcoming.some((u) => u.overdue), "expected an overdue policy review");
  assert(d.upcoming.some((u) => u.kind === "certificate"), "expected the ISO certificate expiry");
  assert(d.recentAudit.length === 8, "recent audit missing");
});

if (process.argv.includes("--live")) {
  console.log("8. live Claude calls (--live)");
  if (!liveKey) {
    console.log("  skip: ANTHROPIC_API_KEY not set");
  } else {
    const { verifyApiKey } = await import("../lib/llm/client");
    await check("verifyApiKey accepts the configured key", async () => {
      const r = await verifyApiKey(liveKey);
      assert(r.model.length > 0, "no model returned");
    });
    const { draft } = await import("../lib/drafter");
    const questionnaire = AGENT_LIST.find((a) => a.id === "questionnaire")!;
    await check("questionnaire agent drafts via Claude with document citations", async () => {
      const result = await draft(
        questionnaire,
        { questionnaire: "1. Is your organisation ISO 27001 certified?\n2. Do you enforce MFA for administrators?" },
        liveKey
      );
      assert(result.items.length >= 2, `expected >=2 items, got ${result.items.length}`);
      assert(result.model !== "simulated", "expected a live model id");
    });
  }
}

// Close the SQLite handle before removing the temp dir (Windows refuses to
// delete a file that is still open).
(globalThis as { __grcaiDb?: { close(): void } }).__grcaiDb?.close();
rmSync(tempDir, { recursive: true, force: true, maxRetries: 3 });

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll smoke checks passed.");
