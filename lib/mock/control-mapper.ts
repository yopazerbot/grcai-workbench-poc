import { FRAMEWORKS } from "@/lib/frameworks";
import { frameworkFromInput } from "@/lib/agents/control-mapper";
import type { OrgData } from "@/lib/org-context";

// Hand-curated coverage mappings per framework requirement. The recurring gap
// thread (asset inventory / configuration management not formalised as
// register controls) is intentional — it gives the demo a coherent story.

interface Mapping {
  controls: string[];
  coverage: "full" | "partial" | "none";
  rationale: string;
  gap?: string;
}

const ISO: Record<string, Mapping> = {
  "A.5.1": {
    controls: [],
    coverage: "partial",
    rationale:
      "A full policy set exists (Information Security Policy v4.2 and topic policies, reviewed annually by the Management Board), but no register control formalises the policy lifecycle itself.",
    gap: "Add a policy management control covering approval, communication and review cadence.",
  },
  "A.5.9": {
    controls: [],
    coverage: "partial",
    rationale:
      "An asset register / CMDB summary is maintained, but no register control governs inventory completeness, ownership and review.",
    gap: "Introduce an asset management control with defined owners and a review cycle.",
  },
  "A.5.15": {
    controls: ["AFG-AC-01"],
    coverage: "full",
    rationale:
      "AFG-AC-01 implements least-privilege RBAC with automated joiner/mover/leaver flows and quarterly recertification, matching the requirement's intent.",
  },
  "A.5.19": {
    controls: ["AFG-TP-01"],
    coverage: "full",
    rationale:
      "AFG-TP-01 risk-classifies suppliers before onboarding, mandates contractual security clauses and reassesses critical providers annually.",
  },
  "A.5.24": {
    controls: ["AFG-IR-01"],
    coverage: "full",
    rationale:
      "AFG-IR-01 provides a documented IR plan with severity matrix, escalation paths, 24/7 on-call and an annual tabletop exercise.",
  },
  "A.5.30": {
    controls: ["AFG-BC-01", "AFG-BC-02"],
    coverage: "full",
    rationale:
      "Backup (AFG-BC-01) and annual full DR failover testing against RTO/RPO targets (AFG-BC-02) evidence ICT readiness for continuity.",
  },
  "A.6.1": {
    controls: ["AFG-HR-01"],
    coverage: "full",
    rationale:
      "AFG-HR-01 requires role-proportionate pre-employment screening, registered before access is granted.",
  },
  "A.6.3": {
    controls: ["AFG-HR-02"],
    coverage: "full",
    rationale:
      "AFG-HR-02 mandates annual awareness training, onboarding modules and quarterly phishing simulations with tracked completion.",
  },
  "A.7.1": {
    controls: ["AFG-PH-01"],
    coverage: "full",
    rationale:
      "AFG-PH-01 secures offices with badge access, visitor registration and separately controlled server rooms with access logging.",
  },
  "A.8.2": {
    controls: ["AFG-AC-01", "AFG-AC-02"],
    coverage: "full",
    rationale:
      "Privileged access requires separate PIM-eligible roles (AFG-AC-01) with FIDO2 authentication for admins (AFG-AC-02) and quarterly privileged reviews.",
  },
  "A.8.5": {
    controls: ["AFG-AC-02"],
    coverage: "full",
    rationale:
      "AFG-AC-02 enforces tenant-wide MFA via conditional access with phishing-resistant methods for administrators and blocked legacy authentication.",
  },
  "A.8.7": {
    controls: [],
    coverage: "partial",
    rationale:
      "CrowdStrike Falcon EDR is operated on all endpoints per the asset register, but no register control formalises anti-malware requirements and response.",
    gap: "Formalise an endpoint protection control referencing the EDR platform, coverage monitoring and response expectations.",
  },
  "A.8.8": {
    controls: ["AFG-VM-01", "AFG-VM-02"],
    coverage: "full",
    rationale:
      "Continuous scanning with severity-based SLAs (AFG-VM-01) plus ringed patching and monthly image rebuilds (AFG-VM-02) manage technical vulnerabilities end to end.",
  },
  "A.8.9": {
    controls: [],
    coverage: "none",
    rationale:
      "No register control establishes or monitors security configuration baselines for endpoints, servers or cloud workloads.",
    gap: "Introduce a configuration/hardening baseline control (e.g. CIS benchmarks with drift monitoring via Intune and cloud posture tooling).",
  },
  "A.8.13": {
    controls: ["AFG-BC-01"],
    coverage: "full",
    rationale:
      "AFG-BC-01 provides daily encrypted backups to an immutable repository with monthly automated restore tests.",
  },
  "A.8.15": {
    controls: ["AFG-LM-01", "AFG-LM-02"],
    coverage: "full",
    rationale:
      "Central collection in Sentinel with 12-month retention (AFG-LM-01) and weekly reviewed, alerted analytics (AFG-LM-02) satisfy logging requirements.",
  },
  "A.8.24": {
    controls: ["AFG-CR-01", "AFG-CR-02"],
    coverage: "full",
    rationale:
      "TLS 1.2+ everywhere (AFG-CR-01) and AES-256 at rest with managed keys and annual rotation (AFG-CR-02), governed by the Cryptography & Key Management Policy.",
  },
  "A.8.25": {
    controls: ["AFG-SD-01"],
    coverage: "full",
    rationale:
      "AFG-SD-01 enforces peer-reviewed PRs, CI security scanning, branch protection and signed deployment pipelines.",
  },
};

