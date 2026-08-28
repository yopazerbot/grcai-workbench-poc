import { sourceLabel } from "@/lib/source-ref";
import type { OrgData, QaRecord } from "@/lib/org-context";

// Input-aware simulated generator: splits the actually-pasted questions and
// answers each from the seeded knowledge base via keyword matching. Answers
// come from past questionnaire responses first, then from the control
// register, policies and certification facts — every answer carries the
// document it was anchored to. Unmatched questions become "unsure" items,
// mirroring the live agent's behaviour.

export function splitQuestions(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const marker = /^(\d+[.)]|[-*•]|Q\d+[:.]?|Question\s+\d+[:.]?)\s+/i;
  const out: string[] = [];
  let buf: string[] = [];
  const flush = () => {
    const q = buf.join(" ").trim();
    if (q) out.push(q);
    buf = [];
  };

  for (const line of lines) {
    if (marker.test(line)) {
      flush();
      buf = [line];
    } else if (buf.length > 0) {
      buf.push(line);
    } else {
      buf = [line];
    }
    if (line.endsWith("?")) flush();
  }
  flush();

  // Single-paragraph fallback: split on question marks.
  if (out.length <= 1 && (text.match(/\?/g) ?? []).length > 1) {
    return text
      .split(/(?<=\?)/)
      .map((s) => s.trim())
      .filter((s) => s.length > 3)
      .slice(0, 40);
  }
  return out.slice(0, 40);
}

interface MatchResult {
  answer: string;
  source: string;
}

type Rule = { test: RegExp; build: (org: OrgData) => MatchResult | null };

const qa = (org: OrgData, id: string): QaRecord | undefined =>
  org.qaPairs.find((q) => q.id === id);

/** Reuse a past questionnaire answer, cited to its response document. */
const fromQa =
  (id: string) =>
  (org: OrgData): MatchResult | null => {
    const pair = qa(org, id);
    return pair ? { answer: pair.answer, source: sourceLabel(pair, pair.source) } : null;
  };

/** Ground a drafted answer in a control from the register. */
const fromControl =
  (id: string, answer: string) =>
  (org: OrgData): MatchResult | null => {
    const c = org.controls.find((x) => x.id === id);
    return c ? { answer, source: `${c.id} — ${c.name} (${sourceLabel(c)})` } : null;
  };

/** Ground a drafted answer in a policy from the policy set. */
const fromPolicy =
  (id: string, answer: string) =>
  (org: OrgData): MatchResult | null => {
    const p = org.policies.find((x) => x.id === id);
    if (!p) return null;
    const label = sourceLabel(p, "");
    // The source document is usually the policy itself — don't repeat its name.
    return {
      answer,
      source: label.startsWith(p.name) ? label : `${p.name} v${p.version} (${label || "Knowledge base"})`,
    };
  };

/** Ground a drafted answer in a certification / regulatory-scope fact. */
const fromCertification =
  (namePattern: RegExp, answer: (status: string, scope: string) => string) =>
  (org: OrgData): MatchResult | null => {
    const c = org.certifications.find((x) => namePattern.test(x.name));
    return c ? { answer: answer(c.status, c.scope), source: `${c.name} (${sourceLabel(c)})` } : null;
  };

