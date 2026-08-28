// Canonical facts for the fictional demo organisation: Lumeo Software NV.
// Every other seed module (documents, connectors, Q&A, demo runs) and every
// simulated generator references THIS file, so the story stays consistent.
// All names, systems, figures and findings are invented.

export const ORG = {
  name: "Lumeo Software NV",
  shortName: "Lumeo",
  product: "Lumeo Contract Cloud",
  founded: 2011,
  headcount: 198,
  contractors: 12,
  hq: "Ghent (Dok-Noord), Belgium",
  offices: ["Ghent (HQ)", "Namur"],
  vat: "BE 0836.412.557",
  revenue: "€24m (2025)",
  customers: 140,
  markets: ["Belgium", "Netherlands", "Luxembourg", "France"],
  sectors: ["financial services (banks, insurers)", "public sector", "healthcare", "professional services"],
  hosting: "Microsoft Azure West Europe (Amsterdam), DR in Azure North Europe (Dublin)",
} as const;

export interface Person {
  name: string;
  role: string;
  unit: string;
}

export const LEADERSHIP: Person[] = [
  { name: "Anneleen De Smet", role: "Chief Executive Officer", unit: "Leadership" },
  { name: "Bram Vercauteren", role: "Chief Technology Officer", unit: "Technology" },
  { name: "Karim Benali", role: "Chief Operating Officer", unit: "Operations" },
  { name: "Sofie Lambrechts", role: "Chief Financial Officer", unit: "Finance & Administration" },
  { name: "Elke Van Damme", role: "Chief Information Security Officer", unit: "Security" },
  { name: "Jonas Peeters", role: "Security Engineer", unit: "Security" },
  { name: "Thomas Maes", role: "Legal Counsel & Data Protection Officer", unit: "Legal & Compliance" },
  { name: "Nathalie Dubois", role: "Head of People", unit: "People" },
  { name: "Pieter Claes", role: "Head of Platform & SRE", unit: "Technology" },
  { name: "Inge Wouters", role: "Head of Engineering", unit: "Technology" },
  { name: "Laurent Gérard", role: "Head of Customer Success (Namur)", unit: "Operations" },
];

export const DEPARTMENTS: Array<{ name: string; headcount: number; lead: string }> = [
  { name: "Engineering", headcount: 85, lead: "Inge Wouters" },
  { name: "Platform & SRE", headcount: 18, lead: "Pieter Claes" },
  { name: "Product & Design", headcount: 8, lead: "Bram Vercauteren" },
  { name: "Customer Success & Support", headcount: 25, lead: "Laurent Gérard" },
  { name: "Sales & Marketing", headcount: 30, lead: "Anneleen De Smet" },
  { name: "Finance & Administration", headcount: 10, lead: "Sofie Lambrechts" },
  { name: "People", headcount: 4, lead: "Nathalie Dubois" },
  { name: "Security", headcount: 2, lead: "Elke Van Damme" },
  { name: "Legal & Compliance", headcount: 2, lead: "Thomas Maes" },
  { name: "Leadership", headcount: 5, lead: "Anneleen De Smet" },
];

// ---------------------------------------------------------------------------
// Certifications & regulatory scope

export interface CertificationSeed {
  name: string;
  issuer: string;
  scope: string;
  validUntil: string | null;
  status: string;
}

export const ISO_CERT = {
  number: "LUM-ISMS-2024-031",
  issuer: "Certis Belgium (accredited by BELAC)",
  issued: "2024-05-15",
  validUntil: "2027-05-14",
  lastSurveillance: "2026-04-22",
  soaVersion: "2.1",
  scope:
    "The information security management system supporting the development, hosting, operation and support of the Lumeo Contract Cloud platform and the supporting corporate IT, at the Ghent and Namur offices.",
};

