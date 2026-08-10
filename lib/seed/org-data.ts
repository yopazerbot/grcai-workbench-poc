// Fictional organisation knowledge base: Aldervelt Financial Group (AFG).
// All names, systems, figures and findings are invented for demo purposes.
// Snapshot timestamps are expressed as day-offsets and materialised at seed
// time, so evidence freshness/staleness is always realistic relative to today.

export interface OrgControl {
  id: string;
  name: string;
  description: string;
  owner: string;
  status: "operating" | "in_remediation";
  lastReviewDaysAgo: number;
}

export interface OrgPolicy {
  id: string;
  name: string;
  summary: string;
  version: string;
  owner: string;
  approvedDaysAgo: number;
}

export interface QaPair {
  id: string;
  question: string;
  answer: string;
  source: string;
  answeredDaysAgo: number;
}

export interface SnapshotEntry {
  controls: string[];
  description: string;
  whatCounts: string;
  collectedDaysAgo: number;
  gap?: string;
}

export interface SystemSnapshot {
  key: string;
  system: string;
  summary: string;
  entries: SnapshotEntry[];
}

export const ORG_NAME = "Aldervelt Financial Group";

export const PROFILE = `Aldervelt Financial Group (AFG) is a mid-size asset manager headquartered in Brussels, with offices in Amsterdam and Luxembourg. ~450 employees, €38bn assets under management, serving institutional clients across the Benelux. AFG operates a cloud-first IT estate and develops its own client portal and portfolio management services in-house. The CISO office (4 FTE) owns the ISMS; IT Operations (22 FTE) runs infrastructure. AFG is supervised by the FSMA and, as a financial entity, falls in scope of DORA; it is classified as an important entity under NIS2 (Belgian transposition).`;

export const CERTIFICATION = `AFG holds ISO/IEC 27001:2022 certification (certificate AFG-ISMS-2024-118, issued by Kiwa, valid until 2027-03-31). Scope: "The information security management system supporting asset management services, client portal, portfolio management platform and supporting corporate IT, at the Brussels, Amsterdam and Luxembourg offices." Statement of Applicability v3.2 covers all Annex A controls, with 4 exclusions justified (no software escrow, no in-house data centre operations). A SOC 2 Type II report is not held; client assurance is provided via the ISO certificate, the SoA and this year's bridge letter. DORA applies since January 2025; the register of information (Art. 28) and TLPT planning are tracked in the compliance calendar.`;

export const ASSETS = `Technology stack (asset register summary, CMDB export):
- Identity & endpoints: Microsoft Entra ID (P2) with conditional access; Microsoft Intune MDM; Windows 11 and macOS endpoints with CrowdStrike Falcon EDR.
- Productivity: Microsoft 365 (Exchange Online, SharePoint Online, Teams). No on-premises Exchange.
- Cloud platforms: Microsoft Azure (West Europe) for corporate IT and Microsoft Sentinel SIEM; AWS eu-west-1 (Dublin) for the client-facing platform — EKS (Kubernetes 1.31), RDS PostgreSQL 15, S3, ElastiCache Redis.
- Software development: GitHub Enterprise Cloud; backend services in Java 21 / Spring Boot 3.3; web frontends in TypeScript / Next.js on Node.js 20.
- Network: Palo Alto NGFW (PA-3220, PAN-OS 11.1) at the Brussels office; GlobalProtect VPN for remote access.
- Backup: Veeam Backup & Replication 12, immutable repository, secondary copy in Azure.
- Corporate SaaS: Personio (HR), Exact Online (finance), Salesforce (CRM).
Not in use: GitLab, VMware ESXi, Citrix NetScaler, Fortinet appliances, Ivanti products, MOVEit Transfer, Oracle Database, on-premises Exchange.`;

