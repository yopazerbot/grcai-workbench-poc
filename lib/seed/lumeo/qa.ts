// Past questionnaire answers, grouped by the response document they were
// extracted from. IDs are stable: the simulated Questionnaire Responder and
// the demo runs reference them.

export interface QaSeed {
  id: string;
  question: string;
  answer: string;
  /** Section / question reference inside the source document. */
  anchor: string;
}

/** DORA-driven ICT third-party due diligence from a fictional Belgian bank (March 2026). */
export const QA_NOORDBANK: QaSeed[] = [
  {
    id: "qa-iso",
    anchor: "Q1",
    question: "Is your organisation certified against ISO/IEC 27001? Provide certificate number, issuer, validity and scope.",
    answer:
      "Yes. Lumeo Software NV holds ISO/IEC 27001:2022 certificate LUM-ISMS-2024-031, issued by Certis Belgium (BELAC-accredited) on 15 May 2024 and valid until 14 May 2027. The scope covers the development, hosting, operation and support of the Lumeo Contract Cloud platform and supporting corporate IT at our Ghent and Namur offices. The last surveillance audit (April 2026) closed with two minor findings, both since closed. The certificate and Statement of Applicability v2.1 are available under NDA.",
  },
  {
    id: "qa-soc2",
    anchor: "Q2",
    question: "Do you hold a SOC 2 Type II report? If not, what alternative assurance can you provide?",
    answer:
      "Not yet. A SOC 2 Type II examination (Security, Availability, Confidentiality) is in progress: the readiness assessment was completed in June 2026 and the observation period runs from 1 July to 31 December 2026, with the report expected in Q1 2027. In the meantime we provide our ISO 27001 certificate, the Statement of Applicability, the executive summary of the latest external penetration test and a bridge letter on request.",
  },
  {
    id: "qa-hosting",
    anchor: "Q3",
    question: "Where is our data hosted and processed? Which sub-processors are involved?",
    answer:
      "Lumeo Contract Cloud is hosted in Microsoft Azure, region West Europe (Amsterdam, Netherlands), with disaster recovery in Azure North Europe (Dublin, Ireland). Data does not leave the EU/EEA. Sub-processors: Microsoft Ireland Operations Ltd (hosting, M365), SignaTrust NV (qualified e-signature and timestamps, Belgium), Datadog (platform telemetry, EU region — no contract content). Changes to the sub-processor list are notified 30 days in advance under the DPA.",
  },
  {
    id: "qa-encryption",
    anchor: "Q4",
    question: "How is customer data encrypted at rest and in transit, and how are keys managed?",
    answer:
      "Data at rest is encrypted with AES-256 using customer-managed keys held in Azure Key Vault Premium (HSM-backed) for PostgreSQL, Blob Storage and backups; endpoints use BitLocker / FileVault. In transit, all traffic uses TLS 1.2 or higher, with TLS 1.3 preferred at Azure Front Door and HSTS enforced; service-to-service traffic inside the platform is mutually authenticated. Keys are rotated annually, key usage is logged in Sentinel, and key custodian roles are separated per the Cryptography & Key Management Standard v1.4.",
  },
  {
    id: "qa-mfa",
    anchor: "Q5",
    question: "Is multi-factor authentication enforced for all users, including administrators and remote access?",
    answer:
      "Yes. MFA is enforced for all staff through Microsoft Entra ID conditional access, and legacy authentication protocols are blocked. Administrators and engineers with production access authenticate with FIDO2 security keys; a passkey rollout for all remaining staff started in July 2026. Privileged roles are activated just-in-time through Privileged Identity Management with approval and a 4-hour limit. There is no legacy VPN — remote access to internal services goes through Microsoft Entra Private Access with device compliance checks.",
  },
  {
    id: "qa-incident-notification",
    anchor: "Q6",
    question: "What are your incident notification commitments towards us, and how do you support our DORA major-incident reporting?",
    answer:
      "We notify affected customers within 24 hours of confirming a security incident that affects their data or service, with an initial assessment, and provide updates at least every 24 hours until resolution and a written post-incident report within 10 working days. To support your DORA incident classification and reporting we share impact data (affected services, users, duration, data categories) in the format your register of information requires. Our own NIS2 obligations follow the 24h/72h/1-month clock towards the CCB.",
  },
  {
    id: "qa-backup-dr",
    anchor: "Q7",
    question: "Describe your backup and disaster recovery arrangements, including RTO/RPO and testing.",
    answer:
      "The platform's recovery objectives are RTO 4 hours and RPO 15 minutes. PostgreSQL has 35-day point-in-time restore with geo-redundant backup; document storage is geo-redundant with soft delete and versioning; a warm-standby AKS cluster runs in Azure North Europe. Restore tests are performed monthly and a full regional failover exercise annually — the January 2026 exercise validated the core platform within objectives; the e-signature service was exercised separately because of its dependency on SignaTrust.",
  },
  {
    id: "qa-pentest",
    anchor: "Q8",
    question: "How often is the platform penetration tested, and can we see the results?",
    answer:
      "An external penetration test of Lumeo Contract Cloud (web application, API and cloud configuration) is performed annually by an independent firm; the most recent test was completed by Redline Security in March 2026 with no critical or high findings open at report date. The executive summary and remediation status are available under NDA. In addition, continuous scanning (Defender Vulnerability Management, CodeQL, Dependabot) runs on every build, with remediation SLAs of 48 hours for critical and 7 days for high findings.",
  },
  {
    id: "qa-exit",
    anchor: "Q9",
    question: "What are your exit and data return arrangements at contract termination?",
    answer:
      "On termination, customers can export all contracts, signed artefacts, audit trails and metadata in open formats (PDF/A, JSON, CSV) through the platform for 90 days. After that period, customer data is deleted from production and, through backup expiry, from backups within a further 35 days; a deletion certificate is issued on request. Exit assistance beyond the standard export is offered at time-and-materials rates, in line with DORA Art. 30 expectations.",
  },
  {
    id: "qa-audit-rights",
    anchor: "Q10",
    question: "Do you grant audit and access rights to us and our competent authorities?",
    answer:
      "Yes. Our standard financial-services contract addendum grants the customer, its auditors and its competent authorities the right to audit Lumeo's services relevant to the contract, with reasonable notice and at most once a year unless required by a regulator or triggered by an incident. Remote audits and reliance on our ISO 27001 certificate, SOC 2 report (once available) and penetration test summaries are the preferred route; on-site access to our offices is granted where required.",
  },
  {
    id: "qa-subcontracting",
    anchor: "Q11",
    question: "Which parts of the service are subcontracted, and how are subcontractors controlled?",
    answer:
      "Hosting (Microsoft Azure), qualified trust services (SignaTrust) and platform telemetry (Datadog) are provided by subcontractors; all software development and support is performed by Lumeo staff in Belgium. Subcontractors are risk-classified under our Supplier & Third-Party Security Policy, bound by contractual security, audit and notification clauses, and reassessed annually against their assurance reports. We do not subcontract functions critical to the service without notifying financial customers in advance.",
  },
];