export const CERTIFICATIONS: CertificationSeed[] = [
  {
    name: "ISO/IEC 27001:2022",
    issuer: ISO_CERT.issuer,
    scope: ISO_CERT.scope,
    validUntil: ISO_CERT.validUntil,
    status: `Certified — certificate ${ISO_CERT.number}, issued ${ISO_CERT.issued}; last surveillance audit ${ISO_CERT.lastSurveillance} (2 minor findings, closed); Statement of Applicability v${ISO_CERT.soaVersion}`,
  },
  {
    name: "SOC 2 Type II (Security, Availability, Confidentiality)",
    issuer: "Arcadia Assurance BV (planned auditor)",
    scope: "Lumeo Contract Cloud platform and supporting processes",
    validUntil: null,
    status:
      "In progress — readiness assessment completed June 2026; observation period 1 July – 31 December 2026; report expected Q1 2027",
  },
  {
    name: "NIS2 — important entity (Belgian NIS2 Act of 26 April 2024)",
    issuer: "Centre for Cybersecurity Belgium (CCB)",
    scope: "Lumeo Software NV as a digital provider (managed service / SaaS) — registered with the CCB on 2025-03-18",
    validUntil: null,
    status:
      "Registered; conformity assessed against the CCB CyberFundamentals Framework (Important level) — self-assessment v1 submitted; verified assessment planned for 2027",
  },
  {
    name: "GDPR",
    issuer: "Belgian Data Protection Authority (GBA/APD)",
    scope: "Processing of customer contract data (as processor) and own HR/CRM data (as controller)",
    validUntil: null,
    status: "DPO appointed (Thomas Maes); Record of Processing Activities v4 maintained; DPIA completed for the e-signature module",
  },
  {
    name: "eIDAS qualified e-signatures (via QTSP partner)",
    issuer: "SignaTrust NV (qualified trust service provider, Belgian trusted list)",
    scope: "Qualified electronic signatures and timestamps issued through the SignaTrust integration",
    validUntil: null,
    status: "Active partner agreement; SignaTrust's eIDAS conformity assessment report received annually",
  },
];

export const REGULATORY_NOTE = `Lumeo is not itself a financial entity and therefore not directly in scope of DORA, but as an ICT third-party service provider to banks and insurers it must support their DORA obligations: contractual provisions under Art. 30 (service levels, security, audit and access rights, exit assistance, subcontracting), inclusion in their register of information (Art. 28) and participation in their incident and testing processes. DORA-driven due-diligence questionnaires are received from financial customers several times a year.`;

// ---------------------------------------------------------------------------
// Technology stack (asset inventory)

export interface AssetSeed {
  name: string;
  category: string;
  details: string;
  inUse: boolean;
}