export const CONTROLS: OrgControl[] = [
  {
    id: "AFG-AC-01",
    name: "Access control & RBAC",
    description:
      "Access to systems and data is granted on least-privilege via role profiles in Entra ID. Joiner/mover/leaver flows are automated from Personio; privileged access requires a separate PIM-eligible role. Quarterly access recertification for all application and privileged access.",
    owner: "Head of IT Operations",
    status: "operating",
    lastReviewDaysAgo: 45,
  },
  {
    id: "AFG-AC-02",
    name: "Multi-factor authentication",
    description:
      "MFA is enforced tenant-wide via Entra ID conditional access. Admins use phishing-resistant FIDO2 keys; all staff use Microsoft Authenticator. Legacy authentication protocols are blocked. Break-glass accounts are excluded, documented and monitored.",
    owner: "CISO Office",
    status: "operating",
    lastReviewDaysAgo: 30,
  },
  {
    id: "AFG-LM-01",
    name: "Central log collection",
    description:
      "Security-relevant logs from identity, endpoints, cloud platforms and applications are collected centrally in Microsoft Sentinel with 12 months hot retention and 24 months archive. Log source health is monitored daily.",
    owner: "Security Operations",
    status: "operating",
    lastReviewDaysAgo: 60,
  },
  {
    id: "AFG-LM-02",
    name: "Log review & alerting",
    description:
      "Sentinel analytics rules cover the MITRE-mapped detection baseline. The SOC performs a weekly structured log review with documented sign-off; high-severity alerts page the on-call engineer 24/7.",
    owner: "Security Operations",
    status: "operating",
    lastReviewDaysAgo: 60,
  },
  {
    id: "AFG-CR-01",
    name: "Encryption in transit",
    description:
      "All external and internal service traffic uses TLS 1.2 or higher; public endpoints enforce TLS 1.3 where supported, with HSTS. VPN access uses GlobalProtect with certificate-based device authentication.",
    owner: "Head of IT Operations",
    status: "operating",
    lastReviewDaysAgo: 90,
  },
  {
    id: "AFG-CR-02",
    name: "Encryption at rest",
    description:
      "Data at rest is encrypted with AES-256: AWS KMS customer-managed keys for S3, EBS and RDS; Azure Storage Service Encryption; BitLocker/FileVault on endpoints. Key rotation is annual; key usage is logged.",
    owner: "Head of IT Operations",
    status: "operating",
    lastReviewDaysAgo: 90,
  },
  {
    id: "AFG-VM-01",
    name: "Vulnerability management",
    description:
      "Continuous scanning: Dependabot for code dependencies, Defender for Cloud and AWS Inspector for workloads, weekly authenticated scans for endpoints. Remediation SLAs: critical 48h, high 7 days, medium 30 days.",
    owner: "Security Operations",
    status: "operating",
    lastReviewDaysAgo: 30,
  },
  {
    id: "AFG-VM-02",
    name: "Patch management",
    description:
      "Operating systems and third-party software are patched via Intune rings (pilot → broad, 14-day SLA). Server and container base images are rebuilt monthly; emergency patching path exists for actively exploited vulnerabilities.",
    owner: "Head of IT Operations",
    status: "operating",
    lastReviewDaysAgo: 75,
  },
  {
    id: "AFG-BC-01",
    name: "Backup",
    description:
      "Daily encrypted backups with Veeam to an immutable repository, secondary copy in Azure. 35-day standard retention (7 years for records in scope of retention duties). Monthly automated restore tests.",
    owner: "Head of IT Operations",
    status: "operating",
    lastReviewDaysAgo: 100,
  },
  {
    id: "AFG-BC-02",
    name: "Disaster recovery testing",
    description:
      "Documented DR strategy per critical service; RTO 4h / RPO 15min for the client platform. A full failover test of the core platform to the secondary region is performed annually with a formal findings report.",
    owner: "Head of IT Operations",
    status: "operating",
    lastReviewDaysAgo: 100,
  },
  {
    id: "AFG-HR-01",
    name: "Personnel screening",
    description:
      "All new joiners undergo pre-employment screening proportionate to role: identity verification, reference checks and — where lawful for the role — criminal record extracts. Screening completion is registered in Personio before system access is granted.",
    owner: "HR Operations",
    status: "operating",
    lastReviewDaysAgo: 120,
  },
  {
    id: "AFG-HR-02",
    name: "Security awareness training",
    description:
      "Mandatory annual security awareness training for all staff plus onboarding module for new joiners; quarterly phishing simulations. Completion is tracked in Personio and escalated to line management after two reminders.",
    owner: "CISO Office",
    status: "operating",
    lastReviewDaysAgo: 120,
  },
  {
    id: "AFG-SD-01",
    name: "Secure development lifecycle",
    description:
      "All production code changes require peer-reviewed pull requests with passing CI (SAST, dependency and secret scanning) on GitHub Enterprise. Branch protection on production repositories; deployments only from protected branches via signed pipelines.",
    owner: "Head of Engineering",
    status: "operating",
    lastReviewDaysAgo: 50,
  },
  {
    id: "AFG-TP-01",
    name: "Third-party risk management",
    description:
      "Suppliers with access to AFG data or systems are risk-classified before onboarding; critical ICT providers (DORA Art. 28) are recorded in the register of information. Annual reassessment for critical suppliers; contracts include security and audit clauses.",
    owner: "Compliance & Risk",
    status: "operating",
    lastReviewDaysAgo: 140,
  },
  {
    id: "AFG-IR-01",
    name: "Incident response",
    description:
      "A documented incident response plan with severity matrix, escalation paths and regulator/client notification steps (DORA major-incident reporting included). On-call rota 24/7; post-incident reviews are mandatory for SEV1/SEV2. Annual tabletop exercise.",
    owner: "CISO Office",
    status: "operating",
    lastReviewDaysAgo: 150,
  },
  {
    id: "AFG-PH-01",
    name: "Physical access control",
    description:
      "Offices are secured with badge access and visitor registration; server/network rooms have separate badge groups with access logging. Badge rights are removed in the leaver flow; access lists are reviewed twice a year.",
    owner: "Facilities",
    status: "operating",
    lastReviewDaysAgo: 170,
  },
];