/** General security questionnaire from a fictional insurer (November 2025). */
export const QA_ASSURIX: QaSeed[] = [
  {
    id: "qa-access-reviews",
    anchor: "Q3",
    question: "How are user access rights reviewed and revoked?",
    answer:
      "Access is granted through role profiles on least privilege and recertified quarterly by the owning manager in Entra ID access reviews; revocations are applied within 5 working days. Joiner, mover and leaver events flow automatically from our HR system (Officient) to Entra ID, so leavers are disabled on their last working day without manual intervention.",
  },
  {
    id: "qa-logging",
    anchor: "Q5",
    question: "Do you centrally log and monitor security events? What is the retention period?",
    answer:
      "Yes. Security-relevant logs from identity, endpoints, Azure, Kubernetes, the application audit trail and SaaS admin consoles are collected in Microsoft Sentinel with 12 months hot retention and 24 months archive. High-severity alerts page the on-call engineer 24/7 and a structured weekly review is documented. Customer-facing audit trails (who signed/viewed what, when) are retained for the life of the contract plus 10 years.",
  },
  {
    id: "qa-vuln-sla",
    anchor: "Q6",
    question: "What are your vulnerability remediation timelines?",
    answer:
      "Critical vulnerabilities are remediated or mitigated within 48 hours, high within 7 days, medium within 30 days and low within 90 days of confirmation. Actively exploited vulnerabilities affecting internet-facing components follow the emergency change path and are typically mitigated the same day.",
  },
  {
    id: "qa-training",
    anchor: "Q8",
    question: "Describe the security awareness training provided to staff.",
    answer:
      "All staff complete security awareness training at onboarding and annually thereafter, with quarterly phishing simulations and targeted follow-up for repeat clickers. Engineers additionally complete annual secure coding training. Completion is tracked in our HR system with a 95% target.",
  },
  {
    id: "qa-gdpr",
    anchor: "Q9",
    question: "Have you appointed a DPO, and how do you handle personal data as a processor?",
    answer:
      "Yes. Lumeo has an internal Data Protection Officer (Legal Counsel & DPO) registered with the Belgian Data Protection Authority. As processor we act only on documented customer instructions under our DPA, maintain a Record of Processing Activities, completed a DPIA for the e-signature module, and support data subject requests within 5 working days. Customer data is stored exclusively in the EU.",
  },
  {
    id: "qa-sdlc",
    anchor: "Q11",
    question: "Do you follow a secure software development lifecycle?",
    answer:
      "Yes. All production code changes require a peer-reviewed pull request with passing CI gates — CodeQL static analysis, Dependabot dependency checks, secret scanning and container image scanning — and deploy only from protected branches through signed pipelines. Threat modelling is mandatory for features handling signed documents or personal data, and developers receive annual secure coding training.",
  },
  {
    id: "qa-screening",
    anchor: "Q12",
    question: "Are employees screened before being granted access to customer data?",
    answer:
      "Yes. All new joiners undergo identity verification and reference checks; roles with production or financial access additionally require an extract from the criminal record where lawful. Confidentiality terms are part of every employment and contractor agreement, and screening completion is registered before accounts are created.",
  },
  {
    id: "qa-physical",
    anchor: "Q13",
    question: "How are your offices and data centres physically secured?",
    answer:
      "Lumeo operates no data centre of its own — all platform infrastructure runs in Microsoft Azure (ISO 27001, SOC 2 and CSA STAR certified data centres). Our Ghent and Namur offices use badge access with visitor registration and escorted access; the Ghent network room has a separate badge group with access logging. Office networks are treated as untrusted for platform administration.",
  },
];

export const QA_PAIRS: QaSeed[] = [...QA_NOORDBANK, ...QA_ASSURIX];