export const ASSETS: AssetSeed[] = [
  { name: "Microsoft Entra ID (P2)", category: "Identity & endpoints", details: "Single identity provider for staff and administrators; conditional access, Privileged Identity Management, Identity Protection.", inUse: true },
  { name: "Microsoft Intune", category: "Identity & endpoints", details: "MDM/MAM for all Windows 11 and macOS endpoints; compliance policies feed conditional access.", inUse: true },
  { name: "Microsoft Defender for Endpoint (P2)", category: "Identity & endpoints", details: "EDR on all managed endpoints; integrated with Sentinel.", inUse: true },
  { name: "Windows 11 / macOS endpoints", category: "Identity & endpoints", details: "≈210 managed laptops; BitLocker / FileVault full-disk encryption enforced.", inUse: true },
  { name: "Microsoft 365 E5", category: "Productivity", details: "Exchange Online, SharePoint Online, OneDrive, Teams. No on-premises Exchange.", inUse: true },
  { name: "Azure Kubernetes Service (AKS)", category: "Cloud platform", details: "Kubernetes 1.31 clusters (prod, staging) in West Europe; DR cluster in North Europe. Hosts all Lumeo Contract Cloud services.", inUse: true },
  { name: "Azure Database for PostgreSQL Flexible Server", category: "Data", details: "PostgreSQL 16, zone-redundant HA, customer-managed keys, 35-day point-in-time restore, geo-redundant backup.", inUse: true },
  { name: "Azure Blob Storage", category: "Data", details: "Contract documents and signed artefacts; immutable (WORM) container for signed contracts; CMK encryption.", inUse: true },
  { name: "Azure Cache for Redis", category: "Data", details: "Session and queue cache; TLS only, no persistence of contract data.", inUse: true },
  { name: "Azure Key Vault (Premium, HSM-backed)", category: "Data", details: "Customer-managed keys, TLS certificates, application secrets; annual key rotation.", inUse: true },
  { name: "Azure Front Door Premium + WAF", category: "Network", details: "Global entry point for the platform; managed WAF ruleset, bot protection, TLS 1.2+ (TLS 1.3 preferred).", inUse: true },
  { name: ".NET 8 / C# backend services", category: "Development", details: "≈40 microservices; container images built in GitHub Actions and scanned before deployment.", inUse: true },
  { name: "React 18 / TypeScript frontend", category: "Development", details: "Web application and customer portal; built on Node.js 20 (build-time only).", inUse: true },
  { name: "GitHub Enterprise Cloud", category: "Development", details: "Source control, GitHub Actions CI/CD, Dependabot, CodeQL, secret scanning, branch protection.", inUse: true },
  { name: "Terraform (HashiCorp)", category: "Development", details: "Infrastructure as code for all Azure resources; plans reviewed via pull request.", inUse: true },
  { name: "Microsoft Sentinel", category: "Security operations", details: "SIEM for identity, endpoint, Azure, Kubernetes and application logs; 12 months hot, 24 months archive.", inUse: true },
  { name: "Microsoft Defender for Cloud + Defender Vulnerability Management", category: "Security operations", details: "Cloud posture management and vulnerability scanning of endpoints, container images and AKS nodes.", inUse: true },
  { name: "Datadog", category: "Security operations", details: "APM, infrastructure monitoring and alerting for the platform.", inUse: true },
  { name: "Cisco Meraki MX", category: "Network", details: "Office security appliances in Ghent and Namur; office networks are untrusted for platform access.", inUse: true },
  { name: "Microsoft Entra Private Access", category: "Network", details: "Zero-trust remote access to the few internal admin services; the legacy VPN was decommissioned in 2025.", inUse: true },
  { name: "Azure Backup", category: "Backup", details: "PostgreSQL PITR and geo-redundant backups; AKS cluster backup; monthly restore tests.", inUse: true },
  { name: "Veeam Backup for Microsoft 365", category: "Backup", details: "Daily backup of Exchange Online, SharePoint and OneDrive to immutable Azure storage.", inUse: true },
  { name: "Officient", category: "Corporate SaaS", details: "HR system of record; drives the joiner/mover/leaver flow into Entra ID.", inUse: true },
  { name: "Exact Online", category: "Corporate SaaS", details: "Finance and invoicing.", inUse: true },
  { name: "HubSpot", category: "Corporate SaaS", details: "CRM and marketing automation.", inUse: true },
  { name: "Atlassian Jira & Confluence (Cloud)", category: "Corporate SaaS", details: "Product backlog, change tickets, internal documentation.", inUse: true },
  { name: "SignaTrust NV", category: "Trust services", details: "Qualified trust service provider (eIDAS) for qualified e-signatures and timestamps, integrated via API.", inUse: true },
];

export const NOT_IN_USE: string[] = [
  "Amazon Web Services",
  "Google Cloud Platform",
  "GitLab",
  "VMware ESXi / vCenter",
  "Citrix NetScaler",
  "Fortinet appliances",
  "Palo Alto Networks appliances",
  "Ivanti products",
  "MOVEit Transfer",
  "Oracle Database",
  "on-premises Exchange",
  "Cisco ASA",
  "CrowdStrike",
  "Java / Spring in production",
  "self-hosted Atlassian (Jira/Confluence Server or Data Center)",
];

// ---------------------------------------------------------------------------
// Internal control register (LUM-*)

export interface ControlSeed {
  id: string;
  name: string;
  description: string;
  owner: string;
  status: "operating" | "in_remediation";
  lastReviewDaysAgo: number;
  /** Section of the control register document the control sits in. */
  anchor: string;
}