export const POLICIES: OrgPolicy[] = [
  {
    id: "infosec",
    name: "Information Security Policy",
    summary:
      "Top-level policy establishing the ISMS, security objectives, roles (CISO, control owners, all staff) and the risk management approach. Mandates compliance with ISO 27001, DORA and NIS2 obligations. Reviewed annually by the Management Board.",
    version: "4.2",
    owner: "CISO Office",
    approvedDaysAgo: 200,
  },
  {
    id: "access-control",
    name: "Access Control Policy",
    summary:
      "Defines least-privilege, role-based access, joiner/mover/leaver requirements, MFA obligations, privileged access management and the quarterly recertification cycle. Covers employee, contractor and service accounts.",
    version: "3.1",
    owner: "Head of IT Operations",
    approvedDaysAgo: 260,
  },
  {
    id: "cryptography",
    name: "Cryptography & Key Management Policy",
    summary:
      "Approved algorithms and minimum key lengths (AES-256, RSA-3072/ECC-P256, TLS 1.2+), key lifecycle management, KMS usage and rotation requirements, and prohibition of unmanaged cryptographic material.",
    version: "2.4",
    owner: "Head of IT Operations",
    approvedDaysAgo: 320,
  },
  {
    id: "incident-response",
    name: "Incident Response Plan",
    summary:
      "Severity matrix, response phases, on-call and escalation procedures, evidence handling, and external notification duties: clients within 24h for confirmed incidents affecting their data, FSMA/DORA major-incident reporting timelines, and NIS2 CSIRT notifications.",
    version: "3.0",
    owner: "CISO Office",
    approvedDaysAgo: 150,
  },
  {
    id: "business-continuity",
    name: "Business Continuity & DR Policy",
    summary:
      "Business impact analysis cycle, recovery objectives per critical service (client platform RTO 4h / RPO 15min), backup requirements, annual DR failover testing and crisis communication structure.",
    version: "2.8",
    owner: "Head of IT Operations",
    approvedDaysAgo: 290,
  },
  {
    id: "acceptable-use",
    name: "Acceptable Use Policy",
    summary:
      "Rules for use of AFG equipment, accounts and data: device security, prohibited software, data handling and classification duties, private use boundaries, and reporting obligations for suspected incidents.",
    version: "5.0",
    owner: "CISO Office",
    approvedDaysAgo: 110,
  },
  {
    id: "supplier-security",
    name: "Supplier & Third-Party Security Policy",
    summary:
      "Security requirements across the supplier lifecycle: risk classification, due diligence, contractual clauses (audit rights, incident notification, exit), DORA register of information duties and annual reassessment of critical ICT providers.",
    version: "2.1",
    owner: "Compliance & Risk",
    approvedDaysAgo: 230,
  },
];