const DORA: Record<string, Mapping> = {
  "Art. 5": {
    controls: [],
    coverage: "partial",
    rationale:
      "The Information Security Policy assigns ISMS oversight to the Management Board, but no register control operationalises DORA-specific governance reporting.",
    gap: "Define an ICT risk governance control covering management-body reporting and approval of the DORA framework.",
  },
  "Art. 6": {
    controls: [],
    coverage: "partial",
    rationale:
      "The ISO 27001-certified ISMS provides a documented risk framework, but DORA-specific framework documentation (mapping ICT risk appetite and tolerances) is still being assembled.",
    gap: "Extend ISMS risk documentation to explicitly satisfy the DORA ICT risk management framework requirements.",
  },
  "Art. 8": {
    controls: [],
    coverage: "partial",
    rationale:
      "An asset and technology stack summary exists, but identification and classification of ICT-supported functions and dependencies is not governed by a register control.",
    gap: "Introduce an asset and dependency identification control with business-function mapping.",
  },
  "Art. 9": {
    controls: ["AFG-AC-01", "AFG-AC-02", "AFG-CR-01", "AFG-CR-02", "AFG-VM-02"],
    coverage: "full",
    rationale:
      "Access management, MFA, encryption in transit and at rest, and ringed patching together implement the protection and prevention measures Art. 9 asks for.",
  },
  "Art. 10": {
    controls: ["AFG-LM-01", "AFG-LM-02"],
    coverage: "full",
    rationale:
      "Central log collection with daily source-health monitoring and an alerted, weekly-reviewed detection baseline provide prompt anomaly detection.",
  },
  "Art. 11": {
    controls: ["AFG-IR-01", "AFG-BC-01", "AFG-BC-02"],
    coverage: "full",
    rationale:
      "The IR plan plus backup and annually tested DR (RTO 4h / RPO 15min for the client platform) implement response and recovery capabilities.",
  },
  "Art. 12": {
    controls: ["AFG-BC-01", "AFG-BC-02"],
    coverage: "full",
    rationale:
      "Daily encrypted, immutable backups with monthly restore tests and an annual full failover test satisfy backup and restoration requirements.",
  },
  "Art. 13": {
    controls: ["AFG-IR-01", "AFG-HR-02"],
    coverage: "partial",
    rationale:
      "Post-incident reviews are mandatory (AFG-IR-01) and awareness training runs annually (AFG-HR-02), but lessons learned do not yet feed a documented framework-evolution cycle.",
    gap: "Formalise a lessons-learned loop from incidents and tests into ISMS and DORA framework updates.",
  },
  "Art. 17": {
    controls: ["AFG-IR-01"],
    coverage: "full",
    rationale:
      "AFG-IR-01 defines detection, management, logging and notification of ICT incidents with severity classification and escalation.",
  },
  "Art. 19": {
    controls: ["AFG-IR-01"],
    coverage: "partial",
    rationale:
      "The IR plan references DORA major-incident reporting duties, but classification thresholds and regulator report templates are not yet operationalised.",
    gap: "Operationalise DORA major-incident classification and the initial/intermediate/final report templates with timelines.",
  },
  "Art. 24-26": {
    controls: ["AFG-VM-01"],
    coverage: "partial",
    rationale:
      "Annual external penetration tests and continuous scanning run under AFG-VM-01, but threat-led penetration testing (TLPT) exists only as a readiness plan.",
    gap: "Stand up the resilience testing programme and schedule TLPT with the competent authority where required.",
  },
  "Art. 28": {
    controls: ["AFG-TP-01"],
    coverage: "full",
    rationale:
      "AFG-TP-01 maintains the register of information for ICT arrangements, risk-classifies providers and reassesses critical ICT providers annually with contractual audit rights.",
  },
};

