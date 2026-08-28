import type { Database } from "better-sqlite3";
import { controlMapperAgent } from "@/lib/agents/control-mapper";
import { evidenceAgent } from "@/lib/agents/evidence";
import { questionnaireAgent } from "@/lib/agents/questionnaire";
import { threatCheckerAgent } from "@/lib/agents/threat-checker";
import type { AgentDefinition, ItemData } from "@/lib/agents/types";
import { mockControlMapper } from "@/lib/mock/control-mapper";
import { mockEvidence } from "@/lib/mock/evidence";
import { mockThreatChecker } from "@/lib/mock/threat-checker";
import { getOrgData, sourceLabel, type OrgData } from "@/lib/org-context";
import { QA_NOORDBANK } from "./lumeo/qa";

// Pre-seeded demo runs (plus their audit trail), so History, the Audit log
// and the dashboard look alive on first open. Uses direct inserts to allow
// backdating. The simulated generators are deterministic, so seeded items
// are identical in shape and content to a live simulated run.

const ELKE = { name: "Elke Van Damme", email: "elke.vandamme@lumeo.be" };
const JONAS = { name: "Jonas Peeters", email: "jonas.peeters@lumeo.be" };
const AGENT_EMAIL = "agents@lumeo.be";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

type Actor = { name: string; email: string };

