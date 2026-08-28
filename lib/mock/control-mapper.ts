import { FRAMEWORKS } from "@/lib/frameworks";
import { frameworkFromInput } from "@/lib/agents/control-mapper";
import type { OrgData } from "@/lib/org-context";

// Hand-curated coverage mappings per framework requirement for Lumeo
// Software NV, written the way a practitioner's coverage assessment reads.
// The ISO 27001 view is mostly green with surveillance-audit-style findings;
// NIS2 exposes one hard gap (effectiveness assessment) that an ISO ISMS does
// not give you for free; the SOC 2 view reflects a first-time posture where
// the observation period has to prove operating effectiveness. Findings
// deliberately echo the control register and the connected-system snapshots
// (asset owner fields, 88% awareness completion, the descoped e-signature
// service in the January 2026 failover, 12 non-compliant endpoints, the
// overdue BC/DR plan) so the demo tells one coherent story.

interface Mapping {
  controls: string[];
  coverage: "full" | "partial" | "none";
  rationale: string;
  gap?: string;
}

const SOURCE_DOC = "Information Security Control Register v2.3";

// ---------------------------------------------------------------------------
// ISO/IEC 27001:2022 — Annex A selection

const ISO: Record<string, Mapping> = {
  "A.5.1": {
    controls: ["LUM-GOV-01"],
    coverage: "full",
    rationale:
      "The requirement asks for management-approved, communicated and periodically reviewed policies. The Information Security Policy v3.0 (approved 2026-02-10) and the ten topic-specific policies are owned by the CISO under LUM-GOV-01, reviewed at the quarterly Security Steering Committee and the annual management review, and were confirmed at the April 2026 surveillance audit.",
  },
  "A.5.9": {
    controls: ["LUM-AM-01"],
    coverage: "partial",
    rationale:
      "An inventory with owners is required. LUM-AM-01 inventories endpoints in Intune, Azure resources in Azure Resource Graph (tagged with owner, environment and classification) and applications in the ISMS register — but owner fields are incomplete for part of the application register and the consolidated inventory has no attested review cycle, which is why the control sits in remediation.",
    gap: "Complete the missing owner fields in the application register and introduce a quarterly owner attestation of the consolidated inventory; track closure in the risk register.",
  },
  "A.5.15": {
    controls: ["LUM-AC-01", "LUM-PH-01"],
    coverage: "full",
    rationale:
      "Rules for logical and physical access are required. LUM-AC-01 grants access on least privilege through Entra ID role profiles with the Officient-driven joiner/mover/leaver flow and quarterly recertification; LUM-PH-01 covers the physical leg with badge access, visitor registration and a separately badged network room in Ghent.",
  },
  "A.5.19": {
    controls: ["LUM-TP-01"],
    coverage: "full",
    rationale:
      "Supplier information security risks must be managed. LUM-TP-01 risk-classifies suppliers before onboarding, mandates security, audit and DPA clauses, and reassesses the critical set (Microsoft, SignaTrust, Datadog, GitHub, Officient) annually against their ISO 27001, SOC 2 and eIDAS assurance reports, per the Supplier & Third-Party Security Policy v1.3.",
  },
  "A.5.23": {
    controls: ["LUM-TP-01"],
    coverage: "partial",
    rationale:
      "The control expects defined processes for acquisition, use, management and exit from cloud services. Cloud providers pass through the LUM-TP-01 supplier process and the Azure/M365 estate is centrally administered, but there is no cloud-services standard defining per-service security requirements, shared-responsibility ownership and exit criteria, and SaaS intake outside procurement is still discovered ad hoc.",
    gap: "Adopt a cloud-services standard (security requirements, responsibility mapping and exit/portability criteria per service) and route all SaaS intake through it; start with the critical suppliers already listed under LUM-TP-01.",
  },
  "A.5.24": {
    controls: ["LUM-IR-01"],
    coverage: "full",
    rationale:
      "Incident management must be planned and prepared. LUM-IR-01 provides the Incident Response Plan v2.1 with a severity matrix, defined roles (incident manager, communications, DPO), 24/7 escalation, customer notification within 24 hours and the CCB reporting clock, exercised through an annual tabletop.",
  },
  "A.5.30": {
    controls: ["LUM-BC-01", "LUM-BC-02"],
    coverage: "partial",
    rationale:
      "ICT readiness for continuity must be planned, implemented and tested. LUM-BC-01 backups run under monthly restore tests and LUM-BC-02 defines RTO 4h / RPO 15 min with a warm-standby AKS cluster in North Europe; the January 2026 failover validated the core platform in 3h 05m, but the e-signature service was descoped because of the SignaTrust integration, so its recovery is asserted rather than demonstrated.",
    gap: "Include the e-signature service (SignaTrust integration) in the next regional failover exercise; until then treat its RTO/RPO as unverified and record this as an open risk under LUM-BC-02.",
  },
  "A.6.1": {
    controls: ["LUM-HR-01"],
    coverage: "full",
    rationale:
      "Background checks proportional to risk are required before joining. LUM-HR-01 performs identity verification and reference checks for all joiners and a criminal-record extract for production and financial access roles, registered in Officient before accounts are created; the connector shows 17 of 17 recent joiners screened.",
  },
  "A.6.3": {
    controls: ["LUM-HR-02"],
    coverage: "partial",
    rationale:
      "Personnel must receive appropriate awareness training and updates. LUM-HR-02 mandates onboarding and annual training with quarterly phishing simulations and yearly secure coding training for engineers, but the 2026 annual campaign stands at 88% completion against the 95% target, with 24 staff outstanding.",
    gap: "Close the 2026 awareness campaign to the 95% target (24 staff outstanding, reminders in progress) and add a manager escalation step so completion is reached before the surveillance audit window.",
  },
  "A.7.1": {
    controls: ["LUM-PH-01"],
    coverage: "full",
    rationale:
      "Security perimeters must protect areas holding information assets. LUM-PH-01 uses badge access with visitor registration and escorted access at both offices and a separately badged, access-logged network room in Ghent; platform infrastructure sits entirely in Microsoft Azure data centres, so the office perimeter is the only one Lumeo operates.",
  },
  "A.8.2": {
    controls: ["LUM-AC-03"],
    coverage: "full",
    rationale:
      "Privileged access rights must be restricted and managed. LUM-AC-03 makes privileged roles in Entra ID and Azure eligible-only through Privileged Identity Management with just-in-time activation, approval and a 4-hour maximum, and keeps two monitored break-glass accounts offline; the connector shows 0 permanent assignments and 47 approved JIT activations in 30 days.",
  },
  "A.8.5": {
    controls: ["LUM-AC-02"],
    coverage: "full",
    rationale:
      "Secure authentication such as MFA must be implemented per the access control policy. LUM-AC-02 enforces MFA for all staff through Entra ID conditional access, blocks legacy authentication and requires FIDO2 keys for administrators and production engineers (38 keys registered), with a passkey rollout under way since July 2026.",
  },
  "A.8.7": {
    controls: ["LUM-VM-01", "LUM-VM-02"],
    coverage: "full",
    rationale:
      "Malware protection supported by user awareness is required. Microsoft Defender for Endpoint (P2) runs on all managed endpoints under LUM-VM-01 with Sentinel integration, Intune compliance under LUM-VM-02 blocks non-compliant devices from conditional access, and container images are scanned before deployment.",
  },
  "A.8.8": {
    controls: ["LUM-VM-01"],
    coverage: "full",
    rationale:
      "Vulnerability information must be obtained, exposure evaluated and measures taken. LUM-VM-01 scans endpoints, container images and AKS nodes continuously with Defender Vulnerability Management, covers code and dependencies with CodeQL and Dependabot, applies SLAs of 48h/7d/30d/90d and commissions an annual external penetration test (Redline Security, March 2026).",
  },
  "A.8.9": {
    controls: ["LUM-VM-02"],
    coverage: "partial",
    rationale:
      "Configurations must be established, documented, monitored and reviewed. LUM-VM-02 defines all Azure resources in Terraform against a hardened baseline with weekly drift reporting and follows Azure's managed maintenance for AKS and PostgreSQL, but endpoint configuration drifts: Intune reports 12 of 213 devices non-compliant (9 beyond the 14-day patch window, 3 not checked in for 30+ days) without documented exceptions.",
    gap: "Enforce the Intune compliance grace period so non-compliant devices lose conditional-access after 14 days, remediate the 12 drifting endpoints and document any exceptions; report endpoint compliance alongside the weekly Terraform drift report.",
  },
  "A.8.13": {
    controls: ["LUM-BC-01"],
    coverage: "full",
    rationale:
      "Backups must be maintained and regularly tested. LUM-BC-01 provides 35-day point-in-time restore with geo-redundant backup for PostgreSQL, geo-redundant Blob Storage with soft delete and versioning, daily AKS configuration backup and Veeam backup of Microsoft 365 to immutable storage, with a documented monthly restore test (last on 2026-08-05).",
  },
  "A.8.15": {
    controls: ["LUM-LM-01", "LUM-LM-02"],
    coverage: "full",
    rationale:
      "Logs must be produced, stored, protected and analysed. LUM-LM-01 collects identity, endpoint, Azure, AKS audit, application and SaaS admin logs in Microsoft Sentinel with 12 months hot and 24 months archive retention, and LUM-LM-02 analyses them through 86 MITRE-mapped rules, 24/7 paging and a signed-off weekly review.",
  },
  "A.8.24": {
    controls: ["LUM-CR-01", "LUM-CR-02"],
    coverage: "full",
    rationale:
      "Rules for cryptography and key management are required. The Cryptography & Key Management Standard v1.4 is implemented by LUM-CR-01 (TLS 1.2+ with TLS 1.3 preferred and HSTS at Azure Front Door, mutual authentication inside AKS) and LUM-CR-02 (AES-256 with customer-managed keys in HSM-backed Key Vault, annual rotation, logged key usage).",
  },
  "A.8.25": {
    controls: ["LUM-SD-01", "LUM-SD-02"],
    coverage: "full",
    rationale:
      "Secure development rules must be established and applied. LUM-SD-01 requires peer-reviewed pull requests with CodeQL, Dependabot, secret and image scanning on 100% of the 43 production repositories, deployment only from protected branches via signed pipelines and threat modelling for features handling signed documents or personal data; LUM-SD-02 adds change tickets with owner approval.",
  },
};