export const QA_PAIRS: QaPair[] = [
  {
    id: "qa-iso",
    question: "Is your organisation ISO 27001 certified?",
    answer:
      "Yes. AFG holds ISO/IEC 27001:2022 certification (certificate AFG-ISMS-2024-118, issued by Kiwa, valid until 31 March 2027). The scope covers asset management services, the client portal, the portfolio management platform and supporting corporate IT across all three offices. The certificate and Statement of Applicability are available under NDA.",
    source: "RFP response — Nordic pension fund",
    answeredDaysAgo: 60,
  },
  {
    id: "qa-encryption-rest",
    question: "Is client data encrypted at rest?",
    answer:
      "Yes. All client data is encrypted at rest with AES-256: AWS KMS customer-managed keys for S3, EBS and RDS PostgreSQL, Azure Storage Service Encryption for corporate data, and BitLocker/FileVault on endpoints. Keys are rotated annually and key usage is logged centrally.",
    source: "DDQ — Dutch insurer",
    answeredDaysAgo: 90,
  },
  {
    id: "qa-mfa",
    question: "Do you enforce multi-factor authentication?",
    answer:
      "Yes, MFA is enforced for all users via Entra ID conditional access, with phishing-resistant FIDO2 keys mandatory for administrative accounts and Microsoft Authenticator for all staff. Legacy authentication is blocked tenant-wide.",
    source: "DDQ — Dutch insurer",
    answeredDaysAgo: 90,
  },
  {
    id: "qa-pentest",
    question: "Do you perform penetration testing?",
    answer:
      "Yes. An accredited external firm performs an annual penetration test of the client platform and external perimeter; the most recent test (Q1 this year) resulted in no critical findings, and all high findings were remediated within SLA. Continuous vulnerability scanning complements the annual test. Under DORA we maintain a TLPT readiness plan.",
    source: "RFP response — Nordic pension fund",
    answeredDaysAgo: 60,
  },
  {
    id: "qa-data-location",
    question: "Where is our data stored and processed?",
    answer:
      "Client data is stored and processed exclusively within the EU: Microsoft Azure West Europe (Netherlands) and AWS eu-west-1 (Ireland). We do not transfer client data outside the EEA; support access follows EU-only processing commitments in our subprocessor agreements.",
    source: "DPA negotiation — German client",
    answeredDaysAgo: 130,
  },
  {
    id: "qa-subprocessors",
    question: "Which subprocessors do you use?",
    answer:
      "Principal subprocessors: Microsoft (Azure, M365), Amazon Web Services (platform hosting), GitHub (source code management), Personio (HR) and Salesforce (CRM). A maintained subprocessor register with roles and locations is available; clients are notified of changes with 30 days' notice.",
    source: "DPA negotiation — German client",
    answeredDaysAgo: 130,
  },
  {
    id: "qa-incident-notification",
    question: "What are your incident notification commitments?",
    answer:
      "Confirmed security incidents affecting client data are notified to affected clients within 24 hours of confirmation, with a named contact and remediation updates at agreed intervals. Regulatory notifications follow DORA major-incident timelines and, where applicable, GDPR Art. 33.",
    source: "MSA security schedule — Belgian mandate",
    answeredDaysAgo: 45,
  },
  {
    id: "qa-backup-dr",
    question: "Describe your backup and disaster recovery arrangements.",
    answer:
      "Daily encrypted backups via Veeam to an immutable repository with a secondary copy in Azure; 35-day standard retention and monthly automated restore tests. The client platform has RTO 4h / RPO 15min, validated by an annual full failover test to the secondary region.",
    source: "DDQ — Dutch insurer",
    answeredDaysAgo: 90,
  },
  {
    id: "qa-access-reviews",
    question: "How often are user access rights reviewed?",
    answer:
      "Application and privileged access is recertified quarterly through Entra ID access reviews, with revocations applied automatically on rejection. Leaver access is removed on the last working day via the automated Personio-to-Entra flow.",
    source: "RFP response — Nordic pension fund",
    answeredDaysAgo: 60,
  },
  {
    id: "qa-training",
    question: "Do employees receive security awareness training?",
    answer:
      "Yes — mandatory annual awareness training for all staff (completion tracked, escalation after two reminders), a dedicated onboarding module for new joiners, and quarterly phishing simulations with targeted follow-up for repeat clickers.",
    source: "DDQ — Dutch insurer",
    answeredDaysAgo: 90,
  },
  {
    id: "qa-vuln-sla",
    question: "What are your vulnerability remediation timelines?",
    answer:
      "Remediation SLAs by severity: critical 48 hours, high 7 days, medium 30 days, low at next maintenance window. Actively exploited vulnerabilities follow an emergency path with same-day mitigation where technically possible.",
    source: "MSA security schedule — Belgian mandate",
    answeredDaysAgo: 45,
  },
  {
    id: "qa-gdpr",
    question: "Do you have a Data Protection Officer?",
    answer:
      "Yes, AFG has an appointed DPO (privacy@aldervelt.example) registered with the Belgian Data Protection Authority. Records of processing are maintained, DPIAs are performed for high-risk processing, and data subject request procedures are in place.",
    source: "DPA negotiation — German client",
    answeredDaysAgo: 130,
  },
];

