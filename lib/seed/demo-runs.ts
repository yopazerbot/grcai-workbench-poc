import type { Database } from "better-sqlite3";
import { controlMapperAgent } from "@/lib/agents/control-mapper";
import { mockControlMapper } from "@/lib/mock/control-mapper";
import type { OrgData } from "@/lib/org-context";
import { QA_PAIRS } from "./org-data";

// Two pre-seeded demo runs (plus their audit trail), so History and the Audit
// log look alive on first open: one fully reviewed questionnaire run and one
// DORA mapping still in review. Uses direct inserts to allow backdating.

const ANALYST = { name: "Demo Analyst", email: "analyst@demo.grcai.app" };
const AGENT_EMAIL = "agents@grcai.app";

const qa = (id: string) => QA_PAIRS.find((q) => q.id === id)!;

export function seedDemoRuns(db: Database, now: Date): void {
  const at = (msAgo: number) => new Date(now.getTime() - msAgo).toISOString();
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

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

  db.transaction(() => {
    // --- Run 1: questionnaire, fully reviewed, 3 days ago -----------------
    const run1 = crypto.randomUUID();
    const r1Start = 3 * DAY;
    const questions = [
      "1. Do you hold ISO 27001 certification, and what is its scope?",
      "2. How is client data encrypted at rest?",
      "3. What are your vulnerability remediation SLAs?",
      "4. Describe the security awareness training provided to staff.",
      "5. Please provide details of your public bug bounty programme.",
    ];
    insertRun.run(
      run1,
      "questionnaire",
      "completed",
      JSON.stringify({ questionnaire: questions.join("\n") }),
      "Questionnaire · 5 lines",
      ANALYST.name,
      ANALYST.email,
      at(r1Start),
      at(r1Start - 7 * 60 * 1000),
      at(r1Start - 5 * 60 * 1000)
    );

    const editedAnswer =
      "Yes — ISO/IEC 27001:2022 certified (certificate AFG-ISMS-2024-118, issued by Kiwa, valid until 31 March 2027), covering asset management services, the client portal, the portfolio management platform and supporting corporate IT across all three offices. Certificate and SoA available under NDA.";
    const r1Items: Array<{
      question: string;
      answer: string;
      original?: string;
      source: string;
      confidence: "confident" | "unsure";
      needs: string | null;
      status: "approved" | "rejected";
      editedAt?: string;
    }> = [
      {
        question: questions[0],
        answer: editedAnswer,
        original: qa("qa-iso").answer,
        source: `Past answer — ${qa("qa-iso").source}`,
        confidence: "confident",
        needs: null,
        status: "approved",
        editedAt: at(r1Start - 3 * 60 * 1000),
      },
      {
        question: questions[1],
        answer: qa("qa-encryption-rest").answer,
        source: `Past answer — ${qa("qa-encryption-rest").source}`,
        confidence: "confident",
        needs: null,
        status: "approved",
      },
      {
        question: questions[2],
        answer: qa("qa-vuln-sla").answer,
        source: `Past answer — ${qa("qa-vuln-sla").source}`,
        confidence: "confident",
        needs: null,
        status: "approved",
      },
      {
        question: questions[3],
        answer: qa("qa-training").answer,
        source: `Past answer — ${qa("qa-training").source}`,
        confidence: "confident",
        needs: null,
        status: "approved",
      },
      {
        question: questions[4],
        answer:
          "The current answer library and control set do not cover this question, so no answer has been drafted.",
        source: "No matching source in the knowledge base",
        confidence: "unsure",
        needs:
          "Confirm whether AFG operates a bug bounty or coordinated disclosure programme and draft this answer.",
        status: "rejected",
      },
    ];

    const r1ItemIds: string[] = [];
    r1Items.forEach((item, i) => {
      const id = crypto.randomUUID();
      r1ItemIds.push(id);
      const data = {
        question: item.question,
        answer: item.answer,
        source_note: item.source,
        confidence: item.confidence,
        needs_from_analyst: item.needs,
      };
      const original = item.original ? { ...data, answer: item.original } : data;
      insertItem.run(
        id,
        run1,
        i,
        item.status,
        JSON.stringify(data),
        JSON.stringify(original),
        item.confidence === "unsure" ? 1 : 0,
        item.confidence === "unsure" ? "Unsure — needs analyst" : null,
        item.editedAt ?? null,
        at(r1Start - 5 * 60 * 1000),
        ANALYST.name,
        ANALYST.email
      );
    });

    const r1Agent = "Questionnaire Responder (agent)";
    insertAudit.run(at(r1Start), ANALYST.name, ANALYST.email, "run_started", "questionnaire", run1, null, JSON.stringify({ inputSummary: "Questionnaire · 5 lines" }));
    insertAudit.run(at(r1Start - 40 * 1000), r1Agent, AGENT_EMAIL, "run_drafts_created", "questionnaire", run1, null, JSON.stringify({ count: 5, flagged: 1, model: "simulated" }));
    insertAudit.run(at(r1Start - 3 * 60 * 1000), ANALYST.name, ANALYST.email, "item_edited", "questionnaire", run1, r1ItemIds[0], JSON.stringify({ fields: ["answer"] }));
    insertAudit.run(at(r1Start - 4 * 60 * 1000), ANALYST.name, ANALYST.email, "item_rejected", "questionnaire", run1, r1ItemIds[4], JSON.stringify({ title: "Please provide details of your public bug bounty programme.", flagged: true }));
    insertAudit.run(at(r1Start - 5 * 60 * 1000), ANALYST.name, ANALYST.email, "items_bulk_approved", "questionnaire", run1, null, JSON.stringify({ count: 4, scope: "all", itemIds: r1ItemIds.slice(0, 4) }));
    insertAudit.run(at(r1Start - 5 * 60 * 1000), ANALYST.name, ANALYST.email, "run_completed", "questionnaire", run1, null, null);
    insertAudit.run(at(r1Start - 7 * 60 * 1000), ANALYST.name, ANALYST.email, "run_exported", "questionnaire", run1, null, JSON.stringify({ format: "markdown", itemCount: 4 }));

    // --- Run 2: DORA coverage mapping, still in review, 2 hours ago -------
    const run2 = crypto.randomUUID();
    const r2Start = 2 * HOUR;
    insertRun.run(
      run2,
      "control-mapper",
      "review",
      JSON.stringify({ framework: "dora" }),
      "Coverage matrix · DORA",
      ANALYST.name,
      ANALYST.email,
      at(r2Start),
      at(r2Start - 50 * 1000),
      null
    );

    // The simulated generator is deterministic — reuse it so seeded items are
    // identical in shape and content to a live simulated run.
    const parsed = controlMapperAgent.outputSchema.parse(
      mockControlMapper({ framework: "dora" }, {} as OrgData)
    );
    const mapperItems = controlMapperAgent.toItems(parsed);
    let flaggedCount = 0;
    mapperItems.forEach((data, i) => {
      const flag = controlMapperAgent.getFlag(data);
      if (flag.flagged) flaggedCount++;
      insertItem.run(
        crypto.randomUUID(),
        run2,
        i,
        "draft",
        JSON.stringify(data),
        JSON.stringify(data),
        flag.flagged ? 1 : 0,
        flag.reason,
        null,
        null,
        null,
        null
      );
    });

    insertAudit.run(at(r2Start), ANALYST.name, ANALYST.email, "run_started", "control-mapper", run2, null, JSON.stringify({ inputSummary: "Coverage matrix · DORA" }));
    insertAudit.run(at(r2Start - 50 * 1000), "Control Mapper (agent)", AGENT_EMAIL, "run_drafts_created", "control-mapper", run2, null, JSON.stringify({ count: mapperItems.length, flagged: flaggedCount, model: "simulated" }));
  })();
}