// ---------------------------------------------------------------------------
// NIS2 — Art. 21(2) (Belgian NIS2 Act)

const NIS2: Record<string, Mapping> = {
  "Art. 21(2)(a)": {
    controls: ["LUM-GOV-01", "LUM-GOV-02"],
    coverage: "full",
    rationale:
      "Policies on risk analysis and information system security are required. LUM-GOV-01 maintains the ISO 27001-certified ISMS with the Information Security Policy v3.0 and the topic-specific set, and LUM-GOV-02 performs ISO 27005-based risk assessments at least annually and on significant change, with treatment plans tracked in the risk register and reviewed quarterly by the Security Steering Committee.",
  },
  "Art. 21(2)(b)": {
    controls: ["LUM-IR-01", "LUM-LM-02"],
    coverage: "full",
    rationale:
      "Incident handling must cover prevention through recovery, including the reporting duties towards the CCB. The Incident Response Plan v2.1 under LUM-IR-01 defines severity, roles, escalation and the 24-hour early warning / 72-hour notification / 1-month final report clock towards the CCB, and LUM-LM-02 provides the detection and 24/7 paging that feeds it; 23 Sentinel incidents were triaged within SLA in the last 30 days.",
  },
  "Art. 21(2)(c)": {
    controls: ["LUM-BC-01", "LUM-BC-02"],
    coverage: "partial",
    rationale:
      "Backup management, disaster recovery and crisis management are required. LUM-BC-01 backups pass monthly restore tests and the BC/DR Plan v1.6 under LUM-BC-02 defines a crisis management team, RTO 4h / RPO 15 min and a warm-standby region — but the January 2026 failover descoped the e-signature service, so continuity of qualified signing (a core customer function) is not demonstrated.",
    gap: "Bring the e-signature service and its SignaTrust dependency into the next failover exercise and document a fallback signing procedure; align the exercise with the BC/DR Plan's annual review, which is itself overdue.",
  },
  "Art. 21(2)(d)": {
    controls: ["LUM-TP-01"],
    coverage: "full",
    rationale:
      "Supply chain security must address the vulnerabilities and practices of direct suppliers. LUM-TP-01 classifies suppliers as critical / important / standard, imposes security, audit, sub-processor and exit clauses, and reassesses the five critical suppliers annually against their assurance reports, with DORA pass-through obligations for financial customers handled in the same policy.",
  },
  "Art. 21(2)(e)": {
    controls: ["LUM-SD-01", "LUM-VM-01"],
    coverage: "partial",
    rationale:
      "Security in acquisition, development and maintenance must include vulnerability handling and disclosure. LUM-SD-01 and LUM-VM-01 give Lumeo a strong internal loop — CI security gates, continuous scanning, 48h/7d/30d SLAs and an annual penetration test — but there is no published coordinated vulnerability disclosure channel through which external researchers or customers can report issues, which the CCB's CyberFundamentals framework expects at the Important level.",
    gap: "Publish a coordinated vulnerability disclosure policy and intake channel (security.txt, dedicated mailbox, acknowledgement SLA) aligned with the CCB's CVD guidance, and link it to the LUM-VM-01 triage process.",
  },
  "Art. 21(2)(f)": {
    controls: [],
    coverage: "none",
    rationale:
      "NIS2 requires policies and procedures to assess the effectiveness of the cybersecurity risk-management measures themselves. Lumeo's ISO 27001 internal audit programme under LUM-GOV-01 checks conformity of the ISMS, and the annual management review looks at objectives, but no procedure or metric set assesses whether the measures actually reduce risk — there are no effectiveness KPIs, no periodic effectiveness review and nothing feeding the CCB CyberFundamentals self-assessment beyond a conformity view.",
    gap: "Define an effectiveness assessment procedure: a KPI set per measure (e.g. patch SLA attainment, MTTD/MTTR, phishing click rate, restore test success, access review completion), an annual effectiveness review by the Security Steering Committee, and a link into the CyberFundamentals self-assessment and the verified assessment planned for 2027.",
  },
  "Art. 21(2)(g)": {
    controls: ["LUM-HR-02", "LUM-VM-02"],
    coverage: "partial",
    rationale:
      "Basic cyber hygiene and cybersecurity training across the organisation are required. LUM-HR-02 runs onboarding and annual awareness training with quarterly phishing simulations (6.5% click rate in Q2) and LUM-VM-02 keeps endpoints patched through Intune rings, but annual training completion is 88% against the 95% target and 12 endpoints are outside the patch window, so hygiene is not yet organisation-wide.",
    gap: "Close the awareness campaign to 95% and remediate the 12 non-compliant endpoints; report both metrics quarterly to the Security Steering Committee as hygiene indicators.",
  },
  "Art. 21(2)(h)": {
    controls: ["LUM-CR-01", "LUM-CR-02"],
    coverage: "full",
    rationale:
      "Policies and procedures on cryptography and encryption are required. The Cryptography & Key Management Standard v1.4 defines approved algorithms, TLS 1.2 minimum with TLS 1.3 preferred, HSM-backed customer-managed keys with annual rotation and key custodian roles, implemented through LUM-CR-01 and LUM-CR-02 and evidenced by 100% CMK coverage on production data stores.",
  },
  "Art. 21(2)(i)": {
    controls: ["LUM-HR-01", "LUM-AC-01", "LUM-AM-01"],
    coverage: "partial",
    rationale:
      "HR security, access control and asset management are required together. LUM-HR-01 screening and LUM-AC-01 least-privilege access with automated joiner/mover/leaver and quarterly recertification are operating, but LUM-AM-01 asset management is in remediation: owner fields are incomplete in the application register and there is no attested review of the consolidated inventory.",
    gap: "Complete asset ownership in the application register and introduce a quarterly owner attestation of the consolidated inventory (same action as the ISO A.5.9 finding); also close the 2 overdue application access reviews from the Q3 campaign.",
  },
  "Art. 21(2)(j)": {
    controls: ["LUM-AC-02", "LUM-CR-01"],
    coverage: "partial",
    rationale:
      "MFA, secured communications and secured emergency communication systems are required. LUM-AC-02 enforces MFA tenant-wide with FIDO2 for privileged users, and voice, video and text run over the TLS-secured Microsoft 365 estate under LUM-CR-01 — but the Incident Response Plan does not define a secured out-of-band channel for crisis communication if Microsoft 365 or Entra ID itself is unavailable or compromised.",
    gap: "Define and test an out-of-band emergency communication channel (e.g. a separate messaging platform with pre-enrolled crisis team members and printed contact cards) in the Incident Response Plan and the BC/DR Plan.",
  },
};