export const SYSTEM_SNAPSHOTS: SystemSnapshot[] = [
  {
    key: "entra",
    system: "Microsoft Entra ID",
    summary: "Identity provider: MFA/conditional access state and access review results.",
    entries: [
      {
        controls: ["AFG-AC-02"],
        description:
          "MFA & conditional access report: 98.4% of 447 active users MFA-registered; FIDO2 enforced for 31 admin accounts; legacy authentication blocked tenant-wide; 7 documented break-glass/service account exclusions.",
        whatCounts:
          "Tenant-wide MFA registration and conditional access policy export evidencing enforcement, including documented exclusions.",
        collectedDaysAgo: 3,
      },
      {
        controls: ["AFG-AC-01"],
        description:
          "Quarterly access recertification export: 312 application role assignments reviewed, 14 revoked; privileged (PIM) reviews completed for 29 of 31 admin roles.",
        whatCounts:
          "Completed access review campaign export with reviewer decisions and revocation actions.",
        collectedDaysAgo: 40,
        gap: "2 privileged role reviews pending sign-off past due date.",
      },
    ],
  },
  {
    key: "aws",
    system: "AWS (eu-west-1)",
    summary: "Client platform hosting: encryption configuration state.",
    entries: [
      {
        controls: ["AFG-CR-02"],
        description:
          "Encryption-at-rest report: 100% of S3 buckets SSE-KMS with CMKs; 41/41 RDS instances encrypted; EBS default encryption on; 3 unencrypted development EBS volumes detected, scheduled for rebuild.",
        whatCounts:
          "AWS Config aggregate showing KMS encryption state for S3, RDS and EBS resources in all platform accounts.",
        collectedDaysAgo: 5,
        gap: "3 unencrypted development EBS volumes pending rebuild (change CHG-4482).",
      },
      {
        controls: ["AFG-CR-01"],
        description:
          "TLS configuration scan: all 17 public endpoints TLS 1.2+ (14 on TLS 1.3), HSTS enabled on client portal; one internal ALB still accepting TLS 1.1 with change scheduled.",
        whatCounts:
          "External and internal TLS scan results for platform endpoints, including protocol versions and HSTS state.",
        collectedDaysAgo: 12,
        gap: "1 internal ALB accepts TLS 1.1 (change CHG-4471 scheduled).",
      },
    ],
  },
  {
    key: "github",
    system: "GitHub Enterprise Cloud",
    summary: "Source code management: branch protection and dependency scanning state.",
    entries: [
      {
        controls: ["AFG-SD-01"],
        description:
          "Branch protection report: required PR review + passing status checks (SAST, secret scanning) enforced on 84/86 production repositories; 2 archived repositories exempt by policy.",
        whatCounts:
          "Org-wide branch protection settings export for production repositories, including required checks.",
        collectedDaysAgo: 2,
      },
      {
        controls: ["AFG-VM-01"],
        description:
          "Dependency scanning summary: Dependabot enabled org-wide; 3 open critical dependency alerts older than 48h across 2 repositories (SLA breach), 27 highs within SLA.",
        whatCounts:
          "Dependabot/security alert export with ages measured against remediation SLAs.",
        collectedDaysAgo: 2,
        gap: "3 critical dependency alerts exceed the 48h SLA in repos portal-web and pm-core.",
      },
    ],
  },
  {
    key: "intune",
    system: "Microsoft Intune",
    summary: "Endpoint management: device compliance and patch status.",
    entries: [
      {
        controls: ["AFG-VM-02"],
        description:
          "Patch compliance report: 612 managed devices; 94% within the 14-day patch SLA; 23 devices >30 days behind, of which 9 documented exceptions (lab/trading floor).",
        whatCounts:
          "Intune device compliance and update ring report against the 14-day patching SLA.",
        collectedDaysAgo: 4,
        gap: "14 devices >30 days behind without documented exception.",
      },
    ],
  },
  {
    key: "sentinel",
    system: "Microsoft Sentinel",
    summary: "SIEM: log source health and review sign-offs.",
    entries: [
      {
        controls: ["AFG-LM-01"],
        description:
          "Log source health: 62/64 configured sources healthy; Personio audit-log feed degraded for 14 days (ticket SOC-1187); retention 12 months hot / 24 months archive confirmed.",
        whatCounts:
          "Sentinel data connector health export plus retention configuration.",
        collectedDaysAgo: 1,
        gap: "Personio audit-log feed degraded since 14 days (SOC-1187).",
      },
      {
        controls: ["AFG-LM-02"],
        description:
          "Weekly SOC log review sign-off for last week: completed; 3 escalations raised, all closed; sign-off recorded by SOC lead.",
        whatCounts:
          "Documented weekly review checklist with reviewer sign-off and escalation outcomes.",
        collectedDaysAgo: 8,
      },
    ],
  },
  {
    key: "veeam",
    system: "Veeam Backup & Replication",
    summary: "Backup and DR: job success and failover test results.",
    entries: [
      {
        controls: ["AFG-BC-01"],
        description:
          "Backup job report: 41/41 jobs successful in the last 24h; immutable repository verified; last monthly automated restore test passed 18 days ago.",
        whatCounts:
          "Backup job success/failure report, immutability status and most recent restore test result.",
        collectedDaysAgo: 1,
      },
      {
        controls: ["AFG-BC-02"],
        description:
          "Annual DR failover test report: full failover of the core client platform to the secondary region completed in 3h41m (target 4h); 2 medium findings on runbook gaps, both closed.",
        whatCounts:
          "Formal DR test report with timing against RTO, findings and closure evidence.",
        collectedDaysAgo: 200,
      },
    ],
  },
  {
    key: "personio",
    system: "Personio (HR)",
    summary: "HR system: screening and training completion registers.",
    entries: [
      {
        controls: ["AFG-HR-01"],
        description:
          "Screening register: 12/12 new joiners in the last quarter completed pre-employment screening before start date (identity, references, criminal record where lawful).",
        whatCounts:
          "HR register extract showing screening completion dates versus start dates.",
        collectedDaysAgo: 25,
      },
      {
        controls: ["AFG-HR-02"],
        description:
          "Annual security awareness campaign completion: 91% (407/447) at campaign close; escalation cycle completed for remaining 40 staff.",
        whatCounts:
          "Training completion report for the mandatory annual campaign, including escalations.",
        collectedDaysAgo: 110,
      },
    ],
  },
];