export function seedDemoRuns(db: Database, now: Date): void {
  const at = (msAgo: number) => new Date(now.getTime() - msAgo).toISOString();

  const insertRun = db.prepare(
    `INSERT INTO runs (id, agent_id, status, input_json, input_summary, model,
       created_by_name, created_by_email, created_at, updated_at, completed_at)
     VALUES (?, ?, ?, ?, ?, 'simulated', ?, ?, ?, ?, ?)`
  );
  const insertItem = db.prepare(
    `INSERT INTO run_items (id, run_id, position, status, data_json, original_json,
       flagged, flag_reason, edited_at, decided_at, decided_by_name, decided_by_email)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertAudit = db.prepare(
    `INSERT INTO audit_log (ts, actor_name, actor_email, action, agent_id, run_id, item_id, details_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const audit = (
    ts: string,
    actor: Actor,
    action: string,
    agentId: string,
    runId: string,
    itemId: string | null,
    details: Record<string, unknown> | null
  ) =>
    insertAudit.run(ts, actor.name, actor.email, action, agentId, runId, itemId, details ? JSON.stringify(details) : null);

  /**
   * Seed one run from generated items. `decide` returns the outcome per item
   * (null = leave as draft). Handles statuses, timestamps and the audit trail.
   */
  function seedRun(opts: {
    agent: AgentDefinition;
    actor: Actor;
    input: Record<string, string>;
    items: ItemData[];
    startMsAgo: number;
    edits?: Record<number, Partial<ItemData>>;
    decide?: (item: ItemData, index: number) => "approved" | "rejected" | null;
  }): string {
    const { agent, actor, items, startMsAgo } = opts;
    const runId = crypto.randomUUID();
    const summary = agent.inputSummary(opts.input);
    const draftedAt = at(startMsAgo - 45 * 1000);
    const decisions = items.map((it, i) => opts.decide?.(it, i) ?? null);
    const allDecided = decisions.every((d) => d !== null);
    const decidedAt = at(startMsAgo - 6 * 60 * 1000);
    const completedAt = allDecided ? decidedAt : null;

    insertRun.run(
      runId,
      agent.id,
      allDecided ? "completed" : "review",
      JSON.stringify(opts.input),
      summary,
      actor.name,
      actor.email,
      at(startMsAgo),
      completedAt ?? draftedAt,
      completedAt
    );

    let flaggedCount = 0;
    const approvedIds: string[] = [];
    const itemIds: string[] = [];
    items.forEach((original, i) => {
      const flag = agent.getFlag(original);
      if (flag.flagged) flaggedCount++;
      const edit = opts.edits?.[i];
      const data = edit ? { ...original, ...edit } : original;
      const decision = decisions[i];
      const id = crypto.randomUUID();
      itemIds.push(id);
      insertItem.run(
        id,
        runId,
        i,
        decision ?? "draft",
        JSON.stringify(data),
        JSON.stringify(original),
        flag.flagged ? 1 : 0,
        flag.reason,
        edit ? at(startMsAgo - 4 * 60 * 1000) : null,
        decision ? decidedAt : null,
        decision ? actor.name : null,
        decision ? actor.email : null
      );
      if (decision === "approved") approvedIds.push(id);
    });

    audit(at(startMsAgo), actor, "run_started", agent.id, runId, null, { inputSummary: summary, engine: "simulated" });
    audit(draftedAt, { name: `${agent.name} (agent)`, email: AGENT_EMAIL }, "run_drafts_created", agent.id, runId, null, {
      count: items.length,
      flagged: flaggedCount,
      model: "simulated",
      engine: "simulated",
    });
    for (const [idx, edit] of Object.entries(opts.edits ?? {})) {
      audit(at(startMsAgo - 4 * 60 * 1000), actor, "item_edited", agent.id, runId, itemIds[Number(idx)], {
        fields: Object.keys(edit),
      });
    }
    decisions.forEach((d, i) => {
      if (d === "rejected") {
        audit(at(startMsAgo - 5 * 60 * 1000), actor, "item_rejected", agent.id, runId, itemIds[i], {
          title: agent.itemTitle(items[i]),
          flagged: agent.getFlag(items[i]).flagged,
        });
      }
    });
    if (approvedIds.length > 0) {
      audit(decidedAt, actor, "items_bulk_approved", agent.id, runId, null, {
        count: approvedIds.length,
        scope: "all",
        itemIds: approvedIds,
      });
    }
    if (allDecided) {
      audit(decidedAt, actor, "run_completed", agent.id, runId, null, null);
    }
    return runId;
  }

  const org: OrgData = getOrgData();
  const qa = (id: string) => QA_NOORDBANK.find((q) => q.id === id)!;
  const qaSource = (id: string) => {
    const rec = org.qaPairs.find((q) => q.id === id);
    return rec ? sourceLabel(rec) : "Past questionnaire answer";
  };

  db.transaction(() => {
    // --- 1. ISO 27001 coverage mapping — completed 12 days ago (Elke) ---------
    seedRun({
      agent: controlMapperAgent,
      actor: ELKE,
      input: { framework: "iso27001" },
      items: controlMapperAgent.toItems(
        controlMapperAgent.outputSchema.parse(mockControlMapper({ framework: "iso27001" }, org))
      ),
      startMsAgo: 12 * DAY + 3 * HOUR,
      edits: {
        1: {
          rationale:
            "Inventories exist per platform (Intune, Azure Resource Graph, ISMS application register) but 14 of 61 applications in the register still lack a named owner and the consolidated inventory has no attested review cycle — confirmed with Platform on 14 August.",
        },
      },
      decide: () => "approved",
    });

    // --- 2. SOC 2 coverage mapping — completed 8 days ago (Elke) --------------
    seedRun({
      agent: controlMapperAgent,
      actor: ELKE,
      input: { framework: "soc2" },
      items: controlMapperAgent.toItems(
        controlMapperAgent.outputSchema.parse(mockControlMapper({ framework: "soc2" }, org))
      ),
      startMsAgo: 8 * DAY + 5 * HOUR,
      decide: () => "approved",
    });

    // --- 3. Questionnaire — Noordbank follow-up, completed 5 days ago (Jonas) ---
    const questions = [
      "1. Please confirm your ISO/IEC 27001 certificate number, issuer, validity and scope.",
      "2. Do you hold a SOC 2 Type II report? If not, when do you expect one?",
      "3. What are your incident notification commitments and how do you support our DORA major-incident reporting?",
      "4. Describe the exit and data return arrangements at contract termination.",
      "5. What is the coverage limit of your cyber insurance policy, and who is the carrier?",
    ];
    const answerFor = (id: string) => ({
      answer: qa(id).answer,
      source_note: qaSource(id),
      confidence: "confident" as const,
      needs_from_analyst: null,
    });
    const qItems: ItemData[] = [
      { question: questions[0], ...answerFor("qa-iso") },
      { question: questions[1], ...answerFor("qa-soc2") },
      { question: questions[2], ...answerFor("qa-incident-notification") },
      { question: questions[3], ...answerFor("qa-exit") },
      {
        question: questions[4],
        answer:
          "The current answer library and control set do not cover this question, so no answer has been drafted.",
        source_note: "No matching source in the knowledge base",
        confidence: "unsure",
        needs_from_analyst:
          "Confirm the cyber insurance carrier and coverage limit with Finance and consider adding the answer to the questionnaire library.",
      },
    ];
    seedRun({
      agent: questionnaireAgent,
      actor: JONAS,
      input: { questionnaire: questions.join("\n") },
      items: qItems,
      startMsAgo: 5 * DAY + 2 * HOUR,
      edits: {
        1: {
          answer: `${qa("qa-soc2").answer} Noordbank will receive the final report as soon as it is issued, under the existing NDA.`,
        },
      },
      decide: (_item, i) => (i === 4 ? "rejected" : "approved"),
    });

    // --- 4. Threat check — completed 3 days ago (Elke) ------------------------
    seedRun({
      agent: threatCheckerAgent,
      actor: ELKE,
      input: threatCheckerAgent.sampleInput,
      items: threatCheckerAgent.toItems(
        threatCheckerAgent.outputSchema.parse(mockThreatChecker(threatCheckerAgent.sampleInput, org))
      ),
      startMsAgo: 3 * DAY + 4 * HOUR,
      decide: () => "approved",
    });

    // --- 5. Evidence pack — in review since yesterday (Jonas) -----------------
    seedRun({
      agent: evidenceAgent,
      actor: JONAS,
      input: evidenceAgent.sampleInput,
      items: evidenceAgent.toItems(
        evidenceAgent.outputSchema.parse(mockEvidence(evidenceAgent.sampleInput, org))
      ),
      startMsAgo: 1 * DAY + 1 * HOUR,
      decide: (item) => (String(item.control_id) === "LUM-AC-02" ? "approved" : null),
    });

    // --- 6. NIS2 coverage mapping — in review, 2 hours ago (Elke) -------------
    seedRun({
      agent: controlMapperAgent,
      actor: ELKE,
      input: { framework: "nis2" },
      items: controlMapperAgent.toItems(
        controlMapperAgent.outputSchema.parse(mockControlMapper({ framework: "nis2" }, org))
      ),
      startMsAgo: 2 * HOUR,
    });
  })();
}