export const CONTROLS: ControlSeed[] = [
  {
    id: "LUM-GOV-01",
    name: "ISMS governance & management review",
    description:
      "The CISO owns the ISMS on behalf of the management team. Security objectives, the risk register and the Statement of Applicability are reviewed at the quarterly Security Steering Committee (CEO, CTO, COO, CISO, DPO) and at the annual management review. Internal audits follow a 3-year programme.",
    owner: "CISO",
    status: "operating",
    lastReviewDaysAgo: 40,
    anchor: "§2.1 Governance",
  },
  {
    id: "LUM-GOV-02",
    name: "Risk assessment & treatment",
    description:
      "Information security risks are assessed at least annually and on significant change using the ISO 27005-based method in the Risk Management Procedure. Risks above appetite get a treatment plan with an owner and due date, tracked in the risk register.",
    owner: "CISO",
    status: "operating",
    lastReviewDaysAgo: 75,
    anchor: "§2.2 Risk management",
  },
  {
    id: "LUM-AC-01",
    name: "Identity & access management",
    description:
      "All access is granted on least privilege via role profiles in Entra ID. Joiner, mover and leaver events flow automatically from Officient to Entra ID; leavers are disabled on their last working day. Application and platform access is recertified quarterly by the owning manager.",
    owner: "Head of Platform & SRE",
    status: "operating",
    lastReviewDaysAgo: 35,
    anchor: "§3.1 Identity & access",
  },
  {
    id: "LUM-AC-02",
    name: "Multi-factor & phishing-resistant authentication",
    description:
      "MFA is enforced for all staff through Entra ID conditional access; legacy authentication is blocked. Administrators and engineers with production access use FIDO2 security keys. A passkey rollout for all staff started in July 2026 (Authenticator push remains the fallback until completion).",
    owner: "CISO",
    status: "operating",
    lastReviewDaysAgo: 25,
    anchor: "§3.2 Authentication",
  },
  {
    id: "LUM-AC-03",
    name: "Privileged access management",
    description:
      "Privileged roles in Entra ID and Azure are eligible-only through Privileged Identity Management with just-in-time activation, approval and a 4-hour maximum. Two break-glass accounts are stored offline, excluded from conditional access and monitored for any use.",
    owner: "Head of Platform & SRE",
    status: "operating",
    lastReviewDaysAgo: 35,
    anchor: "§3.3 Privileged access",
  },
  {
    id: "LUM-CR-01",
    name: "Encryption in transit",
    description:
      "All customer-facing and inter-service traffic uses TLS 1.2 or higher; Azure Front Door prefers TLS 1.3 and enforces HSTS. Internal service-to-service traffic inside AKS is mutually authenticated through the service mesh.",
    owner: "Head of Platform & SRE",
    status: "operating",
    lastReviewDaysAgo: 95,
    anchor: "§4.1 Cryptography",
  },
  {
    id: "LUM-CR-02",
    name: "Encryption at rest & key management",
    description:
      "Customer data at rest is encrypted with AES-256 using customer-managed keys in Azure Key Vault (HSM-backed): PostgreSQL, Blob Storage and backups. Keys are rotated annually, key usage is logged, and endpoints use BitLocker / FileVault.",
    owner: "Head of Platform & SRE",
    status: "operating",
    lastReviewDaysAgo: 95,
    anchor: "§4.1 Cryptography",
  },
  {
    id: "LUM-VM-01",
    name: "Vulnerability management",
    description:
      "Defender Vulnerability Management scans endpoints, container images and AKS nodes continuously; Dependabot and CodeQL cover application dependencies and code. Remediation SLAs: critical 48 hours, high 7 days, medium 30 days, low 90 days. An external penetration test of the platform is performed annually (last: Redline Security, March 2026).",
    owner: "Security Engineer",
    status: "operating",
    lastReviewDaysAgo: 20,
    anchor: "§5.1 Vulnerability management",
  },
  {
    id: "LUM-VM-02",
    name: "Patch & configuration management",
    description:
      "Endpoints are patched through Intune update rings (pilot, broad) within 14 days of release. AKS node images and PostgreSQL minor versions follow Azure's managed maintenance windows. All Azure resources are defined in Terraform against a hardened baseline; drift is reported weekly.",
    owner: "Head of Platform & SRE",
    status: "operating",
    lastReviewDaysAgo: 50,
    anchor: "§5.2 Patch & configuration management",
  },
  {
    id: "LUM-LM-01",
    name: "Centralised logging",
    description:
      "Security-relevant logs from Entra ID, endpoints (Defender), Azure activity, AKS audit, application audit trails and SaaS admin logs are collected in Microsoft Sentinel with 12 months hot retention and 24 months archive. Log source health is checked daily.",
    owner: "Security Engineer",
    status: "operating",
    lastReviewDaysAgo: 60,
    anchor: "§6.1 Logging",
  },
  {
    id: "LUM-LM-02",
    name: "Security monitoring & alerting",
    description:
      "Sentinel analytics rules cover the MITRE-mapped detection baseline agreed with the external SOC partner. High-severity alerts page the Platform on-call engineer 24/7; the Security Engineer performs a weekly structured review of alerts and log anomalies with documented sign-off.",
    owner: "Security Engineer",
    status: "operating",
    lastReviewDaysAgo: 60,
    anchor: "§6.2 Monitoring",
  },
  {
    id: "LUM-IR-01",
    name: "Incident response",
    description:
      "The Incident Response Plan defines a severity matrix, roles (incident manager, communications, DPO), escalation and customer notification within 24 hours for incidents affecting their data. NIS2 reporting to the CCB follows the 24-hour early warning / 72-hour notification / 1-month final report clock. An annual tabletop exercise is performed.",
    owner: "CISO",
    status: "operating",
    lastReviewDaysAgo: 30,
    anchor: "§7.1 Incident response",
  },
  {
    id: "LUM-BC-01",
    name: "Backup",
    description:
      "PostgreSQL has 35-day point-in-time restore with geo-redundant backup; Blob Storage uses geo-redundant replication with soft delete and versioning; AKS configuration is backed up daily. Microsoft 365 is backed up daily by Veeam to immutable storage. A restore test is performed monthly and documented.",
    owner: "Head of Platform & SRE",
    status: "operating",
    lastReviewDaysAgo: 28,
    anchor: "§8.1 Backup",
  },
  {
    id: "LUM-BC-02",
    name: "Business continuity & disaster recovery",
    description:
      "The BC/DR Plan defines RTO 4 hours and RPO 15 minutes for the Lumeo Contract Cloud platform, with a warm-standby AKS cluster in North Europe. A full failover exercise is performed annually; the last exercise (January 2026) validated the core platform but descoped the e-signature service because of the SignaTrust integration.",
    owner: "COO",
    status: "in_remediation",
    lastReviewDaysAgo: 230,
    anchor: "§8.2 Business continuity",
  },
  {
    id: "LUM-SD-01",
    name: "Secure development lifecycle",
    description:
      "All production changes go through peer-reviewed pull requests with passing CI (CodeQL SAST, Dependabot, secret scanning, container image scanning). Branch protection is enforced on production repositories; deployments run only from protected branches via signed pipelines. Threat modelling is mandatory for features handling signed documents or personal data.",
    owner: "Head of Engineering",
    status: "operating",
    lastReviewDaysAgo: 15,
    anchor: "§9.1 Secure development",
  },
  {
    id: "LUM-SD-02",
    name: "Change management",
    description:
      "Production changes are recorded as Jira change tickets linked to the pull request, with risk classification and approval by the service owner. Emergency changes are approved by the on-call lead and reviewed within 2 working days. Customer-visible changes are announced through the release notes.",
    owner: "Head of Platform & SRE",
    status: "operating",
    lastReviewDaysAgo: 45,
    anchor: "§9.2 Change management",
  },
  {
    id: "LUM-TP-01",
    name: "Supplier & third-party security",
    description:
      "Suppliers are risk-classified before onboarding (critical / important / standard) based on data access and service criticality. Critical suppliers — Microsoft (Azure, M365), SignaTrust, Datadog, GitHub, Officient — have security and audit clauses, a DPA where personal data is processed, and are reassessed annually against their assurance reports (ISO 27001, SOC 2, eIDAS CAR).",
    owner: "CISO",
    status: "operating",
    lastReviewDaysAgo: 80,
    anchor: "§10.1 Supplier security",
  },
  {
    id: "LUM-HR-01",
    name: "Personnel screening & onboarding",
    description:
      "All new joiners undergo identity verification, reference checks and — for roles with production or financial access — an extract from the criminal record where lawful. Confidentiality terms are part of every employment and contractor agreement. Screening completion is registered in Officient before accounts are created.",
    owner: "Head of People",
    status: "operating",
    lastReviewDaysAgo: 120,
    anchor: "§11.1 Human resources security",
  },
  {
    id: "LUM-HR-02",
    name: "Security awareness & training",
    description:
      "Security awareness training is mandatory at onboarding and annually thereafter, with quarterly phishing simulations. Engineers complete secure coding training yearly. The completion target is 95%; the 2026 annual campaign currently stands at 88% with reminders in progress.",
    owner: "Head of People",
    status: "in_remediation",
    lastReviewDaysAgo: 110,
    anchor: "§11.2 Awareness & training",
  },
  {
    id: "LUM-PH-01",
    name: "Physical & environmental security",
    description:
      "Both offices use badge access with visitor registration and escorted access; the Ghent network room has a separate badge group with access logging. Lumeo operates no data centre of its own — all platform infrastructure is in Microsoft Azure. A clean desk and screen lock policy applies.",
    owner: "Head of People",
    status: "operating",
    lastReviewDaysAgo: 150,
    anchor: "§12.1 Physical security",
  },
  {
    id: "LUM-AM-01",
    name: "Asset management & inventory",
    description:
      "Endpoints are inventoried in Intune, Azure resources in Azure Resource Graph (tagged with owner, environment and data classification) and applications in the ISMS application register. Owner fields are incomplete for part of the application register and the consolidated inventory has no attested review cycle yet.",
    owner: "Head of Platform & SRE",
    status: "in_remediation",
    lastReviewDaysAgo: 100,
    anchor: "§13.1 Asset management",
  },
  {
    id: "LUM-DP-01",
    name: "Data protection & privacy",
    description:
      "The DPO maintains the Record of Processing Activities and the DPIA register; a DPIA was completed for the e-signature module. Data is classified (Public, Internal, Confidential, Restricted) and handled per the Data Protection Policy; customer contract data is deleted within 90 days of contract termination unless legally retained.",
    owner: "Legal Counsel & DPO",
    status: "operating",
    lastReviewDaysAgo: 55,
    anchor: "§14.1 Data protection",
  },
];