const NIS2: Record<string, Mapping> = {
  "Art. 21(2)(a)": {
    controls: [],
    coverage: "partial",
    rationale:
      "The ISO-certified ISMS and policy set cover information system security policies, but risk analysis is not formalised as a register control.",
    gap: "Register a risk assessment control documenting method, cadence and acceptance criteria.",
  },
  "Art. 21(2)(b)": {
    controls: ["AFG-IR-01"],
    coverage: "full",
    rationale:
      "AFG-IR-01 covers prevention through detection, analysis, containment and response, with CSIRT notification steps included in the plan.",
  },
  "Art. 21(2)(c)": {
    controls: ["AFG-BC-01", "AFG-BC-02"],
    coverage: "full",
    rationale:
      "Backup management and annually tested disaster recovery with defined recovery objectives implement the continuity measures.",
  },
  "Art. 21(2)(d)": {
    controls: ["AFG-TP-01"],
    coverage: "full",
    rationale:
      "Supplier risk classification, contractual security clauses and annual reassessment of critical providers address supply chain security.",
  },
  "Art. 21(2)(e)": {
    controls: ["AFG-SD-01", "AFG-VM-01"],
    coverage: "partial",
    rationale:
      "Secure development (AFG-SD-01) and vulnerability management with SLAs (AFG-VM-01) are operating, but there is no coordinated vulnerability disclosure procedure for external reporters.",
    gap: "Publish a coordinated vulnerability disclosure (CVD) policy with an external reporting channel.",
  },
  "Art. 21(2)(f)": {
    controls: [],
    coverage: "none",
    rationale:
      "No register control or internal procedure assesses the effectiveness of cybersecurity risk-management measures; external ISO surveillance audits partially compensate but are not an internal assessment procedure.",
    gap: "Define an effectiveness assessment procedure (control testing programme, KPIs and management reporting).",
  },
  "Art. 21(2)(g)": {
    controls: ["AFG-HR-02"],
    coverage: "full",
    rationale:
      "Mandatory annual training, onboarding modules and quarterly phishing simulations implement cyber hygiene and training.",
  },
  "Art. 21(2)(h)": {
    controls: ["AFG-CR-01", "AFG-CR-02"],
    coverage: "full",
    rationale:
      "The Cryptography & Key Management Policy with enforced encryption in transit and at rest covers cryptography requirements.",
  },
  "Art. 21(2)(i)": {
    controls: ["AFG-HR-01", "AFG-AC-01"],
    coverage: "partial",
    rationale:
      "Screening (AFG-HR-01) and access control (AFG-AC-01) are operating; the asset management leg of this measure is not covered by a register control.",
    gap: "Close the asset management gap (shared with the ISO A.5.9 finding) with an owned, reviewed asset inventory control.",
  },
  "Art. 21(2)(j)": {
    controls: ["AFG-AC-02"],
    coverage: "full",
    rationale:
      "Tenant-wide MFA with phishing-resistant methods for administrators satisfies the multi-factor authentication measure; communications run over TLS-secured M365 services.",
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