// ---------------------------------------------------------------------------
// SOC 2 — Trust Services Criteria (Security, Availability, Confidentiality)

const SOC2: Record<string, Mapping> = {
  "CC2.1": {
    controls: ["LUM-GOV-01", "LUM-HR-02"],
    coverage: "partial",
    rationale:
      "The criterion asks for relevant, quality information — including security policies and responsibilities — to be communicated to personnel. The policy set under LUM-GOV-01 is published and covered in onboarding and annual training under LUM-HR-02, but there is no tracked annual policy acknowledgement per employee, so the auditor cannot evidence that each person received and accepted the current policy versions during the observation period.",
    gap: "Introduce a tracked annual policy acknowledgement (e.g. through Officient or the LMS) with completion reporting, starting before the end of the 2026 observation period.",
  },
  "CC3.1": {
    controls: ["LUM-GOV-01", "LUM-GOV-02"],
    coverage: "full",
    rationale:
      "Objectives must be specified and risks to them identified and analysed. LUM-GOV-01 sets security objectives reviewed at the quarterly Security Steering Committee and the annual management review, and LUM-GOV-02 performs an ISO 27005-based risk assessment at least annually and on significant change, with treatment plans owned and dated in the risk register.",
  },
  "CC4.1": {
    controls: ["LUM-GOV-01"],
    coverage: "partial",
    rationale:
      "Ongoing and/or separate evaluations must ascertain that controls are present and functioning. The ISO 27001 internal audit programme under LUM-GOV-01 is a sound separate evaluation, but SOC 2 Type II expects evidence of operating effectiveness across the whole observation period (1 July – 31 December 2026), and Lumeo has no ongoing control-monitoring metrics or evidence calendar that shows each control operated continuously.",
    gap: "Set up a control-monitoring calendar with per-control evidence owners and monthly metrics (access reviews, restore tests, patch SLAs, alert triage) collected for the observation period, so the auditor can sample operating effectiveness rather than point-in-time audits.",
  },
  "CC5.3": {
    controls: ["LUM-GOV-01"],
    coverage: "full",
    rationale:
      "Control activities must be deployed through policies and procedures. The Information Security Policy v3.0 and ten topic-specific policies and procedures (access control, cryptography, incident response, BC/DR, supplier security, secure development, acceptable use, HR security, data protection) are approved, owned and reviewed under LUM-GOV-01 and map to the register controls.",
  },
  "CC6.1": {
    controls: ["LUM-AC-01", "LUM-AC-02", "LUM-CR-02"],
    coverage: "full",
    rationale:
      "Logical access security architecture including identification, authentication and encryption at rest is required. Entra ID is the single identity provider with least-privilege role profiles (LUM-AC-01), MFA and FIDO2 for privileged users (LUM-AC-02), and customer data at rest is encrypted with AES-256 under HSM-backed customer-managed keys (LUM-CR-02).",
  },
  "CC6.2": {
    controls: ["LUM-AC-01", "LUM-HR-01"],
    coverage: "full",
    rationale:
      "Users must be registered and authorised before credentials are issued and removed when no longer required. LUM-HR-01 registers screening completion in Officient before account creation, and LUM-AC-01 provisions and disables accounts automatically from Officient joiner and leaver events, with leavers disabled on their last working day.",
  },
  "CC6.3": {
    controls: ["LUM-AC-01", "LUM-AC-03"],
    coverage: "full",
    rationale:
      "Access must be authorised, modified or removed on least privilege with periodic review. LUM-AC-01 applies role profiles with quarterly owner recertification (14 of 16 Q3 reviews signed off, 2 pending) and LUM-AC-03 keeps privileged roles eligible-only through PIM with approval and 4-hour activations.",
  },
  "CC6.6": {
    controls: ["LUM-CR-01", "LUM-LM-02", "LUM-VM-02"],
    coverage: "full",
    rationale:
      "Boundary protection against external threats is required. Azure Front Door Premium with a managed WAF ruleset and bot protection fronts the platform (LUM-CR-01), office networks are treated as untrusted with remote access only via Entra Private Access, Sentinel detection under LUM-LM-02 covers the boundary, and LUM-VM-02 keeps the Terraform-defined network baseline drift-free.",
  },
  "CC6.7": {
    controls: ["LUM-CR-01", "LUM-DP-01"],
    coverage: "full",
    rationale:
      "Transmission and movement of information must be restricted and protected. LUM-CR-01 enforces TLS 1.2+ (TLS 1.3 preferred, HSTS) externally and mutual authentication between services, and the Data Protection Policy v2.0 under LUM-DP-01 restricts data movement by classification and confines customer data to the EU.",
  },
  "CC6.8": {
    controls: ["LUM-VM-01", "LUM-VM-02", "LUM-SD-01"],
    coverage: "full",
    rationale:
      "Unauthorised or malicious software must be prevented or detected. Defender for Endpoint (P2) protects all managed endpoints (LUM-VM-01), Intune compliance and update rings under LUM-VM-02 gate device access, and LUM-SD-01 scans container images and dependencies before anything reaches production from protected branches.",
  },
  "CC7.1": {
    controls: ["LUM-VM-01", "LUM-VM-02"],
    coverage: "full",
    rationale:
      "Vulnerabilities and configuration changes introducing them must be detected. LUM-VM-01 runs continuous Defender Vulnerability Management, CodeQL and Dependabot scanning with defined SLAs, and LUM-VM-02 reports Terraform drift weekly (0 unmanaged production changes in the last 7 days).",
  },
  "CC7.2": {
    controls: ["LUM-LM-01", "LUM-LM-02"],
    coverage: "full",
    rationale:
      "System components must be monitored for anomalies. LUM-LM-01 centralises identity, endpoint, Azure, AKS, application and SaaS logs in Sentinel and LUM-LM-02 applies 86 MITRE-mapped analytics rules with 24/7 paging and a weekly signed-off review; Datadog covers platform health.",
  },
  "CC7.3": {
    controls: ["LUM-LM-02", "LUM-IR-01"],
    coverage: "full",
    rationale:
      "Security events must be evaluated to determine whether they are incidents. Sentinel incidents are triaged by the on-call engineer under LUM-LM-02 (median 22 minutes) and classified against the S1–S4 severity matrix of the Incident Response Plan v2.1 under LUM-IR-01.",
  },
  "CC7.4": {
    controls: ["LUM-IR-01"],
    coverage: "full",
    rationale:
      "A defined incident response programme must understand, contain, remediate and communicate. The Incident Response Plan v2.1 under LUM-IR-01 defines roles, escalation, evidence handling, customer notification within 24 hours, CCB and GDPR reporting clocks, post-incident reviews and an annual tabletop exercise.",
  },
  "CC7.5": {
    controls: ["LUM-IR-01", "LUM-BC-02"],
    coverage: "partial",
    rationale:
      "Activities to recover from identified security incidents are required. Recovery runbooks exist in the BC/DR Plan v1.6 (LUM-BC-02) and the Incident Response Plan references them (LUM-IR-01), but incident-specific recovery steps — for instance rebuilding after ransomware or credential compromise, as opposed to a regional outage — have not been exercised in the tabletop or the failover test.",
    gap: "Add incident-specific recovery scenarios (ransomware restore from immutable backup, compromised admin credential rotation) to the annual tabletop and document the outcomes as recovery evidence for the observation period.",
  },
  "CC8.1": {
    controls: ["LUM-SD-02", "LUM-SD-01"],
    coverage: "full",
    rationale:
      "Changes must be authorised, tested, approved and documented. LUM-SD-02 records every production change as a Jira ticket linked to the pull request with risk classification and service-owner approval (emergency changes reviewed within 2 working days), and LUM-SD-01 enforces review and CI gates on 100% of production repositories — 312 reviewed merges in the last 30 days.",
  },
  "CC9.1": {
    controls: ["LUM-BC-02", "LUM-GOV-02"],
    coverage: "partial",
    rationale:
      "Risk mitigation for business disruption, including continuity planning, is required. LUM-GOV-02 assesses disruption risks and the BC/DR Plan v1.6 under LUM-BC-02 defines the business impact analysis, crisis team and recovery objectives — but the plan was approved on 2025-06-30 and is overdue for its annual review, so the auditor will see a governing document outside its review cycle.",
    gap: "Complete the overdue annual review of the BC/DR Plan (incorporating the January 2026 exercise results and the e-signature descoping) and re-approve it through the COO before the observation period closes.",
  },
  "CC9.2": {
    controls: ["LUM-TP-01"],
    coverage: "full",
    rationale:
      "Vendor and business partner risks must be assessed and managed. LUM-TP-01 classifies suppliers, requires contractual security commitments and DPAs, and reassesses the critical suppliers (Microsoft, SignaTrust, Datadog, GitHub, Officient) annually against ISO 27001, SOC 2 and eIDAS assurance reports.",
  },
  "A1.2": {
    controls: ["LUM-BC-01", "LUM-BC-02"],
    coverage: "full",
    rationale:
      "Environmental protections, backup processes and recovery infrastructure must support availability objectives. Platform infrastructure runs in Microsoft Azure data centres, LUM-BC-01 provides geo-redundant backups with 35-day PITR and 100% job success over 30 days, and LUM-BC-02 maintains a warm-standby AKS cluster in North Europe with zone-redundant PostgreSQL in the primary region.",
  },
  "A1.3": {
    controls: ["LUM-BC-01", "LUM-BC-02"],
    coverage: "partial",
    rationale:
      "Recovery plan procedures must be tested. LUM-BC-01 restore tests run monthly (last 2026-08-05, 41 minutes) and LUM-BC-02 performed a regional failover on 2026-01-14 within RTO and RPO, but the e-signature service was descoped from that exercise, so recovery of the full customer-facing service is not tested end to end.",
    gap: "Schedule a full failover exercise including the e-signature service within the observation period and retain the exercise report as availability evidence.",
  },
  "C1.1": {
    controls: ["LUM-DP-01", "LUM-CR-02", "LUM-AC-01"],
    coverage: "full",
    rationale:
      "Confidential information must be identified and protected. The Data Protection Policy v2.0 under LUM-DP-01 classifies data as Public / Internal / Confidential / Restricted with handling rules, LUM-CR-02 encrypts customer data with customer-managed keys and signed contracts sit in an immutable (WORM) container, and LUM-AC-01 restricts access on least privilege.",
  },
  "C1.2": {
    controls: ["LUM-DP-01", "LUM-BC-01"],
    coverage: "partial",
    rationale:
      "Confidential information must be disposed of per retention objectives. LUM-DP-01 requires deletion of customer contract data within 90 days of termination (plus backup expiry under LUM-BC-01's 35-day window), but deletion is executed as an operational task without a per-customer deletion certificate or evidence trail, so the auditor cannot verify disposal for specific terminated customers.",
    gap: "Implement a deletion workflow that produces a per-customer deletion record (scope, date, backup expiry date, executor) and issue deletion certificates by default, retaining them as disposal evidence.",
  },
};

const TABLES = { iso27001: ISO, nis2: NIS2, soc2: SOC2 } as const;

export function mockControlMapper(input: Record<string, string>, _org: OrgData): unknown {
  const framework = frameworkFromInput(input);
  const table: Record<string, Mapping> = TABLES[framework.key] ?? {};

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
      source_note: `${SOURCE_DOC} + ${FRAMEWORKS[framework.key].name}`,
    };
  });

  return { items };
}
