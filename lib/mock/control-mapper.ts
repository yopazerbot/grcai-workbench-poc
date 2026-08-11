import { FRAMEWORKS } from "@/lib/frameworks";
import { frameworkFromInput } from "@/lib/agents/control-mapper";
import type { OrgData } from "@/lib/org-context";

// Hand-curated coverage mappings per framework requirement, written the way a
// coverage assessment for a certified org actually reads: the ISO view is
// mostly green with surveillance-audit-style findings, while the substantive
// gaps sit in the DORA/NIS2-specific obligations an ISO ISMS doesn't give you
// for free (incident-reporting clocks, register of information, TLPT,
// effectiveness assessment). Findings deliberately echo other agents' seeded
// data (incomplete asset ownership, awareness completion below target,
// descoped DR test) so the demo tells one coherent story.

interface Mapping {
  controls: string[];
  coverage: "full" | "partial" | "none";
  rationale: string;
  gap?: string;
}

const ISO: Record<string, Mapping> = {
  "A.5.1": {
    controls: [],
    coverage: "full",
    rationale:
      "Satisfied at ISMS level rather than by a register control: the Information Security Policy v4.2 and the topic-specific policies are Management Board-approved, communicated at onboarding with annual re-attestation, and reviewed on a yearly cycle — evidenced through the certification and surveillance audits.",
  },
  "A.5.9": {
    controls: [],
    coverage: "partial",
    rationale:
      "Inventories exist per platform (Intune device inventory, Azure/AWS asset inventories, the application register in the ISMS), but ownership fields are incomplete for part of the application estate and the consolidated register has no owner-attested review cycle.",
    gap: "Assign the remaining owners and introduce a quarterly owner attestation of the consolidated register.",
  },
  "A.5.15": {
    controls: ["AFG-AC-01", "AFG-PH-01"],
    coverage: "full",
    rationale:
      "AFG-AC-01 implements role-based least privilege with automated joiner/mover/leaver provisioning from Personio and quarterly access recertification; the physical leg of the requirement is carried by badge-controlled zones under AFG-PH-01.",
  },
  "A.5.19": {
    controls: ["AFG-TP-01"],
    coverage: "full",
    rationale:
      "AFG-TP-01 risk-classifies suppliers before onboarding, mandates contractual security clauses and reassesses critical providers annually — matching the requirement's supplier lifecycle intent.",
  },
  "A.5.23": {
    controls: ["AFG-TP-01"],
    coverage: "partial",
    rationale:
      "Cloud providers pass through supplier assessment (AFG-TP-01) and the M365/Azure/AWS estate is centrally administered, but there is no cloud-specific standard defining per-service security requirements, shared-responsibility ownership and exit strategy, and SaaS intake outside procurement is periodically discovered.",
    gap: "Adopt a cloud services standard (security requirements, responsibility mapping and exit criteria per service) and route all SaaS intake through it.",
  },
  "A.5.24": {
    controls: ["AFG-IR-01"],
    coverage: "full",
    rationale:
      "AFG-IR-01 provides a documented incident response plan with a severity matrix, escalation paths, 24/7 on-call and an annual tabletop exercise — planning and preparation as the requirement intends.",
  },
  "A.5.30": {
    controls: ["AFG-BC-01", "AFG-BC-02"],
    coverage: "partial",
    rationale:
      "The annual failover exercise (AFG-BC-02) validated RTO 4h / RPO 15min for the portfolio management platform, and backups run under AFG-BC-01. The client reporting portal was descoped from the last test window, so its warm-standby recovery is asserted but not yet demonstrated.",
    gap: "Include the client reporting portal in the next failover test; until then treat its recovery objectives as unverified.",
  },
  "A.6.1": {
    controls: ["AFG-HR-01"],
    coverage: "full",
    rationale:
      "AFG-HR-01 requires role-proportionate pre-employment screening, completed and registered before access is provisioned.",
  },
  "A.6.3": {
    controls: ["AFG-HR-02"],
    coverage: "partial",
    rationale:
      "Annual training and quarterly phishing simulations run under AFG-HR-02, but completion currently sits at 91% against the 95% internal target and the Q2 simulation slipped a quarter — the control operates, its cadence is not fully evidenced this cycle.",
    gap: "Chase outstanding completions and re-anchor the simulation calendar; report completion monthly to management until back above target.",
  },
  "A.7.1": {
    controls: ["AFG-PH-01"],
    coverage: "full",
    rationale:
      "AFG-PH-01 defines badge-controlled perimeters with visitor registration and separately secured server rooms with access logging across all three offices.",
  },
  "A.8.2": {
    controls: ["AFG-AC-01", "AFG-AC-02"],
    coverage: "full",
    rationale:
      "Privileged access requires separate PIM-eligible roles under AFG-AC-01, phishing-resistant FIDO2 authentication for administrators under AFG-AC-02, and quarterly privileged-access reviews.",
  },
  "A.8.5": {
    controls: ["AFG-AC-02"],
    coverage: "full",
    rationale:
      "AFG-AC-02 enforces tenant-wide MFA through conditional access, blocks legacy authentication and mandates phishing-resistant methods for administrative roles.",
  },
  "A.8.7": {
    controls: ["AFG-LM-02"],
    coverage: "partial",
    rationale:
      "CrowdStrike Falcon runs across the endpoint fleet with detections routed into the Sentinel analytics reviewed under AFG-LM-02. The preventive side — sensor baseline, exclusion governance, coverage monitoring — lives in operational runbooks; this is the one area where practice is ahead of the documented control set.",
    gap: "Register an endpoint protection control owning sensor coverage, exclusion approvals and response expectations.",
  },
  "A.8.8": {
    controls: ["AFG-VM-01", "AFG-VM-02"],
    coverage: "full",
    rationale:
      "Continuous authenticated scanning with severity-based remediation SLAs (AFG-VM-01) plus ringed patching and monthly golden-image rebuilds (AFG-VM-02) cover identification through treatment.",
  },
  "A.8.9": {
    controls: ["AFG-VM-02"],
    coverage: "partial",
    rationale:
      "Monthly image rebuilds (AFG-VM-02) and Intune compliance policies give endpoints a managed baseline, but there is no CIS-mapped hardening standard and no drift monitoring for cloud workloads — Defender for Cloud recommendations are triaged ad hoc.",
    gap: "Adopt CIS-mapped baselines with drift monitoring for endpoints and cloud workloads, and give recommendation triage an owner and an SLA.",
  },
  "A.8.13": {
    controls: ["AFG-BC-01"],
    coverage: "full",
    rationale:
      "AFG-BC-01 provides daily encrypted backups to an immutable repository with monthly automated restore verification.",
  },
  "A.8.15": {
    controls: ["AFG-LM-01", "AFG-LM-02"],
    coverage: "full",
    rationale:
      "Central collection into Sentinel with 12-month retention and source-health monitoring (AFG-LM-01), analysed through an alerted, weekly-reviewed detection baseline (AFG-LM-02).",
  },
  "A.8.24": {
    controls: ["AFG-CR-01", "AFG-CR-02"],
    coverage: "full",
    rationale:
      "TLS 1.2+ enforced in transit (AFG-CR-01) and AES-256 at rest with managed keys and annual rotation (AFG-CR-02), governed by the Cryptography & Key Management Policy.",
  },
  "A.8.25": {
    controls: ["AFG-SD-01"],
    coverage: "full",
    rationale:
      "AFG-SD-01 enforces peer-reviewed pull requests, CI security scanning, branch protection and signed deployment pipelines across the development estate.",
  },
};

