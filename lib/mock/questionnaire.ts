import type { OrgData, QaRecord } from "@/lib/org-context";

// Input-aware simulated generator: splits the actually-pasted questions and
// answers each from the seeded knowledge base via keyword matching. Unmatched
// questions become "unsure" items — mirroring the live agent's behaviour.

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

const fromQa =
  (id: string) =>
  (org: OrgData): MatchResult | null => {
    const pair = qa(org, id);
    return pair ? { answer: pair.answer, source: `Past answer — ${pair.source}` } : null;
  };

const control = (org: OrgData, id: string) => org.controls.find((c) => c.id === id);

const RULES: Rule[] = [
  {
    test: /soc\s*2/i,
    build: () => ({
      answer:
        "No — we do not hold a SOC 2 Type II report. Client assurance is provided via our ISO/IEC 27001:2022 certificate, the Statement of Applicability and an annual bridge letter, available under NDA.",
      source: "Certifications & regulatory scope",
    }),
  },
  { test: /iso\s*\/?\s*(iec\s*)?27001|certif/i, build: fromQa("qa-iso") },
  { test: /\bmfa\b|multi[- ]?factor|two[- ]?factor|\b2fa\b/i, build: fromQa("qa-mfa") },
  {
    test: /encrypt|cryptograph/i,
    build: (org) => {
      const pair = qa(org, "qa-encryption-rest");
      if (!pair) return null;
      return {
        answer: `${pair.answer} In transit, all external and internal service traffic uses TLS 1.2 or higher (TLS 1.3 where supported) with HSTS on public endpoints.`,
        source: `Past answer — ${pair.source}; Control AFG-CR-01 — Encryption in transit`,
      };
    },
  },
  { test: /penetration|pen[- ]?test/i, build: fromQa("qa-pentest") },
  {
    test: /residen|where.{0,30}(data|hosted|stored|processed)|data.{0,20}(locat|hosted|stored)|hosting location|\beea\b/i,
    build: fromQa("qa-data-location"),
  },
  { test: /sub[- ]?processor/i, build: fromQa("qa-subprocessors") },
  {
    test: /(incident|breach).{0,40}(notif|report|inform)|notif.{0,40}(incident|breach)/i,
    build: fromQa("qa-incident-notification"),
  },
  {
    test: /incident response|security incident/i,
    build: (org) => {
      const c = control(org, "AFG-IR-01");
      return c
        ? {
            answer:
              "Yes — we operate a documented incident response plan with a severity matrix, 24/7 on-call rota and defined escalation and notification paths (including DORA major-incident reporting). Post-incident reviews are mandatory for high-severity incidents and an annual tabletop exercise is performed.",
            source: `Control ${c.id} — ${c.name}`,
          }
        : null;
    },
  },
  {
    test: /backup|disaster|recovery|\brto\b|\brpo\b|continuity/i,
    build: fromQa("qa-backup-dr"),
  },
  {
    test: /access review|recertif|access rights|user access|joiner|leaver/i,
    build: fromQa("qa-access-reviews"),
  },
  { test: /training|awareness/i, build: fromQa("qa-training") },
  { test: /vulnerab|patch/i, build: fromQa("qa-vuln-sla") },
  { test: /\bdpo\b|gdpr|data protection|privacy/i, build: fromQa("qa-gdpr") },
  {
    test: /\blog(ging|s)?\b|siem|security monitoring/i,
    build: (org) => {
      const c = control(org, "AFG-LM-01");
      return c
        ? {
            answer:
              "Yes — security-relevant logs from identity, endpoints, cloud platforms and applications are collected centrally in Microsoft Sentinel (12 months hot retention, 24 months archive). A weekly structured log review is performed with documented sign-off, and high-severity alerts page the 24/7 on-call engineer.",
            source: "Controls AFG-LM-01 — Central log collection; AFG-LM-02 — Log review & alerting",
          }
        : null;
    },
  },
  {
    test: /sdlc|secure (software )?development|code review/i,
    build: (org) => {
      const c = control(org, "AFG-SD-01");
      return c
        ? {
            answer:
              "Yes — all production code changes require peer-reviewed pull requests with passing CI (SAST, dependency and secret scanning). Branch protection is enforced on production repositories and deployments run only from protected branches via signed pipelines.",
            source: `Control ${c.id} — ${c.name}`,
          }
        : null;
    },
  },
  {
    test: /third[- ]?part|supplier|vendor/i,
    build: (org) => {
      const c = control(org, "AFG-TP-01");
      return c
        ? {
            answer:
              "Suppliers with access to our data or systems are risk-classified before onboarding, with security and audit clauses in contracts. Critical ICT providers are recorded in the DORA register of information and reassessed annually.",
            source: `Control ${c.id} — ${c.name}; Supplier & Third-Party Security Policy`,
          }
        : null;
    },
  },
  {
    test: /screening|background check/i,
    build: (org) => {
      const c = control(org, "AFG-HR-01");
      return c
        ? {
            answer:
              "Yes — all new joiners undergo pre-employment screening proportionate to their role (identity verification, reference checks and criminal record extracts where lawful). Completion is registered before system access is granted.",
            source: `Control ${c.id} — ${c.name}`,
          }
        : null;
    },
  },
  {
    test: /physical/i,
    build: (org) => {
      const c = control(org, "AFG-PH-01");
      return c
        ? {
            answer:
              "Our offices are secured with badge access and visitor registration; server and network rooms have separate badge groups with access logging. Badge rights are removed as part of the leaver flow and access lists are reviewed twice a year.",
            source: `Control ${c.id} — ${c.name}`,
          }
        : null;
    },
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