export const CONTROL_IDS = CONTROLS.map((c) => c.id);

/** Why some controls have no connected-system evidence (used by the Evidence Collector). */
export const UNCOVERED_CONTROL_NOTES: Record<string, string> = {
  "LUM-GOV-01":
    "ISMS governance evidence (steering committee minutes, management review records) lives in the ISMS SharePoint site, which is not yet a connected system.",
  "LUM-GOV-02":
    "The risk register is maintained in the ISMS SharePoint site and is not yet exposed via a connected system.",
  "LUM-IR-01":
    "Incident response evidence (tabletop reports, post-incident reviews, CCB notifications) is stored in the ISMS SharePoint site and not yet a connected system.",
  "LUM-TP-01":
    "Supplier assessments and assurance reports are tracked in the compliance workspace in Confluence, which is not yet a connected system.",
  "LUM-PH-01":
    "The badge/physical access system (Ghent and Namur) is on an isolated network and not yet a connected system.",
  "LUM-DP-01":
    "The Record of Processing Activities and DPIA register are maintained by the DPO in the compliance workspace, which is not yet a connected system.",
  "LUM-SD-02":
    "Change tickets live in Jira Cloud; the Jira connector is planned but not yet enabled.",
};

// ---------------------------------------------------------------------------
// Policy set (each policy is also a seeded document)