const DORA: Record<string, Mapping> = {
  "Art. 5": {
    controls: [],
    coverage: "partial",
    rationale:
      "ISMS governance gives the Management Board policy approval and an annual management review, but the DORA-specific duties are open: the ICT risk management function is not formally allocated, there is no defined board reporting cadence for ICT risk, and management-body training on ICT risk has not been delivered.",
    gap: "Allocate the ICT risk function in the governance charter, set a quarterly board reporting cadence and schedule management-body ICT risk training.",
  },
  "Art. 6": {
    controls: [],
    coverage: "partial",
    rationale:
      "The certified ISMS supplies the documented risk management core, but the DORA framework document — ICT risk appetite, tolerance thresholds for disruptions to critical or important functions, and the annual review commitment — exists only in draft and is not board-approved.",
    gap: "Finalise and approve the ICT risk management framework document and tie its review to the ISMS management review cycle.",
  },
  "Art. 8": {
    controls: [],
    coverage: "partial",
    rationale:
      "Platform inventories exist (Intune, cloud asset inventories, the application register), but the mapping from ICT assets and third-party dependencies to critical or important functions is complete only for portfolio management — client reporting and fund administration dependencies are not yet documented.",
    gap: "Complete the function-to-asset dependency mapping for all critical or important functions, including third-party links.",
  },
  "Art. 9": {
    controls: ["AFG-AC-01", "AFG-AC-02", "AFG-CR-01", "AFG-CR-02", "AFG-VM-02"],
    coverage: "full",
    rationale:
      "Access management with recertification, tenant-wide MFA, encryption in transit and at rest, and ringed patching with monthly image rebuilds together implement the protection and prevention measures Art. 9 requires.",
  },
  "Art. 10": {
    controls: ["AFG-LM-01", "AFG-LM-02"],
    coverage: "full",
    rationale:
      "Central log collection with daily source-health monitoring (AFG-LM-01) and an alerted, weekly-reviewed detection baseline (AFG-LM-02) provide the prompt, multi-layered detection capability.",
  },
  "Art. 11": {
    controls: ["AFG-IR-01", "AFG-BC-01", "AFG-BC-02"],
    coverage: "full",
    rationale:
      "The incident response plan plus backup and annually tested disaster recovery (RTO 4h / RPO 15min for the portfolio management platform) implement response and recovery with defined objectives.",
  },
  "Art. 12": {
    controls: ["AFG-BC-01", "AFG-BC-02"],
    coverage: "full",
    rationale:
      "Daily encrypted, immutable backups with monthly restore verification and an annual full failover exercise satisfy the backup and restoration requirements.",
  },
  "Art. 13": {
    controls: ["AFG-IR-01", "AFG-HR-02"],
    coverage: "partial",
    rationale:
      "Post-incident reviews are mandatory under AFG-IR-01 and feed awareness content (AFG-HR-02), but there is no structured loop that turns incident and test findings into framework updates with tracked actions — reviews currently end at the ticket.",
    gap: "Introduce a lessons-learned register with owners and due dates, reviewed at the quarterly security committee.",
  },
  "Art. 14": {
    controls: ["AFG-IR-01"],
    coverage: "partial",
    rationale:
      "AFG-IR-01 covers internal escalation and the duty to notify authorities, but external communication for major incidents — client notification templates, spokesperson assignment, coordination with distribution partners — is not prepared.",
    gap: "Add a communication playbook with pre-approved client and regulator templates and named spokespersons; exercise it in the next tabletop.",
  },
  "Art. 17": {
    controls: ["AFG-IR-01"],
    coverage: "full",
    rationale:
      "AFG-IR-01 defines detection, management, logging and notification of ICT incidents with severity classification, escalation paths and root-cause follow-up.",
  },
  "Art. 18-19": {
    controls: ["AFG-IR-01"],
    coverage: "partial",
    rationale:
      "Incidents are severity-classified under AFG-IR-01, but the DORA materiality criteria from the RTS have not been adopted into the classification matrix, and the initial/intermediate/final report templates with their 4h/24h/72h/1-month clocks have never been drilled.",
    gap: "Adopt the RTS classification criteria, prepare the report templates and run a reporting drill against the regulatory timelines.",
  },
  "Art. 24-26": {
    controls: ["AFG-VM-01"],
    coverage: "partial",
    rationale:
      "Continuous scanning and the annual external penetration test run under AFG-VM-01, but they are not consolidated into a documented resilience testing programme mapped to critical or important functions, and the TLPT applicability assessment with the competent authority is still open.",
    gap: "Document the testing programme, map its coverage to critical or important functions and close out TLPT applicability with the authority.",
  },
  "Art. 28": {
    controls: ["AFG-TP-01"],
    coverage: "partial",
    rationale:
      "AFG-TP-01 risk-classifies ICT providers and reassesses critical ones annually, and the first register of information was submitted in 2025 — assembled manually from spreadsheets. Producing it repeatably in the ESA template and capturing subcontracting chains below direct providers remain open.",
    gap: "Move the register of information onto a maintained process (owner, tooling, quarterly refresh) and extend it with material subcontractors.",
  },
  "Art. 30": {
    controls: ["AFG-TP-01"],
    coverage: "partial",
    rationale:
      "New and renewed contracts carry the DORA-mandated provisions via the AFG-TP-01 clause library, but a substantial share of critical-provider contracts predate DORA and still lack audit and access rights, exit assistance and subcontracting notification clauses.",
    gap: "Remediate legacy critical-provider contracts at the next renewal wave, with an interim, documented risk acceptance per contract.",
  },
};