/** Controls with no connected-system coverage (evidence must be collected manually). */
export const UNCOVERED_CONTROL_NOTES: Record<string, string> = {
  "AFG-TP-01":
    "Supplier assessments and the DORA register of information are maintained in the compliance GRC workspace, which is not yet a connected system.",
  "AFG-IR-01":
    "Incident response evidence (tabletop reports, post-incident reviews) is stored in SharePoint and not yet exposed via a connected system.",
  "AFG-PH-01":
    "The badge/physical access system is on an isolated network and not yet a connected system.",
};

// ---------------------------------------------------------------------------

export interface OrgKnowledgeRowSeed {
  id: string;
  category:
    | "profile"
    | "certification"
    | "control"
    | "policy"
    | "qa_pair"
    | "system_snapshot"
    | "assets";
  refId: string | null;
  title: string;
  body: string;
  data: unknown;
}

const iso = (now: Date, daysAgo: number) =>
  new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

/** Materialise the knowledge base into DB rows (timestamps relative to `now`). */
export function buildOrgKnowledgeRows(now: Date): OrgKnowledgeRowSeed[] {
  const rows: OrgKnowledgeRowSeed[] = [
    {
      id: "profile",
      category: "profile",
      refId: null,
      title: "Organisation profile",
      body: PROFILE,
      data: { orgName: ORG_NAME },
    },
    {
      id: "certification",
      category: "certification",
      refId: null,
      title: "Certifications & regulatory scope",
      body: CERTIFICATION,
      data: null,
    },
    {
      id: "assets",
      category: "assets",
      refId: null,
      title: "Asset & technology stack summary",
      body: ASSETS,
      data: null,
    },
  ];

  for (const c of CONTROLS) {
    rows.push({
      id: `control-${c.id.toLowerCase()}`,
      category: "control",
      refId: c.id,
      title: `${c.id} — ${c.name}`,
      body: c.description,
      data: { ...c, lastReview: iso(now, c.lastReviewDaysAgo) },
    });
  }

  for (const p of POLICIES) {
    rows.push({
      id: `policy-${p.id}`,
      category: "policy",
      refId: p.id,
      title: p.name,
      body: p.summary,
      data: { ...p, approvedAt: iso(now, p.approvedDaysAgo) },
    });
  }

  for (const q of QA_PAIRS) {
    rows.push({
      id: q.id,
      category: "qa_pair",
      refId: q.id,
      title: q.question,
      body: q.answer,
      data: { ...q, answeredAt: iso(now, q.answeredDaysAgo) },
    });
  }

  for (const s of SYSTEM_SNAPSHOTS) {
    const entries = s.entries.map((e) => ({
      controls: e.controls,
      description: e.description,
      whatCounts: e.whatCounts,
      collectedAt: iso(now, e.collectedDaysAgo),
      gap: e.gap ?? null,
    }));
    rows.push({
      id: `snap-${s.key}`,
      category: "system_snapshot",
      refId: s.key,
      title: s.system,
      body: s.summary,
      data: { key: s.key, system: s.system, entries },
    });
  }

  return rows;
}