export interface PolicySeed {
  id: string;
  name: string;
  version: string;
  owner: string;
  approvedDaysAgo: number;
  summary: string;
}

export const POLICIES: PolicySeed[] = [
  {
    id: "infosec",
    name: "Information Security Policy",
    version: "3.0",
    owner: "CISO",
    approvedDaysAgo: 199, // 2026-02-10
    summary:
      "Top-level policy: management commitment, ISMS scope, security objectives, roles (CISO, DPO, service owners), the topic-specific policy set, and the obligation of all staff and contractors to comply. Reviewed annually.",
  },
  {
    id: "access-control",
    name: "Access Control Policy",
    version: "2.2",
    owner: "CISO",
    approvedDaysAgo: 296, // 2025-11-05
    summary:
      "Least-privilege role profiles, automated joiner/mover/leaver from Officient, MFA for all access, FIDO2 for privileged users, PIM for privileged roles, quarterly access recertification, break-glass procedure.",
  },
  {
    id: "cryptography",
    name: "Cryptography & Key Management Standard",
    version: "1.4",
    owner: "Head of Platform & SRE",
    approvedDaysAgo: 344, // 2025-09-18
    summary:
      "Approved algorithms (AES-256, RSA-3072/ECDSA P-256, SHA-256+), TLS 1.2 minimum with TLS 1.3 preferred, customer-managed keys in Key Vault HSM, annual rotation, key custodian roles, certificate lifecycle.",
  },
  {
    id: "incident-response",
    name: "Incident Response Plan",
    version: "2.1",
    owner: "CISO",
    approvedDaysAgo: 220, // 2026-01-20
    summary:
      "Severity matrix (S1–S4), incident roles, on-call escalation, evidence handling, customer notification within 24 hours, NIS2 reporting to the CCB (24h/72h/1 month), GDPR breach notification (72h), post-incident review and annual tabletop.",
  },
  {
    id: "business-continuity",
    name: "Business Continuity & Disaster Recovery Plan",
    version: "1.6",
    owner: "COO",
    approvedDaysAgo: 424, // 2025-06-30 — overdue for annual review
    summary:
      "Business impact analysis, RTO 4h / RPO 15 min for the platform, warm-standby region failover procedure, crisis management team, communication plan, annual failover exercise and monthly restore tests.",
  },
  {
    id: "supplier-security",
    name: "Supplier & Third-Party Security Policy",
    version: "1.3",
    owner: "CISO",
    approvedDaysAgo: 318, // 2025-10-14
    summary:
      "Supplier risk classification, due diligence before onboarding, mandatory contract clauses (security, audit rights, sub-processors, exit), DPA requirements, annual reassessment of critical suppliers, DORA pass-through obligations for financial customers.",
  },
  {
    id: "secure-development",
    name: "Secure Development Policy",
    version: "2.0",
    owner: "CTO",
    approvedDaysAgo: 178, // 2026-03-03
    summary:
      "Secure SDLC: threat modelling, coding standards, mandatory peer review, CI security gates (CodeQL, Dependabot, secret scanning, image scanning), protected branches, separation of environments, secrets management, vulnerability disclosure handling.",
  },
  {
    id: "acceptable-use",
    name: "Acceptable Use Policy",
    version: "2.5",
    owner: "Head of People",
    approvedDaysAgo: 392, // 2025-08-01 — overdue for annual review
    summary:
      "Rules for use of Lumeo equipment, accounts, M365 and generative AI tools; managed devices only; prohibited activities; monitoring notice; reporting duties; consequences of non-compliance.",
  },
  {
    id: "hr-security",
    name: "HR Security Procedure",
    version: "1.2",
    owner: "Head of People",
    approvedDaysAgo: 270, // 2025-12-01
    summary:
      "Pre-employment screening steps per role category, confidentiality agreements, onboarding and offboarding checklists, awareness training schedule and phishing simulation programme, disciplinary process.",
  },
  {
    id: "data-protection",
    name: "Data Protection Policy",
    version: "2.0",
    owner: "Legal Counsel & DPO",
    approvedDaysAgo: 100, // 2026-05-20
    summary:
      "GDPR roles (Lumeo as processor for customer data, controller for HR/CRM), data classification scheme, retention schedule, data subject request handling, DPIA triggers, sub-processor list, international transfer rules.",
  },
];

export const POLICY_REVIEW_INTERVAL_DAYS = 365;