const NIS2: Record<string, Mapping> = {
  "Art. 21(2)(a)": {
    controls: [],
    coverage: "partial",
    rationale:
      "The ISMS runs an annual, method-based risk assessment and the policy set is board-approved; what Art. 21(2)(a) additionally expects — documented risk analyses at the level of individual key systems — stays at process level today.",
    gap: "Extend the annual cycle with per-system risk analyses for the portfolio management platform, the client portal and the fund administration links.",
  },
  "Art. 21(2)(b)": {
    controls: ["AFG-IR-01"],
    coverage: "full",
    rationale:
      "AFG-IR-01 covers prevention through detection, analysis, containment, response and recovery, with CSIRT notification steps built into the plan.",
  },
  "Art. 21(2)(c)": {
    controls: ["AFG-BC-01", "AFG-BC-02", "AFG-IR-01"],
    coverage: "full",
    rationale:
      "Backup management (AFG-BC-01) and annually tested disaster recovery with defined recovery objectives (AFG-BC-02) cover continuity; crisis roles and escalation tiers are assigned in the incident response plan.",
  },
  "Art. 21(2)(d)": {
    controls: ["AFG-TP-01"],
    coverage: "full",
    rationale:
      "Supplier risk classification before onboarding, contractual security clauses and annual reassessment of critical providers address the direct-supplier security aspects the measure names.",
  },
  "Art. 21(2)(e)": {
    controls: ["AFG-SD-01", "AFG-VM-01"],
    coverage: "partial",
    rationale:
      "Secure development (AFG-SD-01) and vulnerability management with severity-based SLAs (AFG-VM-01) cover the internal leg; the measure also expects vulnerability handling and disclosure, and there is no published channel or policy for external reporters.",
    gap: "Publish a coordinated vulnerability disclosure policy (security.txt, intake mailbox, safe-harbour wording) and route external reports into the AFG-VM-01 SLAs.",
  },
  "Art. 21(2)(f)": {
    controls: [],
    coverage: "none",
    rationale:
      "No internal procedure measures whether the security measures themselves work: there is no control testing programme, no effectiveness KPIs and no management reporting on measure performance. External ISO surveillance audits sample the ISMS but are not the entity's own effectiveness assessment.",
    gap: "Stand up an effectiveness programme: an annual control testing plan, a small KPI set (patch SLA attainment, recertification completion, detection coverage) and quarterly management reporting.",
  },
  "Art. 21(2)(g)": {
    controls: ["AFG-HR-02"],
    coverage: "partial",
    rationale:
      "Training and phishing simulations operate under AFG-HR-02, but completion sits at 91% against the 95% target and the Q2 simulation slipped a quarter — cyber hygiene is implemented, its cadence is not currently evidenced.",
    gap: "Chase outstanding completions and restore the quarterly simulation cadence (same remediation as the ISO A.6.3 finding).",
  },
  "Art. 21(2)(h)": {
    controls: ["AFG-CR-01", "AFG-CR-02"],
    coverage: "full",
    rationale:
      "The Cryptography & Key Management Policy with enforced TLS 1.2+ in transit and AES-256 at rest, including key rotation, covers the cryptography measure.",
  },
  "Art. 21(2)(i)": {
    controls: ["AFG-HR-01", "AFG-AC-01"],
    coverage: "partial",
    rationale:
      "Screening (AFG-HR-01) and access control with quarterly recertification (AFG-AC-01) operate; the asset management leg shares the ISO A.5.9 finding — incomplete ownership in the consolidated register.",
    gap: "Close the register ownership gap (same remediation as ISO A.5.9); the HR and access legs need no action.",
  },
  "Art. 21(2)(j)": {
    controls: ["AFG-AC-02"],
    coverage: "full",
    rationale:
      "Tenant-wide MFA with phishing-resistant methods for administrators satisfies the authentication measure; voice, video and text run over the TLS-secured M365 estate.",
  },
};

const TABLES = { iso27001: ISO, dora: DORA, nis2: NIS2 } as const;

export function mockControlMapper(input: Record<string, string>, _org: OrgData): unknown {
  const framework = frameworkFromInput(input);
  const table = TABLES[framework.key] ?? {};

  const items = framework.requirements.map((req) => {
    const m: Mapping = table[req.id] ?? {
      controls: [],
      coverage: "none",
      rationale: "No mapping recorded for this requirement in the current register.",
      gap: "Assess this requirement against the control register.",
    };
    return {
      requirement_id: req.id,
      requirement_title: req.title,
      covering_controls: m.controls,
      coverage: m.coverage,
      rationale: m.rationale,
      gap_note: m.gap ?? null,
      source_note: `Internal control register + ${FRAMEWORKS[framework.key].name}`,
    };
  });

  return { items };
}