// Ordered: specific patterns first, generic ones last.
const RULES: Rule[] = [
  { test: /soc\s*2|soc2|ssae\s*18|isae\s*3402/i, build: fromQa("qa-soc2") },
  {
    test: /nis\s*2|nis2|cyber\s*fundamentals|cyfun/i,
    build: fromCertification(
      /nis2/i,
      (status, scope) =>
        `Yes — Lumeo Software NV is in scope of NIS2 as an important entity under the Belgian NIS2 Act. ${scope}. ${status}. Our incident response process implements the 24-hour early warning, 72-hour notification and one-month final report duties towards the CCB.`
    ),
  },
  { test: /iso\s*\/?\s*(iec\s*)?27001|certif|statement of applicability|\bsoa\b/i, build: fromQa("qa-iso") },
  { test: /art(icle|\.)?\s*30|contractual (provisions|clauses)|key contractual|contract(ual)? (terms|requirements)/i, build: fromQa("qa-audit-rights") },
  { test: /audit rights|right to audit|access rights.{0,40}(authorit|auditor)|competent authorit|regulator.{0,30}access/i, build: fromQa("qa-audit-rights") },
  {
    test: /access review|recertif|access rights|user access|joiner|leaver|revok|deprovision/i,
    build: fromQa("qa-access-reviews"),
  },
  { test: /\bexit\b|termination.{0,40}(data|return|deletion)|data return|deletion of.{0,20}data|return of.{0,20}data/i, build: fromQa("qa-exit") },
  { test: /sub[- ]?contract|outsourc/i, build: fromQa("qa-subcontracting") },
  {
    test: /sub[- ]?processor|hosted|hosting|data (centre|center) location|where.{0,40}(data|stored|processed)|residen|\beea\b|\beu\b.{0,20}(data|host|region)|country|region/i,
    build: fromQa("qa-hosting"),
  },
  { test: /encrypt|cryptograph|key management|\bkeys?\b.{0,20}(manag|rotat)/i, build: fromQa("qa-encryption") },
  { test: /\bmfa\b|multi[- ]?factor|two[- ]?factor|\b2fa\b|passkey|fido/i, build: fromQa("qa-mfa") },
  {
    test: /privileged|admin(istrator)? access|\bpim\b|just[- ]in[- ]time|break[- ]?glass/i,
    build: fromControl(
      "LUM-AC-03",
      "Privileged roles in Entra ID and Azure are eligible-only and activated just-in-time through Privileged Identity Management, with approval, a documented justification and a maximum window of four hours; permanent privileged assignments are not permitted. Two break-glass accounts are stored offline, excluded from conditional access and monitored for any use. Privileged access is recertified quarterly alongside standard access."
    ),
  },
  {
    test: /incident.{0,60}(notif|report|inform|communicat)|notif.{0,40}(incident|breach)|breach notification|major (ict[- ]related )?incident/i,
    build: fromQa("qa-incident-notification"),
  },
  {
    test: /incident (response|management|handling)|security incident|handle.{0,20}incident/i,
    build: fromControl(
      "LUM-IR-01",
      "Yes — we operate a documented Incident Response Plan (v2.1) with a severity matrix (S1–S4), named roles (incident manager, communications, DPO), 24/7 on-call escalation and evidence handling. Affected customers are notified within 24 hours; NIS2 reporting to the CCB follows the 24h/72h/1-month clock and GDPR breach notification the 72-hour rule. Post-incident reviews are mandatory for S1/S2 incidents and an annual tabletop exercise is performed."
    ),
  },
  { test: /backup|disaster|recovery|\brto\b|\brpo\b|continuity|failover/i, build: fromQa("qa-backup-dr") },
  { test: /penetration|pen[- ]?test|ethical hack|red team/i, build: fromQa("qa-pentest") },
  { test: /vulnerab|patch|remediation (sla|timeline)/i, build: fromQa("qa-vuln-sla") },
  { test: /\blog(ging|s)?\b|siem|security monitoring|monitor/i, build: fromQa("qa-logging") },
  { test: /training|awareness|phishing simulation/i, build: fromQa("qa-training") },
  { test: /\bdpo\b|gdpr|data protection officer|personal data|privacy|data subject/i, build: fromQa("qa-gdpr") },
  { test: /sdlc|secure (software )?development|code review|devsecops|secure coding/i, build: fromQa("qa-sdlc") },
  { test: /screening|background check|vetting|criminal record/i, build: fromQa("qa-screening") },
  { test: /physical|data cent(re|er)|office security|badge/i, build: fromQa("qa-physical") },
  {
    test: /change (management|control)|release management|deployment approval/i,
    build: fromControl(
      "LUM-SD-02",
      "Yes — every production change is recorded as a Jira change ticket linked to its pull request, risk-classified and approved by the service owner before deployment. Emergency changes are approved by the on-call lead and reviewed within two working days. Customer-visible changes are announced through the release notes."
    ),
  },
  {
    test: /classif|retention|data (deletion|disposal|lifecycle)/i,
    build: fromControl(
      "LUM-DP-01",
      "Data is classified as Public, Internal, Confidential or Restricted and handled per the Data Protection Policy; customer contract data is Restricted. Retention follows the documented schedule: customer data is deleted within 90 days of contract termination unless legally retained, with backups expiring within a further 35 days."
    ),
  },
  {
    test: /third[- ]?part|supplier|vendor (management|risk)|due diligence/i,
    build: fromControl(
      "LUM-TP-01",
      "Suppliers are risk-classified before onboarding (critical / important / standard) based on data access and service criticality. Critical suppliers — Microsoft, SignaTrust, Datadog, GitHub and Officient — have security and audit clauses, a DPA where personal data is processed, and are reassessed annually against their assurance reports (ISO 27001, SOC 2, eIDAS conformity assessment)."
    ),
  },
  {
    test: /asset (management|inventory|register)|inventory|cmdb/i,
    build: fromControl(
      "LUM-AM-01",
      "Endpoints are inventoried in Intune, Azure resources in Azure Resource Graph (tagged with owner, environment and data classification) and applications in the ISMS application register. A programme is under way to complete owner attribution for the application register and to introduce an attested review cycle."
    ),
  },
  {
    test: /risk (assessment|management|register)|risk analysis/i,
    build: fromControl(
      "LUM-GOV-02",
      "Information security risks are assessed at least annually and on significant change using our ISO 27005-based Risk Management Procedure. Risks above appetite receive a treatment plan with an owner and due date, tracked in the risk register and reported to the quarterly Security Steering Committee."
    ),
  },
  {
    test: /governance|steering committee|management review|\bisms\b/i,
    build: fromControl(
      "LUM-GOV-01",
      "The CISO owns the ISMS on behalf of the management team. Security objectives, the risk register and the Statement of Applicability are reviewed at the quarterly Security Steering Committee (CEO, CTO, COO, CISO, DPO) and at the annual management review; internal audits follow a three-year programme."
    ),
  },
  {
    test: /acceptable use|generative ai|\bai\b|chatgpt|copilot/i,
    build: fromPolicy(
      "acceptable-use",
      "Use of Lumeo equipment, accounts and Microsoft 365 is governed by the Acceptable Use Policy, which also covers generative AI tools: only approved tools may be used, and customer or confidential data may not be entered into unapproved AI services. Managed devices only; monitoring is disclosed to staff."
    ),
  },
];

export function mockQuestionnaire(
  input: Record<string, string>,
  org: OrgData
): unknown {
  const questions = splitQuestions(input.questionnaire ?? "");

  const items = questions.map((question) => {
    for (const rule of RULES) {
      if (!rule.test.test(question)) continue;
      const match = rule.build(org);
      if (!match) continue;
      return {
        question,
        answer: match.answer,
        source_note: match.source,
        confidence: "confident" as const,
        needs_from_analyst: null,
      };
    }
    return {
      question,
      answer:
        "The current answer library and control set do not cover this question, so no answer has been drafted.",
      source_note: "No matching source in the knowledge base",
      confidence: "unsure" as const,
      needs_from_analyst:
        "Provide the answer for this question and consider adding it to the answer library for future questionnaires.",
    };
  });

  return { items };
}
