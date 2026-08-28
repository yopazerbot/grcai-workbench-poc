// Pre-ingested demo documents for Lumeo Software NV: the text an upload would
// have produced plus the knowledge records the AI analysis would have
// extracted. Hand-authored so the demo is deterministic; every fact derives
// from ./register and ./qa so the story stays consistent.

import {
  ASSETS,
  CERTIFICATIONS,
  CONTROLS,
  DEPARTMENTS,
  ISO_CERT,
  LEADERSHIP,
  NOT_IN_USE,
  ORG,
  POLICIES,
  REGULATORY_NOTE,
  type AssetSeed,
  type ControlSeed,
  type PolicySeed,
} from "./register";
import { QA_ASSURIX, QA_NOORDBANK } from "./qa";
import { ACCESS_CONTROL_POLICY_TEXT } from "./access-control-policy";
import type { DocumentSeed, RecordSeed } from "./types";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF = "application/pdf";

// Reference date the day-offsets in ./register were written against, so the
// dates printed inside document text match the offsets exactly.
const REF = Date.UTC(2026, 7, 28);
const dateStr = (daysAgo: number) => new Date(REF - daysAgo * 86_400_000).toISOString().slice(0, 10);
const plusDays = (iso: string, days: number) =>
  new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);

const person = (roleContains: string) =>
  LEADERSHIP.find((p) => p.role.toLowerCase().includes(roleContains))?.name ?? roleContains;
const OWNER_NAME: Record<string, string> = {
  CEO: person("executive officer"),
  CTO: person("technology officer"),
  COO: person("operating officer"),
  CFO: person("financial officer"),
  CISO: person("information security officer"),
  "Head of Platform & SRE": person("platform"),
  "Head of People": person("people"),
  "Legal Counsel & DPO": person("data protection"),
  "Head of Engineering": person("head of engineering"),
  "Security Engineer": person("security engineer"),
};
const ownerName = (role: string) => OWNER_NAME[role] ?? role;

const policy = (id: string): PolicySeed => {
  const p = POLICIES.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown policy seed "${id}"`);
  return p;
};

const policyRecord = (p: PolicySeed): RecordSeed => ({
  kind: "policy",
  id: p.id,
  name: p.name,
  version: p.version,
  owner: p.owner,
  approvedDaysAgo: p.approvedDaysAgo,
  summary: p.summary,
  anchor: "Document control",
});

const fact = (topic: string, statement: string, anchor: string): RecordSeed => ({
  kind: "profile",
  topic,
  statement,
  anchor,
});

function documentControl(
  p: PolicySeed,
  code: string,
  opts: { classification?: string; approvedBy?: string; cycle?: string } = {}
): string {
  const approved = dateStr(p.approvedDaysAgo);
  return `**Document control**

| Field | Value |
| --- | --- |
| Document ID | ${code} |
| Title | ${p.name} |
| Version | ${p.version} |
| Owner | ${p.owner} (${ownerName(p.owner)}) |
| Approved by | ${opts.approvedBy ?? "Security Steering Committee"} |
| Approval date | ${approved} |
| Classification | ${opts.classification ?? "Internal"} |
| Review cycle | ${opts.cycle ?? `Annual — next review due ${plusDays(approved, 365)}`} |
`;
}

const STATUS_LABEL: Record<ControlSeed["status"], string> = {
  operating: "Operating",
  in_remediation: "In remediation",
};

// ---------------------------------------------------------------------------
// Generated texts: control register and asset inventory

function controlRegisterText(): string {
  const groups = new Map<string, ControlSeed[]>();
  for (const c of CONTROLS) {
    const g = groups.get(c.anchor) ?? [];
    g.push(c);
    groups.set(c.anchor, g);
  }
  const sections = [...groups].map(
    ([anchor, cs]) =>
      `## ${anchor}\n\n` +
      cs
        .map(
          (c) =>
            `**${c.id} — ${c.name}**  \nOwner: ${c.owner} (${ownerName(c.owner)}) · Status: ${STATUS_LABEL[c.status]} · Last review: ${dateStr(c.lastReviewDaysAgo)}\n\n${c.description}`
        )
        .join("\n\n")
  );
  const remediation = CONTROLS.filter((c) => c.status === "in_remediation");
  return `# Information Security Control Register v2.3

**Document control**

| Field | Value |
| --- | --- |
| Document ID | LUM-REG-003 |
| Version | 2.3 |
| Owner | CISO (${ownerName("CISO")}) |
| Approved by | Security Steering Committee |
| Approval date | ${dateStr(20)} |
| Classification | Internal |
| Review cycle | Quarterly, at the Security Steering Committee |

## §1 Purpose, scope and conventions

This register lists the information security controls operated by ${ORG.name} within the ISMS scope (${ISO_CERT.scope}). It is the authoritative reference for control ownership, operating status and review dates, and it is the basis for the Statement of Applicability (v${ISO_CERT.soaVersion}), the SOC 2 control matrix and the CCB CyberFundamentals self-assessment.

Each control has a single accountable owner. *Operating* means the control is implemented and its last review found it effective; *In remediation* means a known shortfall is being addressed under a tracked remediation plan. Reviews are performed by the owner at least annually, with evidence filed in the ISMS SharePoint site or retrieved from connected systems.

Controls currently in remediation: ${remediation.map((c) => `${c.id} (${c.name})`).join(", ")}.

${sections.join("\n\n")}

## §15 Change history

| Version | Date | Change |
| --- | --- | --- |
| 2.1 | ${dateStr(140)} | Added LUM-SD-02 Change management; split LUM-LM into logging and monitoring |
| 2.2 | ${dateStr(75)} | Status of LUM-BC-02 set to in remediation after the January failover exercise |
| 2.3 | ${dateStr(20)} | Passkey rollout reflected in LUM-AC-02; LUM-HR-02 set to in remediation (88% completion) |
`;
}

function assetInventoryText(): { text: string; records: RecordSeed[] } {
  const categories: string[] = [];
  for (const a of ASSETS) if (!categories.includes(a.category)) categories.push(a.category);
  const sectionOf = new Map<string, string>();
  categories.forEach((cat, i) => sectionOf.set(cat, `§${i + 2} ${cat}`));

  const sections = categories.map((cat) => {
    const rows = ASSETS.filter((a) => a.category === cat)
      .map((a) => `| ${a.name} | ${a.details} |`)
      .join("\n");
    return `## ${sectionOf.get(cat)}\n\n| Asset | Details |\n| --- | --- |\n${rows}`;
  });

  const notInUse = NOT_IN_USE.map((n) => `- ${n}`).join("\n");

  const text = `# Asset & Technology Inventory — CMDB export August 2026

**Export details**

| Field | Value |
| --- | --- |
| Export ID | LUM-INV-2026-08 |
| Generated | ${dateStr(6)} from Intune, Azure Resource Graph and the ISMS application register |
| Owner | Head of Platform & SRE (${ownerName("Head of Platform & SRE")}) |
| Classification | Confidential |
| Scope | All in-scope information assets of the ISMS; office IT and the Lumeo Contract Cloud platform |

## §1 Scope and method

This export consolidates the three inventories that make up the ${ORG.shortName} asset register: managed endpoints (Microsoft Intune), Azure resources (Azure Resource Graph, with owner / environment / data-classification tags) and applications and SaaS services (ISMS application register). It is produced monthly for the Security Steering Committee and on demand for audits. Detailed resource-level listings (≈1,900 Azure resources, 213 endpoints) are attached to the export; this document summarises them per asset class.

${sections.join("\n\n")}

## §12 Ownership and classification tags

All production Azure resources carry \`owner\`, \`environment\` and \`data-classification\` tags enforced by Azure Policy (deny on create without tags). At export date 100% of production resources are tagged. The ISMS application register holds 61 applications; owner attribution is complete for 49 and outstanding for 12 legacy internal tools (tracked under control LUM-AM-01).

## §13 Explicitly not in use

The following products and platforms are confirmed as **not** in use anywhere at ${ORG.shortName} (verified against procurement, Azure Resource Graph and endpoint software inventory). Threat advisories affecting only these products are out of scope.

${notInUse}
`;

  const records: RecordSeed[] = [
    ...ASSETS.map(
      (a: AssetSeed): RecordSeed => ({
        kind: "asset",
        name: a.name,
        category: a.category,
        details: a.details,
        inUse: a.inUse,
        anchor: sectionOf.get(a.category) ?? "§2",
      })
    ),
    ...NOT_IN_USE.map(
      (n): RecordSeed => ({
        kind: "asset",
        name: n,
        category: "Not in use",
        details: "Confirmed not in use (procurement, Azure Resource Graph and endpoint software inventory).",
        inUse: false,
        anchor: "§13 Explicitly not in use",
      })
    ),
  ];
  return { text, records };
}

// ---------------------------------------------------------------------------
// 1. Company overview

const overviewText = `# ${ORG.name} — Company & ISMS Scope Overview (2026)

**Document control**

| Field | Value |
| --- | --- |
| Document ID | LUM-ISMS-000 |
| Version | 2026.1 |
| Owner | CISO (${ownerName("CISO")}) |
| Approved by | ${ownerName("CEO")}, CEO |
| Approval date | ${dateStr(45)} |
| Classification | Internal — may be shared with customers and auditors under NDA |
| Review cycle | Annual, ahead of the management review |

## §1 Company profile

${ORG.name} (VAT ${ORG.vat}) is a Belgian software company founded in ${ORG.founded} and headquartered at Dok-Noord in Ghent, with a second office in Namur serving French-speaking customers. The company employs ${ORG.headcount} people plus approximately ${ORG.contractors} contractors (mainly engineering and design).

${ORG.shortName} develops and operates **${ORG.product}**, a B2B SaaS platform for contract lifecycle management and electronic signature: drafting from templates, negotiation and approval workflows, qualified and advanced e-signature, and a searchable, tamper-evident contract archive. Around ${ORG.customers} customer organisations use the platform across ${ORG.markets.join(", ")}, predominantly in ${ORG.sectors.join(", ")}. Revenue in 2025 was ${ORG.revenue}.

## §2 Organisation and leadership

| Role | Name |
| --- | --- |
${LEADERSHIP.map((p) => `| ${p.role} | ${p.name} |`).join("\n")}

| Department | Headcount | Lead |
| --- | --- | --- |
${DEPARTMENTS.map((d) => `| ${d.name} | ${d.headcount} | ${d.lead} |`).join("\n")}

The company is deliberately flat: the leadership team meets weekly, and each department head is the accountable owner for the risks and controls in their area.

## §3 Regulatory scope and certifications

${CERTIFICATIONS.map((c) => `- **${c.name}** — ${c.status}. Issuer / authority: ${c.issuer}. Scope: ${c.scope}${c.validUntil ? ` (valid until ${c.validUntil})` : ""}.`).join("\n")}

${REGULATORY_NOTE}

## §4 ISMS scope

The information security management system covers: "${ISO_CERT.scope}" All departments, both offices, all managed endpoints and the complete Azure estate hosting ${ORG.product} are in scope. Excluded are customer-side integrations operated by customers themselves.

## §5 Security organisation

The CISO (${ownerName("CISO")}) reports to the CEO and owns the ISMS with a team of two (CISO and Security Engineer ${ownerName("Security Engineer")}). The Legal Counsel & DPO (${ownerName("Legal Counsel & DPO")}) is registered as DPO with the Belgian Data Protection Authority. A quarterly Security Steering Committee (CEO, CTO, COO, CISO, DPO) approves policies, reviews the risk register and tracks remediation plans; the annual management review is chaired by the CEO. Platform security engineering is embedded in the Platform & SRE team; an external SOC partner provides 24/7 first-line alert monitoring.

## §6 Platform and hosting

${ORG.product} runs entirely on ${ORG.hosting}. ${ORG.shortName} operates no data centre of its own; office networks are treated as untrusted for platform administration. Qualified electronic signatures and timestamps are issued through SignaTrust NV, a qualified trust service provider on the Belgian trusted list.
`;

const overview: DocumentSeed = {
  id: "doc-company-overview",
  title: `${ORG.name} — Company & ISMS Scope Overview (2026)`,
  filename: "LUM-ISMS-000 Company and ISMS Scope Overview 2026.docx",
  mime: DOCX,
  category: "overview",
  uploadedDaysAgo: 44,
  pageCount: 6,
  summary:
    "Company profile and ISMS scope statement for Lumeo Software NV, a ~200-person Belgian SaaS provider of contract lifecycle management and e-signature software hosted in Azure West Europe. It sets out the leadership structure, the ISO 27001 certification, the in-progress SOC 2 Type II examination, NIS2 registration as an important entity, GDPR arrangements and Lumeo's position as an ICT third-party provider to DORA-regulated customers.",
  text: overviewText,
  records: [
    fact(
      "Legal entity",
      `${ORG.name}, VAT ${ORG.vat}, founded ${ORG.founded}; headquartered in ${ORG.hq} with a second office in Namur.`,
      "§1 Company profile"
    ),
    fact(
      "Headcount",
      `${ORG.headcount} employees plus approximately ${ORG.contractors} contractors (mainly engineering and design).`,
      "§1 Company profile"
    ),
    fact(
      "Product",
      `${ORG.product}: B2B SaaS for contract lifecycle management and electronic signature — templates, negotiation and approval workflows, qualified/advanced e-signature and a tamper-evident contract archive.`,
      "§1 Company profile"
    ),
    fact(
      "Customers and markets",
      `Around ${ORG.customers} customer organisations in ${ORG.markets.join(", ")}, predominantly in ${ORG.sectors.join(", ")}. Revenue ${ORG.revenue}.`,
      "§1 Company profile"
    ),
    fact(
      "Leadership",
      LEADERSHIP.slice(0, 5)
        .map((p) => `${p.name} (${p.role})`)
        .join("; ") + ".",
      "§2 Organisation and leadership"
    ),
    fact(
      "Organisation structure",
      DEPARTMENTS.map((d) => `${d.name} ${d.headcount}`).join(", ") +
        ". Flat structure; each department head owns the risks and controls in their area.",
      "§2 Organisation and leadership"
    ),
    fact("Regulatory position towards DORA", REGULATORY_NOTE, "§3 Regulatory scope and certifications"),
    fact(
      "ISMS scope",
      ISO_CERT.scope + " Customer-side integrations operated by customers are excluded.",
      "§4 ISMS scope"
    ),
    fact(
      "Security organisation",
      `CISO (${ownerName("CISO")}) reports to the CEO with a team of two (CISO + Security Engineer ${ownerName("Security Engineer")}); Legal Counsel & DPO (${ownerName("Legal Counsel & DPO")}) registered with the Belgian DPA; quarterly Security Steering Committee (CEO, CTO, COO, CISO, DPO); annual management review chaired by the CEO; external SOC partner for 24/7 first-line alert monitoring.`,
      "§5 Security organisation"
    ),
    fact(
      "Hosting",
      `${ORG.product} runs entirely on ${ORG.hosting}. No data centre of its own; office networks are untrusted for platform administration. Qualified e-signatures and timestamps via SignaTrust NV (QTSP).`,
      "§6 Platform and hosting"
    ),
    ...CERTIFICATIONS.map(
      (c): RecordSeed => ({
        kind: "certification",
        name: c.name,
        issuer: c.issuer,
        scope: c.scope,
        validUntil: c.validUntil,
        status: c.status,
        anchor: "§3 Regulatory scope and certifications",
      })
    ),
  ],
};

// ---------------------------------------------------------------------------
// 2. ISO certificate & SoA extract

const isoCertText = `# ISO/IEC 27001:2022 Certificate ${ISO_CERT.number} & Statement of Applicability v${ISO_CERT.soaVersion} (extract)

## Certificate

**${ISO_CERT.issuer}** hereby certifies that the information security management system of

**${ORG.name}**, Dok-Noord, 9000 Ghent, Belgium (and the Namur office)

has been assessed and found to conform to **ISO/IEC 27001:2022**.

Scope of certification: "${ISO_CERT.scope}"

| Field | Value |
| --- | --- |
| Certificate number | ${ISO_CERT.number} |
| Initial certification | ${ISO_CERT.issued} |
| Certificate expiry | ${ISO_CERT.validUntil} |
| Statement of Applicability | v${ISO_CERT.soaVersion} |
| Accreditation | BELAC (Belgian Accreditation Body) |

## Audit history

| Audit | Date | Result |
| --- | --- | --- |
| Stage 1 | 2024-02-20 | Ready for stage 2 |
| Stage 2 (certification) | 2024-04-23/25 | Certified; 3 minor findings, closed 2024-07 |
| Surveillance 1 | 2025-04-16 | 1 minor finding (supplier reassessment evidence), closed 2025-06 |
| Surveillance 2 | ${ISO_CERT.lastSurveillance} | 2 minor findings (asset owner attribution; awareness completion evidence), closed ${dateStr(60)} |
| Recertification | planned 2027-03 | — |

## Statement of Applicability v${ISO_CERT.soaVersion} — extract

The SoA lists all 93 Annex A controls. 90 are applicable and implemented; 3 are excluded with justification. Selected rows:

| Annex A | Control | Applicable | Implemented by |
| --- | --- | --- | --- |
| A.5.1 | Policies for information security | Yes | Information Security Policy and topic-specific policy set (LUM-GOV-01) |
| A.5.9 | Inventory of information and other associated assets | Yes | LUM-AM-01 — remediation in progress |
| A.5.19 | Information security in supplier relationships | Yes | LUM-TP-01 |
| A.5.24 | Incident management planning and preparation | Yes | LUM-IR-01 |
| A.5.30 | ICT readiness for business continuity | Yes | LUM-BC-01, LUM-BC-02 |
| A.7.10 | Storage media | No | Excluded — no removable media in use; endpoints block USB mass storage |
| A.8.5 | Secure authentication | Yes | LUM-AC-02 |
| A.8.24 | Use of cryptography | Yes | LUM-CR-01, LUM-CR-02 |
| A.8.25 | Secure development life cycle | Yes | LUM-SD-01 |
| A.8.30 | Outsourced development | No | Excluded — all development performed by ${ORG.shortName} staff and embedded contractors under ${ORG.shortName} control |

## SoA exclusions

1. **A.7.10 Storage media** — no removable media in use; USB mass storage blocked by Intune policy.
2. **A.8.30 Outsourced development** — no development is outsourced; contractors work under ${ORG.shortName} supervision on ${ORG.shortName} systems.
3. **Software escrow / own data centre operations** — not applicable: ${ORG.shortName} operates no data centre and offers no escrow (customers rely on the export and exit provisions of the DPA).
`;

const isoCert: DocumentSeed = {
  id: "doc-iso-certificate-soa",
  title: `ISO/IEC 27001:2022 Certificate ${ISO_CERT.number} & Statement of Applicability v${ISO_CERT.soaVersion} (extract)`,
  filename: `Certis ISO27001 Certificate ${ISO_CERT.number} and SoA v${ISO_CERT.soaVersion} extract.pdf`,
  mime: PDF,
  category: "certificate",
  uploadedDaysAgo: 58,
  pageCount: 4,
  summary:
    "Certificate face and audit history for Lumeo's ISO/IEC 27001:2022 certification (Certis Belgium, valid until 2027-05-14) together with an extract of Statement of Applicability v2.1. The two minor findings from the April 2026 surveillance audit are recorded as closed. Three Annex A exclusions are justified: removable media, outsourced development, and escrow/own data centre operations.",
  text: isoCertText,
  records: [
    {
      kind: "certification",
      name: "ISO/IEC 27001:2022",
      issuer: ISO_CERT.issuer,
      scope: ISO_CERT.scope,
      validUntil: ISO_CERT.validUntil,
      status: `Certified — certificate ${ISO_CERT.number} issued ${ISO_CERT.issued}, expires ${ISO_CERT.validUntil}; BELAC-accredited; recertification planned March 2027`,
      anchor: "Certificate",
    },
    fact(
      "Statement of Applicability",
      `SoA v${ISO_CERT.soaVersion}: 90 of 93 Annex A controls applicable and implemented; 3 excluded with justification (A.7.10 storage media — no removable media, USB mass storage blocked; A.8.30 outsourced development — none; software escrow / own data centre operations — not applicable).`,
      "SoA exclusions"
    ),
    fact(
      "Surveillance audit 2026",
      `Surveillance audit 2 on ${ISO_CERT.lastSurveillance} raised 2 minor findings (asset owner attribution; awareness completion evidence), both closed ${dateStr(60)}. Recertification audit planned for March 2027.`,
      "Audit history"
    ),
  ],
};

// ---------------------------------------------------------------------------
// 3. Control register

const controlRegister: DocumentSeed = {
  id: "doc-control-register",
  title: "Information Security Control Register v2.3",
  filename: "LUM-REG-003 Information Security Control Register v2.3.pdf",
  mime: PDF,
  category: "register",
  uploadedDaysAgo: 19,
  pageCount: 11,
  summary: `Authoritative register of the ${CONTROLS.length} information security controls operated within Lumeo's ISMS, grouped by domain (governance, access, cryptography, vulnerability and patch management, logging, incident response, continuity, development, suppliers, HR, physical, assets, data protection). Each control lists its owner, operating status and last review date; ${CONTROLS.filter((c) => c.status === "in_remediation").length} controls are flagged as in remediation.`,
  text: controlRegisterText(),
  records: CONTROLS.map(
    (c): RecordSeed => ({
      kind: "control",
      id: c.id,
      name: c.name,
      description: c.description,
      owner: c.owner,
      status: c.status,
      lastReviewDaysAgo: c.lastReviewDaysAgo,
      anchor: c.anchor,
    })
  ),
};

// ---------------------------------------------------------------------------
// 4. Asset inventory

const inventory = assetInventoryText();
const assetInventory: DocumentSeed = {
  id: "doc-asset-inventory",
  title: "Asset & Technology Inventory — CMDB export August 2026",
  filename: "LUM-INV-2026-08 Asset and Technology Inventory.pdf",
  mime: PDF,
  category: "inventory",
  uploadedDaysAgo: 5,
  pageCount: 9,
  summary: `Monthly consolidated asset inventory covering ${ASSETS.length} asset classes across identity and endpoints, Microsoft 365, the Azure platform (AKS, PostgreSQL, Blob Storage, Key Vault, Front Door), development tooling, security operations, networking, backup, corporate SaaS and the SignaTrust trust service. It also lists ${NOT_IN_USE.length} products explicitly confirmed as not in use, and notes that 12 legacy internal tools still lack an attributed owner.`,
  text: inventory.text,
  records: inventory.records,
};

// ---------------------------------------------------------------------------
// 5. Information Security Policy

const pInfosec = policy("infosec");
const infosec: DocumentSeed = {
  id: "doc-infosec",
  title: `${pInfosec.name} v${pInfosec.version}`,
  filename: `LUM-POL-001 Information Security Policy v${pInfosec.version}.docx`,
  mime: DOCX,
  category: "policy",
  uploadedDaysAgo: pInfosec.approvedDaysAgo - 2,
  pageCount: 7,
  summary:
    "Top-level information security policy approved by the CEO and Security Steering Committee. It states management commitment, the ISMS scope, the 2026 security objectives (SOC 2 Type II observation period, passkey rollout, 95% awareness completion), the roles of the CISO, DPO and service owners, the topic-specific policy set and the compliance obligations under ISO 27001, NIS2, GDPR and customer contracts.",
  text: `# ${pInfosec.name} v${pInfosec.version}

${documentControl(pInfosec, "LUM-POL-001", { approvedBy: `${ownerName("CEO")}, CEO, on recommendation of the Security Steering Committee` })}

## §1 Purpose

This policy states the commitment of ${ORG.name}'s management to protecting the confidentiality, integrity and availability of the information entrusted to us by our customers, employees and partners, and it establishes the framework of topic-specific policies, standards and procedures through which that commitment is implemented.

## §2 Scope

The policy applies to all employees, contractors and temporary staff of ${ORG.shortName}, at both offices and when working remotely, and to all information systems within the ISMS scope: "${ISO_CERT.scope}"

## §3 Objectives

Management sets the following information security objectives for 2026, reviewed quarterly at the Security Steering Committee:

1. Complete the SOC 2 Type II observation period (1 July – 31 December 2026) with no exceptions on Security, Availability and Confidentiality criteria.
2. Complete the passkey (FIDO2) rollout to all staff by 30 September 2026.
3. Reach 95% completion of the annual security awareness campaign and keep the phishing simulation click rate below 5%.
4. Close the LUM-AM-01 asset ownership remediation and include the e-signature service in the 2027 failover exercise.
5. Maintain zero critical vulnerabilities older than 48 hours on internet-facing components.

## §4 Roles and responsibilities

- **Management (CEO and leadership team)** approves this policy, provides resources and chairs the annual management review.
- **CISO** owns the ISMS, the risk register and the policy set, reports quarterly to the Security Steering Committee and is the point of contact for the CCB, auditors and customer security reviews.
- **Legal Counsel & DPO** owns data protection compliance and breach notification to the Belgian Data Protection Authority.
- **Service and department owners** are accountable for the risks and controls in their area as listed in the Information Security Control Register.
- **All staff and contractors** comply with this policy and the Acceptable Use Policy, complete mandatory training and report security events without delay.

## §5 Policy framework

This policy is implemented through the following topic-specific documents, each with its own owner and annual review: Access Control Policy; Cryptography & Key Management Standard; Incident Response Plan; Business Continuity & Disaster Recovery Plan; Supplier & Third-Party Security Policy; Secure Development Policy; Acceptable Use Policy; HR Security Procedure; Data Protection Policy; Risk Management Procedure. The Information Security Control Register records the controls that put these documents into practice.

## §6 Risk management

Information security risks are identified, analysed and treated in line with the Risk Management Procedure (ISO 27005-based), at least annually and on significant change. Risk appetite is set by the leadership team; risks above appetite require a treatment plan with an owner and due date.

## §7 Compliance obligations

${ORG.shortName} maintains its ISO/IEC 27001:2022 certification, complies with the Belgian NIS2 Act as a registered important entity (assessed against the CCB CyberFundamentals framework), complies with the GDPR as processor and controller, and honours the security commitments made in customer contracts — including the DORA-related provisions required by our financial-services customers.

## §8 Compliance with this policy

Non-compliance is handled through the disciplinary process in the HR Security Procedure and may lead to termination of employment or contract. Exceptions must be approved by the CISO, be time-bound and be recorded in the exception register.

## §9 Review

The CISO reviews this policy annually and after significant changes to the business, the threat landscape or applicable regulation.
`,
  records: [
    policyRecord(pInfosec),
    fact(
      "Security objectives 2026",
      "Complete the SOC 2 Type II observation period without exceptions; complete the passkey (FIDO2) rollout to all staff by 30 September 2026; reach 95% awareness completion with phishing click rate under 5%; close the LUM-AM-01 asset ownership remediation and include the e-signature service in the 2027 failover exercise; zero critical vulnerabilities older than 48 hours on internet-facing components.",
      "§3 Objectives"
    ),
    fact(
      "Security exceptions",
      "Exceptions to security policies must be approved by the CISO, be time-bound and be recorded in the exception register.",
      "§8 Compliance with this policy"
    ),
  ],
};

// ---------------------------------------------------------------------------
// 6. Access Control Policy (text authored separately)

const pAccess = policy("access-control");
const accessControl: DocumentSeed = {
  id: "doc-access-control",
  title: `${pAccess.name} v${pAccess.version}`,
  filename: `LUM-POL-002 Access Control Policy v${pAccess.version}.docx`,
  mime: DOCX,
  category: "policy",
  uploadedDaysAgo: pAccess.approvedDaysAgo - 1,
  pageCount: 6,
  summary:
    "Access control policy covering least-privilege role profiles, the automated joiner/mover/leaver flow from Officient into Entra ID, MFA for all access with FIDO2 for privileged users, PIM-based privileged access, quarterly access reviews, remote access rules and the exception process. Approved November 2025; it predates the July 2026 passkey rollout and the decommissioning of the legacy VPN.",
  text: ACCESS_CONTROL_POLICY_TEXT,
  records: [policyRecord(pAccess)],
};

// ---------------------------------------------------------------------------
// 7. Cryptography & Key Management Standard

const pCrypto = policy("cryptography");
const cryptography: DocumentSeed = {
  id: "doc-cryptography",
  title: `${pCrypto.name} v${pCrypto.version}`,
  filename: `LUM-STD-004 Cryptography and Key Management Standard v${pCrypto.version}.docx`,
  mime: DOCX,
  category: "standard",
  uploadedDaysAgo: pCrypto.approvedDaysAgo - 3,
  pageCount: 5,
  summary:
    "Technical standard defining approved and prohibited algorithms, TLS requirements, customer-managed key encryption at rest in Azure Key Vault Premium (HSM), annual key rotation with separated custodian roles, certificate lifecycle, and the boundary with SignaTrust for qualified signature keys. Owned by the Head of Platform & SRE.",
  text: `# ${pCrypto.name} v${pCrypto.version}

${documentControl(pCrypto, "LUM-STD-004", { approvedBy: "CISO and CTO" })}

## §1 Purpose and scope

This standard specifies how cryptography is used to protect ${ORG.shortName} and customer information, and how cryptographic keys and certificates are managed throughout their lifecycle. It applies to ${ORG.product}, the supporting Azure estate, corporate IT and all managed endpoints. It implements controls LUM-CR-01 (encryption in transit) and LUM-CR-02 (encryption at rest & key management).

## §2 Approved algorithms and protocols

| Purpose | Approved | Prohibited |
| --- | --- | --- |
| Symmetric encryption | AES-256 (GCM preferred; CBC with HMAC for legacy formats) | 3DES, RC4, Blowfish, any key < 128 bit |
| Asymmetric / signatures | RSA-3072 or longer, ECDSA P-256/P-384, Ed25519 | RSA < 2048, DSA |
| Hashing | SHA-256, SHA-384, SHA-512 | MD5, SHA-1 (except for non-security checksums) |
| Password storage | Argon2id (application accounts); Entra ID managed for staff | Unsalted or fast hashes |
| Transport | TLS 1.2 minimum, TLS 1.3 preferred, AEAD cipher suites only | TLS 1.0/1.1, SSL, export ciphers |

New algorithms may only be introduced with the approval of the Security Engineer and the Head of Platform & SRE.

## §3 Data at rest

All customer data at rest is encrypted with AES-256 using **customer-managed keys (CMK)** held in Azure Key Vault Premium (HSM-backed, FIPS 140-2 Level 3): Azure Database for PostgreSQL, Azure Blob Storage (including the immutable container for signed contracts), Azure Cache for Redis and all backups. Azure Policy denies the creation of production data stores without CMK. Managed endpoints use BitLocker (Windows) or FileVault (macOS) with recovery keys escrowed in Entra ID.

## §4 Data in transit

Customer-facing traffic terminates at Azure Front Door with a minimum of TLS 1.2, TLS 1.3 enabled and HSTS (max-age one year, includeSubDomains). Inter-service traffic inside AKS is mutually authenticated and encrypted by the service mesh. Administrative access uses TLS or SSH with key-based authentication only. Email uses opportunistic TLS with MTA-STS enforced for the lumeo.be domain.

## §5 Key management

- **Ownership.** The Head of Platform & SRE is the key management process owner. Two key custodians (a Platform engineer and the Security Engineer) are required for key generation, backup and destruction ceremonies; no single person can perform a complete key ceremony alone.
- **Generation and storage.** Keys are generated inside Key Vault HSMs and never exported. Application secrets and connection strings are stored in Key Vault and injected at runtime; storing secrets in code, configuration files or tickets is prohibited and detected by GitHub secret scanning.
- **Rotation.** Customer-managed data encryption keys are rotated annually (last rotation 2026-03-11) and on suspected compromise. Application secrets are rotated at least annually and on staff offboarding where a person had access.
- **Access and logging.** Access to keys is granted through Key Vault RBAC to workload identities only; human access requires PIM activation. All key operations are logged to Microsoft Sentinel and retained for 12 months hot and 24 months archived.
- **Revocation and destruction.** Compromised or retired keys are disabled, retained for 90 days for recovery purposes and then purged; destruction is recorded by both custodians.

## §6 Certificates

Public TLS certificates are issued by a publicly trusted CA through Key Vault with automatic renewal; validity is limited to one year. Expiry is monitored and alerts are raised 30 days before expiry. Internal service certificates are issued by the mesh's internal CA with a validity of 24 hours. Certificate private keys are generated in Key Vault and never leave it.

## §7 Qualified electronic signatures

Qualified certificates, signature creation and qualified timestamps are provided by SignaTrust NV as a qualified trust service provider. ${ORG.shortName} never holds or has access to signers' private keys; the platform submits document hashes to SignaTrust over mutually authenticated TLS and stores the returned signature containers in the immutable archive. SignaTrust's annual eIDAS conformity assessment report is reviewed under the Supplier & Third-Party Security Policy.

## §8 Exceptions

Deviations from this standard (for example a customer integration that requires TLS 1.1) require a risk assessment, CISO approval, a compensating control and an expiry date of at most six months. Approved exceptions are listed in the exception register and reported to the Security Steering Committee.
`,
  records: [
    policyRecord(pCrypto),
    fact(
      "Prohibited cryptography",
      "Prohibited: 3DES, RC4, Blowfish, keys under 128 bit, RSA under 2048, DSA, MD5, SHA-1 (except non-security checksums), TLS 1.0/1.1, SSL and export ciphers. TLS 1.2 minimum, TLS 1.3 preferred, AEAD cipher suites only.",
      "§2 Approved algorithms and protocols"
    ),
    fact(
      "Key custodians and rotation",
      "Head of Platform & SRE owns key management; two custodians (a Platform engineer and the Security Engineer) are required for key ceremonies. Customer-managed keys are HSM-generated in Key Vault Premium, never exported, rotated annually (last rotation 2026-03-11) and on suspected compromise; retired keys are kept 90 days then purged.",
      "§5 Key management"
    ),
    fact(
      "Qualified signature keys",
      "Signers' private keys for qualified electronic signatures are held exclusively by SignaTrust NV (QTSP); Lumeo submits document hashes over mutually authenticated TLS and never has access to signer keys.",
      "§7 Qualified electronic signatures"
    ),
  ],
};

// ---------------------------------------------------------------------------
// 8. Incident Response Plan

const pIr = policy("incident-response");
const incidentResponse: DocumentSeed = {
  id: "doc-incident-response",
  title: `${pIr.name} v${pIr.version}`,
  filename: `LUM-PLN-005 Incident Response Plan v${pIr.version}.docx`,
  mime: DOCX,
  category: "plan",
  uploadedDaysAgo: pIr.approvedDaysAgo - 1,
  pageCount: 10,
  summary:
    "Incident response plan with a four-level severity matrix, named incident roles, detection and paging arrangements, the response process and evidence handling, and the full set of notification clocks: customers within 24 hours, NIS2 reporting to the CCB (24h/72h/1 month), GDPR breach notification within 72 hours and impact data for DORA-regulated customers. Records the November 2025 tabletop exercise.",
  text: `# ${pIr.name} v${pIr.version}

${documentControl(pIr, "LUM-PLN-005", { classification: "Internal — contact annex is Confidential" })}

## §1 Purpose and scope

This plan defines how ${ORG.name} detects, responds to, recovers from and learns from information security incidents affecting ${ORG.product}, corporate IT or the data entrusted to us. It implements control LUM-IR-01 and satisfies the incident handling requirements of ISO/IEC 27001, the Belgian NIS2 Act and the GDPR, and the notification commitments made to customers.

## §2 Definitions and severity matrix

A *security event* is any observable occurrence relevant to security; a *security incident* is an event that has, or is likely to have, an adverse impact on confidentiality, integrity or availability.

| Severity | Definition | Examples | Triage target |
| --- | --- | --- | --- |
| S1 — Critical | Confirmed compromise or exposure of customer data; platform-wide outage over 1 hour; integrity of signed contracts in doubt | Ransomware on production, exfiltration, signature service compromise | 30 minutes, 24/7 |
| S2 — High | Likely exposure of customer data or significant service degradation; compromise of a privileged account | Credential theft of an engineer, actively exploited vulnerability on an internet-facing component | 30 minutes, 24/7 |
| S3 — Medium | Contained incident with no customer data impact | Malware on a single endpoint, misdirected internal email | 4 business hours |
| S4 — Low | Policy violation or near miss | Phishing click without credential entry | 2 business days |

## §3 Roles

- **Incident Manager** — the CISO (${ownerName("CISO")}) or, as delegate, the Security Engineer (${ownerName("Security Engineer")}); declares the incident, sets severity, coordinates and closes.
- **Technical Lead** — the Platform on-call engineer; leads containment and recovery.
- **Communications Lead** — the COO (${ownerName("COO")}); customer, status page and press communication.
- **DPO** (${ownerName("Legal Counsel & DPO")}) — personal data assessment and notification to the Belgian Data Protection Authority; **Legal** — contractual and regulatory obligations.
- **Crisis Management Team** — activated for S1 incidents per the Business Continuity & Disaster Recovery Plan.

## §4 Detection and reporting

Incidents are detected through Microsoft Sentinel alerts (24/7 first-line monitoring by the external SOC partner), Datadog availability alerts, Defender for Endpoint, customer reports to support and staff reports. All staff report suspected incidents immediately via the "Report security issue" button in Teams or security@lumeo.be. High-severity alerts page the Platform on-call engineer, who escalates S1/S2 to the Incident Manager without delay.

## §5 Response process

1. **Triage** within the target above: confirm, classify, open the incident channel and ticket, start the timeline.
2. **Contain**: isolate endpoints via Defender, revoke sessions and rotate credentials via Entra ID, block indicators at Front Door/WAF, scale down affected services.
3. **Eradicate and recover**: remove the cause, restore from backup where needed (see BC/DR Plan), verify integrity of the contract archive, monitor for recurrence.
4. **Evidence handling**: preserve logs and images before remediation where feasible; maintain chain of custody; store evidence in the restricted incident share.
5. **Close**: Incident Manager confirms recovery, final communications and hand-over to post-incident review.

## §6 Notification obligations

| Obligation | Trigger | Clock | Owner |
| --- | --- | --- | --- |
| Customers | Confirmed incident affecting their data or service | Initial notice within 24 hours; updates at least every 24 hours; written report within 10 working days | Communications Lead |
| CCB (NIS2 significant incident) | Significant incident as defined by the NIS2 Act | Early warning within 24 hours; incident notification within 72 hours; final report within 1 month — via the CCB notification portal | Incident Manager |
| Belgian Data Protection Authority (GDPR) | Personal data breach with risk to data subjects (as controller); support to customer controllers (as processor) | 72 hours; customers informed without undue delay to allow their own notification | DPO |
| DORA-regulated customers | Any incident affecting services to a financial customer | Impact data (affected services, users, duration, data categories) in the customer's register-of-information format, alongside the customer notice | Communications Lead + Incident Manager |
| SignaTrust | Suspected compromise of the signature integration | Immediately, per the partner agreement | Technical Lead |

## §7 Post-incident review

A post-incident review is mandatory for S1 and S2 incidents and held within 10 working days of closure. It records the timeline, root cause, effectiveness of detection and response, and improvement actions with owners and due dates, which are tracked in the risk register and reported to the Security Steering Committee.

## §8 Exercises

The plan is exercised at least annually through a tabletop exercise with the leadership team. The most recent exercise (November 2025) simulated ransomware on the build pipeline; follow-up actions included signed pipeline attestations and a rehearsal of the CCB notification.

## §9 Contacts

The contact annex (Incident Manager, on-call rota, CCB portal, DPA, SignaTrust security desk, external forensic partner, cyber insurer) is maintained separately and stored offline with the break-glass credentials.
`,
  records: [
    policyRecord(pIr),
    fact(
      "Incident severity matrix",
      "S1 Critical (customer data compromise, platform-wide outage over 1 hour, signed-contract integrity in doubt) and S2 High (likely data exposure, privileged account compromise) are triaged within 30 minutes 24/7; S3 Medium within 4 business hours; S4 Low within 2 business days.",
      "§2 Definitions and severity matrix"
    ),
    fact(
      "Incident notification clocks",
      "Customers: initial notice within 24 hours, updates every 24 hours, written report within 10 working days. CCB (NIS2): early warning 24 hours, notification 72 hours, final report 1 month. GDPR breaches: 72 hours to the Belgian DPA via the DPO. DORA-regulated customers additionally receive impact data in their register-of-information format.",
      "§6 Notification obligations"
    ),
    fact(
      "Last incident response exercise",
      "Annual tabletop exercise held in November 2025 (ransomware on the build pipeline scenario); follow-up actions: signed pipeline attestations and a rehearsal of the CCB notification.",
      "§8 Exercises"
    ),
  ],
};

// ---------------------------------------------------------------------------
// 9. Business Continuity & DR Plan

const pBc = policy("business-continuity");
const businessContinuity: DocumentSeed = {
  id: "doc-business-continuity",
  title: `${pBc.name} v${pBc.version}`,
  filename: `LUM-PLN-006 Business Continuity and Disaster Recovery Plan v${pBc.version}.docx`,
  mime: DOCX,
  category: "plan",
  uploadedDaysAgo: pBc.approvedDaysAgo - 2,
  pageCount: 12,
  summary:
    "Business continuity and disaster recovery plan for the Lumeo Contract Cloud platform: business impact analysis with RTO 4h / RPO 15 min for the core platform, warm-standby strategy in Azure North Europe, crisis management team, activation and communication procedures, monthly restore tests and the annual regional failover exercise. Approved June 2025 and now past its annual review date; the January 2026 exercise result (e-signature service descoped) is not yet reflected.",
  text: `# ${pBc.name} v${pBc.version}

${documentControl(pBc, "LUM-PLN-006", { approvedBy: `${ownerName("CEO")}, CEO` })}

## §1 Purpose

This plan ensures that ${ORG.name} can continue to deliver ${ORG.product} and its supporting services during and after a disruptive event, and can recover within the objectives agreed with customers. It implements controls LUM-BC-01 (backup) and LUM-BC-02 (business continuity & disaster recovery) and supports our NIS2 and contractual continuity obligations.

## §2 Business impact analysis (summary)

| Service | Criticality | RTO | RPO | Maximum tolerable downtime |
| --- | --- | --- | --- | --- |
| Contract Cloud web application and API | Critical | 4 hours | 15 minutes | 8 hours |
| E-signature service (SignaTrust integration) | Critical | 4 hours | 15 minutes | 8 hours |
| Customer portal and archive search | High | 8 hours | 1 hour | 24 hours |
| Customer support (Jira Service Management, telephony) | High | 8 hours | 4 hours | 24 hours |
| Corporate IT (Microsoft 365, Officient, Exact Online) | Medium | 24 hours | 24 hours | 3 days |
| Offices (Ghent, Namur) | Low | 5 days | n/a | 10 days — staff work remotely |

## §3 Continuity strategy

The platform runs in Azure West Europe with a **warm-standby** environment in Azure North Europe: an AKS cluster kept at reduced scale, a PostgreSQL geo-replica, geo-redundant Blob Storage and Key Vault replication. Azure Front Door performs health-based failover of the public endpoints. Configuration is fully defined in Terraform, so the standby environment is rebuilt from code on every release. Corporate IT relies on Microsoft's own resilience plus Veeam backups of Microsoft 365. Staff can work from home with managed laptops; no business function depends on office presence.

## §4 Crisis management team

| Role | Member | Deputy |
| --- | --- | --- |
| Chair | ${ownerName("CEO")} (CEO) | ${ownerName("COO")} (COO) |
| Operations & customer communication | ${ownerName("COO")} (COO) | ${person("customer success")} |
| Technology & recovery | ${ownerName("CTO")} (CTO) | ${ownerName("Head of Platform & SRE")} |
| Security | ${ownerName("CISO")} (CISO) | ${ownerName("Security Engineer")} |
| People & facilities | ${ownerName("Head of People")} | ${ownerName("CFO")} (CFO) |
| Legal & data protection | ${ownerName("Legal Counsel & DPO")} | external counsel |

## §5 Activation

The plan is activated by the Chair (or deputy) when an event is expected to exceed the RTO of a critical service, on declaration of an S1 security incident, or on loss of the Ghent office. Activation opens the crisis channel, convenes the team within 60 minutes and starts the decision log. Regional failover of the platform is decided by the CTO on the recommendation of the Head of Platform & SRE.

## §6 Communication

Customers are informed through the public status page (status.lumeo.cloud), email to registered administrators and, for critical customers, direct calls by Customer Success. Regulatory and data protection notifications follow the Incident Response Plan. Staff are informed through Teams and, if Microsoft 365 is unavailable, through the SMS broadcast list maintained by People.

## §7 Recovery procedures

Runbooks in Confluence cover: regional failover of AKS workloads; promotion of the PostgreSQL geo-replica; re-pointing Front Door; restoring Blob Storage from geo-replication or soft-deleted versions; point-in-time restore of PostgreSQL (35-day window); restoring AKS configuration; rebuilding the platform from Terraform in a clean subscription (ransomware scenario); and re-establishing the SignaTrust integration. Runbooks are versioned with the infrastructure code.

## §8 Testing and exercises

- **Monthly restore test**: a PostgreSQL point-in-time restore into an isolated environment with integrity checks, documented in the backup vault report.
- **Annual failover exercise**: a full regional failover of the platform. The most recent exercise (14 January 2026) failed over the core platform to North Europe in 3 hours 5 minutes with under 5 minutes of data loss, within the RTO/RPO. The e-signature service was descoped from the exercise because of the SignaTrust integration and was only tested in a limited way; including it is a remediation action for the next exercise.
- **Crisis management tabletop**: annually, combined with the incident response tabletop.

## §9 Return to normal

After the disruption, services are failed back to West Europe during a maintenance window, data consistency is verified, the decision log is closed and a review with improvement actions is held within 10 working days.

## §10 Maintenance and review

The COO reviews this plan annually, after each exercise and after any activation. Changes to critical suppliers, architecture or recovery objectives trigger an interim review.
`,
  records: [
    policyRecord(pBc),
    fact(
      "Recovery objectives",
      "Contract Cloud web application/API and the e-signature service: RTO 4 hours, RPO 15 minutes, maximum tolerable downtime 8 hours. Customer portal and archive search: RTO 8 hours, RPO 1 hour. Customer support: RTO 8 hours, RPO 4 hours. Corporate IT: RTO/RPO 24 hours. Offices: RTO 5 days (staff work remotely).",
      "§2 Business impact analysis (summary)"
    ),
    fact(
      "Crisis management team",
      `Chaired by the CEO (${ownerName("CEO")}) with the COO (operations & customer communication), CTO (technology & recovery), CISO (security), Head of People (people & facilities) and Legal Counsel & DPO; convenes within 60 minutes of activation. Regional failover is decided by the CTO.`,
      "§4 Crisis management team"
    ),
    fact(
      "Continuity communication channels",
      "Customers: public status page status.lumeo.cloud, email to registered administrators and direct calls for critical customers; staff: Teams with an SMS broadcast list as fallback.",
      "§6 Communication"
    ),
  ],
};

// ---------------------------------------------------------------------------
// 10. Supplier & Third-Party Security Policy

const pSup = policy("supplier-security");
const supplierSecurity: DocumentSeed = {
  id: "doc-supplier-security",
  title: `${pSup.name} v${pSup.version}`,
  filename: `LUM-POL-007 Supplier and Third-Party Security Policy v${pSup.version}.docx`,
  mime: DOCX,
  category: "policy",
  uploadedDaysAgo: pSup.approvedDaysAgo - 2,
  pageCount: 6,
  summary:
    "Policy for managing supplier and third-party security risk: three-tier classification, due diligence before onboarding, mandatory contract clauses (24-hour incident notification, audit rights, 30-day sub-processor notice, exit and data return, DORA pass-through terms), annual reassessment of critical suppliers, and the named critical supplier list (Microsoft, SignaTrust, Datadog, GitHub, Officient).",
  text: `# ${pSup.name} v${pSup.version}

${documentControl(pSup, "LUM-POL-007")}

## §1 Purpose and scope

This policy ensures that suppliers and third parties who process ${ORG.shortName} or customer information, or on whom ${ORG.product} depends, meet security requirements proportionate to the risk they represent. It applies to all suppliers, sub-processors, contractors' agencies and technology partners, and implements control LUM-TP-01. It also ensures that ${ORG.shortName} can meet the third-party risk expectations of its own customers, including those subject to DORA and NIS2.

## §2 Classification

| Tier | Criteria | Examples |
| --- | --- | --- |
| Critical | Processes customer contract data, hosts or is essential to the availability or integrity of the platform, or provides a regulated trust service | Microsoft (Azure, Microsoft 365), SignaTrust, GitHub, Datadog, Officient |
| Important | Processes personal data of staff or customers' users, or supports a business-critical process without platform impact | HubSpot, Exact Online, Atlassian, external SOC partner, penetration testing firm |
| Standard | No access to Confidential or Restricted data and no platform dependency | Office suppliers, training providers |

Classification is assigned by the CISO during onboarding and reviewed at reassessment.

## §3 Due diligence before onboarding

Critical and Important suppliers complete a security questionnaire and provide current assurance evidence (ISO/IEC 27001 certificate, SOC 2 Type II report, eIDAS conformity assessment report for trust service providers, penetration test summary). The CISO reviews the evidence, records residual risks in the risk register and approves or rejects onboarding. Financial due diligence is performed by Finance for Critical suppliers. Personal data processing requires a data protection agreement approved by the DPO before any data is shared.

## §4 Contractual requirements

Contracts with Critical and Important suppliers contain, at minimum: a description of the service and its security requirements; confidentiality; security incident notification to ${ORG.shortName} within 24 hours of the supplier becoming aware; audit and access rights for ${ORG.shortName}, its customers and their competent authorities (which may be satisfied by assurance reports); a prior notification period of 30 days for changes to sub-processors with a right to object; data location within the EU/EEA; exit assistance and return or deletion of data at termination; and, for suppliers in the delivery chain of financial customers, the terms needed to honour DORA Art. 30 obligations passed through by those customers (service levels, business continuity, cooperation with authorities, subcontracting conditions).

## §5 Ongoing monitoring

Critical suppliers are reassessed annually against their latest assurance reports, incident history and changes in scope; Important suppliers every two years. Supplier security incidents affecting ${ORG.shortName} are handled under the Incident Response Plan and reviewed at the next reassessment. Concentration risk — the dependency of the platform on Microsoft Azure and on a single QTSP — is recorded in the risk register with the agreed treatment (multi-region architecture; documented alternative QTSP onboarding plan).

## §6 Critical supplier list

| Supplier | Service | Assurance reviewed | Last reassessment |
| --- | --- | --- | --- |
| Microsoft Ireland Operations Ltd | Azure hosting, Microsoft 365 | ISO 27001, SOC 2 Type II, CSA STAR | ${dateStr(80)} |
| SignaTrust NV | Qualified e-signature and timestamps | eIDAS CAR, ISO 27001 | ${dateStr(95)} |
| GitHub, Inc. | Source control and CI/CD | SOC 2 Type II | ${dateStr(120)} |
| Datadog, Inc. (EU) | Monitoring and APM | SOC 2 Type II, ISO 27001 | ${dateStr(150)} |
| Officient NV | HR system | ISO 27001 | ${dateStr(200)} |

## §7 Offboarding

At termination the supplier returns or deletes ${ORG.shortName} data, confirms deletion in writing, and access credentials, integrations and network connections are removed within five working days. The DPO updates the sub-processor list and customers are notified where the supplier was a sub-processor.

## §8 Roles

The CISO owns this policy and the supplier register; department heads are business owners of their suppliers; Procurement ensures no contract is signed without CISO classification; the DPO approves data protection agreements.
`,
  records: [
    policyRecord(pSup),
    fact(
      "Critical suppliers",
      "Critical tier: Microsoft Ireland Operations Ltd (Azure hosting, Microsoft 365), SignaTrust NV (qualified e-signature and timestamps), GitHub (source control and CI/CD), Datadog EU (monitoring and APM) and Officient (HR system) — each reassessed annually against ISO 27001 / SOC 2 / eIDAS assurance reports. Important tier includes HubSpot, Exact Online, Atlassian, the external SOC partner and the penetration testing firm.",
      "§6 Critical supplier list"
    ),
    fact(
      "Mandatory supplier contract clauses",
      "Security incident notification to Lumeo within 24 hours; audit and access rights for Lumeo, its customers and their competent authorities; 30-day prior notice of sub-processor changes with right to object; EU/EEA data location; exit assistance and data return/deletion; DORA Art. 30 pass-through terms for suppliers in the delivery chain of financial customers.",
      "§4 Contractual requirements"
    ),
  ],
};

// ---------------------------------------------------------------------------
// 11. Secure Development Policy

const pSd = policy("secure-development");
const secureDevelopment: DocumentSeed = {
  id: "doc-secure-development",
  title: `${pSd.name} v${pSd.version}`,
  filename: `LUM-POL-008 Secure Development Policy v${pSd.version}.docx`,
  mime: DOCX,
  category: "policy",
  uploadedDaysAgo: pSd.approvedDaysAgo - 1,
  pageCount: 7,
  summary:
    "Secure software development policy owned by the CTO: threat modelling triggers, OWASP ASVS Level 2 coding standard, mandatory peer review and CI security gates (CodeQL, Dependabot, secret scanning, image scanning), protected branches and signed pipelines, environment separation with no production customer data outside production, secrets management in Key Vault, SBOM and dependency rules, coordinated vulnerability disclosure and annual secure coding training.",
  text: `# ${pSd.name} v${pSd.version}

${documentControl(pSd, "LUM-POL-008", { approvedBy: "CTO and CISO" })}

## §1 Purpose and scope

This policy defines the security requirements for the design, development, testing, release and maintenance of ${ORG.product} and all internal software. It applies to all engineers, contractors and anyone committing code to ${ORG.shortName} repositories, and implements controls LUM-SD-01 (secure development lifecycle) and LUM-SD-02 (change management).

## §2 Security activities in the lifecycle

**Design.** Threat modelling (STRIDE-based, documented in Confluence) is mandatory for new features or changes that handle signed documents, personal data, authentication or authorisation, or that introduce a new external integration. The Security Engineer reviews every threat model.

**Build.** Code follows the ${ORG.shortName} coding standard aligned with OWASP ASVS Level 2. Every change is made through a pull request reviewed by at least one other engineer (CODEOWNERS enforce domain reviewers) and must pass the CI security gates: CodeQL static analysis, Dependabot dependency review, secret scanning and container image scanning. Findings of high or critical severity block the merge.

**Test.** Automated tests run in CI; dynamic application security testing runs quarterly against staging; an external penetration test of the platform is performed annually (Redline Security, March 2026, no critical or high findings open).

**Release.** Production repositories use protected branches: no direct pushes, required reviews and status checks, signed commits recommended. Deployments run only from protected branches through GitHub Actions pipelines with signed provenance attestations, and each production deployment is linked to a Jira change ticket approved by the service owner. Emergency changes follow the emergency path in the change management control and are reviewed within two working days.

## §3 Environments and data

Production, staging and development run in separate Azure subscriptions with separate identities and no shared secrets. **Production customer data is never copied to non-production environments**; test data is synthetic and generated by the data-fixture service. Engineers have no standing access to production; troubleshooting access is granted through PIM and logged.

## §4 Secrets management

Secrets, keys and connection strings are stored in Azure Key Vault and injected at runtime through workload identities. Committing secrets to repositories, tickets, chat or documentation is prohibited; GitHub secret scanning with push protection blocks known patterns, and any leaked secret is rotated immediately and treated as an S3 incident.

## §5 Dependencies and container images

Third-party dependencies are limited to approved package registries; Dependabot alerts are triaged within the vulnerability management SLAs (critical 48 hours, high 7 days). A software bill of materials (SBOM) is generated for every release. Container images are built from ${ORG.shortName}-maintained base images that are rebuilt weekly, scanned before deployment and blocked when critical vulnerabilities are present.

## §6 Vulnerability disclosure

${ORG.shortName} operates a coordinated vulnerability disclosure process: researchers and customers can report vulnerabilities to security@lumeo.be (details in /.well-known/security.txt). Reports are acknowledged within two business days, triaged under the vulnerability management SLAs, and reporters are kept informed until resolution. ${ORG.shortName} does not run a paid bug bounty programme.

## §7 Training

All engineers complete secure coding training on joining and annually thereafter; security champions in each squad receive additional training and take part in the quarterly security guild.

## §8 Exceptions

Deviations (for example a temporary bypass of a CI gate) require approval by the Head of Engineering and the Security Engineer, an expiry date of at most 30 days and an entry in the exception register.
`,
  records: [
    policyRecord(pSd),
    fact(
      "Coordinated vulnerability disclosure",
      "Vulnerabilities can be reported to security@lumeo.be (published in /.well-known/security.txt); reports are acknowledged within two business days and handled under the vulnerability management SLAs. Lumeo does not operate a paid bug bounty programme.",
      "§6 Vulnerability disclosure"
    ),
    fact(
      "Non-production data rule",
      "Production, staging and development run in separate Azure subscriptions; production customer data is never copied to non-production environments (synthetic test data only); engineers have no standing production access — troubleshooting access is granted via PIM and logged.",
      "§3 Environments and data"
    ),
  ],
};

// ---------------------------------------------------------------------------
// 12. Acceptable Use Policy

const pAup = policy("acceptable-use");
const acceptableUse: DocumentSeed = {
  id: "doc-acceptable-use",
  title: `${pAup.name} v${pAup.version}`,
  filename: `LUM-POL-009 Acceptable Use Policy v${pAup.version}.docx`,
  mime: DOCX,
  category: "policy",
  uploadedDaysAgo: pAup.approvedDaysAgo - 3,
  pageCount: 5,
  summary:
    "Acceptable use rules for Lumeo equipment, accounts, Microsoft 365, internet and generative AI tools: managed devices only, no company data on personal devices beyond app-protected Teams/Outlook, approved AI tools limited to Microsoft 365 Copilot and GitHub Copilot with a ban on pasting customer contract content into public tools, SaaS intake via IT, monitoring notice under CBA 81, reporting duties and consequences. Approved August 2025 and now past its annual review date.",
  text: `# ${pAup.name} v${pAup.version}

${documentControl(pAup, "LUM-POL-009", { approvedBy: "Head of People and CISO" })}

## §1 Purpose and scope

This policy sets out what ${ORG.name} expects from everyone who uses its equipment, accounts, networks and information — employees, contractors and temporary staff, at the office, at home or while travelling. Acceptance of this policy is part of onboarding and is re-confirmed annually with the awareness training.

## §2 Equipment and accounts

- Company information is accessed only from ${ORG.shortName}-managed devices enrolled in Microsoft Intune, with disk encryption, Defender for Endpoint and automatic updates enabled. Disabling or bypassing these controls is prohibited.
- The only permitted use of personal devices is Microsoft Teams and Outlook through Intune app protection; company files may not be stored on personal devices, personal cloud storage or personal email.
- Accounts and authentication factors (passwords, security keys, passkeys, Authenticator) are personal and must never be shared. Multi-factor prompts that you did not initiate must be denied and reported.
- Lock your screen when leaving your desk; devices must not be left unattended in public places or vehicles.

## §3 Email, messaging and data handling

Handle information according to its classification (Public, Internal, Confidential, Restricted) as defined in the Data Protection Policy. Confidential and Restricted information is shared only through SharePoint/OneDrive links with expiry or through the platform itself — never as email attachments to external parties. Automatic forwarding of company email to external addresses is blocked and prohibited. Customer contract content must never be discussed in personal messaging apps.

## §4 Generative AI tools

Approved tools are **Microsoft 365 Copilot** (within the ${ORG.shortName} tenant) and **GitHub Copilot** (enterprise licence, with training on ${ORG.shortName} code disabled). Any other generative AI service requires approval through the SaaS intake process. Pasting customer contract content, personal data, credentials or source code into public AI tools is prohibited. AI-generated output used in customer deliverables or code must be reviewed by a person before use.

## §5 Internet and software

Only software approved in the Intune company portal or through the SaaS intake process may be installed or used. Downloading pirated or unlicensed material, using anonymising proxies to bypass controls, or connecting company devices to untrusted networks without the managed security stack active is prohibited. Browsing is filtered for malicious and inappropriate content.

## §6 Remote and hybrid work

Remote work follows the same rules as office work. Use a private, password-protected network where possible; avoid handling Restricted information on public screens; keep printed documents to a minimum and dispose of them securely. Access to internal administrative services goes through Microsoft Entra Private Access with device compliance checks.

## §7 Monitoring notice

To protect its systems and comply with its legal obligations, ${ORG.shortName} logs and monitors the use of its systems (sign-ins, endpoint telemetry, email security events, internet filtering) in accordance with Belgian Collective Bargaining Agreement No. 81 and the GDPR. Monitoring is proportionate, is explained in the works council information note, and individual investigation follows the procedure agreed with the works council.

## §8 Reporting

Report lost or stolen devices, suspected phishing, malware, accidental disclosure or any other security concern immediately through the "Report security issue" button in Teams or to security@lumeo.be. Reporting in good faith never leads to disciplinary action.

## §9 Consequences

Breaches of this policy are handled under the disciplinary process in the HR Security Procedure and, for contractors, under the contract. Serious breaches may lead to dismissal or contract termination and, where the law requires, to notification of the authorities.
`,
  records: [
    policyRecord(pAup),
    fact(
      "Approved generative AI tools",
      "Only Microsoft 365 Copilot (within the Lumeo tenant) and GitHub Copilot (enterprise licence, no training on Lumeo code) are approved; other AI services need SaaS intake approval. Customer contract content, personal data, credentials and source code must never be entered into public AI tools; AI output in deliverables or code is reviewed by a person before use.",
      "§4 Generative AI tools"
    ),
    fact(
      "Personal device rule",
      "Company information is accessed only from Intune-managed devices; the only permitted personal-device use is Teams and Outlook through Intune app protection — no company files on personal devices, personal cloud storage or personal email.",
      "§2 Equipment and accounts"
    ),
    fact(
      "Staff monitoring",
      "Use of company systems is logged and monitored proportionately (sign-ins, endpoint telemetry, email security, internet filtering) in accordance with Belgian CBA No. 81 and the GDPR, with a works council information note and agreed investigation procedure.",
      "§7 Monitoring notice"
    ),
  ],
};

// ---------------------------------------------------------------------------
// 13. HR Security Procedure

const pHr = policy("hr-security");
const hrSecurity: DocumentSeed = {
  id: "doc-hr-security",
  title: `${pHr.name} v${pHr.version}`,
  filename: `LUM-PRC-010 HR Security Procedure v${pHr.version}.docx`,
  mime: DOCX,
  category: "procedure",
  uploadedDaysAgo: pHr.approvedDaysAgo - 1,
  pageCount: 6,
  summary:
    "HR security procedure owned by the Head of People: two screening categories (all staff vs. production/financial access with criminal record extract), confidentiality and IP agreements, onboarding via Officient into Entra ID, mover and leaver checklists with same-day account disabling and 5-day equipment return, the awareness and training programme (onboarding, annual, quarterly phishing, engineer secure coding, 95% target) and the disciplinary process.",
  text: `# ${pHr.name} v${pHr.version}

${documentControl(pHr, "LUM-PRC-010", { approvedBy: "Head of People and CISO" })}

## §1 Purpose and scope

This procedure describes the people-related security steps before, during and at the end of employment or engagement at ${ORG.name}. It applies to employees, contractors and temporary staff and implements controls LUM-HR-01 (personnel screening & onboarding) and LUM-HR-02 (security awareness & training).

## §2 Screening

| Category | Applies to | Checks before start |
| --- | --- | --- |
| A — all staff | Every employee, contractor and temporary worker | Identity verification (eID or passport), right to work, verification of the two most recent references or employers, confirmation of relevant qualifications |
| B — elevated trust | Roles with production access, privileged IT access, access to Finance systems or to Restricted data | Category A plus an extract from the criminal record (*uittreksel uit het strafregister / extrait de casier judiciaire*, model 1) not older than three months, where lawful in the person's country of residence |

Screening is performed by People before the start date; for contractors placed by an agency the agency confirms equivalent checks in writing. Completion is recorded in Officient and is a precondition for account creation — Platform & SRE will not create accounts for a person whose screening status is incomplete. Screening is repeated when a person moves into a Category B role.

## §3 Agreements

Every employment contract and contractor agreement includes confidentiality obligations that survive termination, assignment of intellectual property, and acceptance of the Acceptable Use Policy and the Information Security Policy. Contractors additionally sign the contractor security addendum (managed device use, data handling, incident reporting).

## §4 Onboarding

1. People creates the person in Officient with role, department, start date and manager; the integration creates the Entra ID account with the role profile on the evening before the start date (disabled until start).
2. Platform & SRE ships a managed, Intune-enrolled laptop; the person completes device setup with MFA registration on day one.
3. Day-one security briefing and the security awareness e-learning are completed within the first week; engineers complete secure coding training within the first month.
4. Badge issued by Office Management; for Category B roles, the manager requests additional access through the access request workflow.

## §5 Movers

Role or department changes are recorded in Officient by People; the integration updates the role profile in Entra ID and removes access no longer needed. The new manager reviews residual access within 10 working days; Category B checks are performed where required.

## §6 Offboarding

- People records the leaving date in Officient; the integration disables the Entra ID account on the last working day at 18:00 and removes it after 30 days.
- The manager collects the laptop, badge and any security keys within five working days; devices are wiped and re-enrolled.
- Platform & SRE rotates shared or service credentials the person had access to, and removes access to SaaS tools not integrated with Entra ID.
- People conducts an exit interview that includes a reminder of continuing confidentiality obligations.

## §7 Awareness and training programme

| Activity | Audience | Frequency | Target |
| --- | --- | --- | --- |
| Security awareness e-learning | All staff | Onboarding and annually | 95% completion |
| Phishing simulation | All staff | Quarterly, with targeted follow-up for repeat clickers | Click rate under 5% |
| Secure coding training | Engineers | Onboarding and annually | 95% completion |
| Role-specific briefings (Finance fraud, Customer Success data handling) | Selected teams | Annually | Attendance recorded |

Completion is tracked in Officient and reported quarterly to the Security Steering Committee. Managers are responsible for follow-up with staff who miss the deadline.

## §8 Disciplinary process

Suspected breaches of security policies are reported to People and the CISO. Depending on severity the process ranges from a documented reminder, through a formal warning, to dismissal for serious cause under Belgian employment law; contractors are handled under their contract. Deliberate misuse of customer data is always treated as serious cause.
`,
  records: [
    policyRecord(pHr),
    fact(
      "Screening categories",
      "Category A (all staff): identity verification, right to work, two reference checks and qualification confirmation. Category B (production, privileged IT, Finance or Restricted-data access): additionally a criminal record extract (model 1) not older than three months where lawful. Completion is recorded in Officient and is a precondition for account creation.",
      "§2 Screening"
    ),
    fact(
      "Leaver timeline",
      "Entra ID account disabled automatically on the last working day at 18:00 and deleted after 30 days; laptop, badge and security keys returned within five working days; shared and service credentials the person could access are rotated.",
      "§6 Offboarding"
    ),
  ],
};

// ---------------------------------------------------------------------------
// 14. Data Protection Policy

const pDp = policy("data-protection");
const dataProtection: DocumentSeed = {
  id: "doc-data-protection",
  title: `${pDp.name} v${pDp.version}`,
  filename: `LUM-POL-011 Data Protection Policy v${pDp.version}.docx`,
  mime: DOCX,
  category: "policy",
  uploadedDaysAgo: pDp.approvedDaysAgo - 2,
  pageCount: 8,
  summary:
    "GDPR policy owned by the Legal Counsel & DPO: Lumeo's processor and controller roles, the four-level data classification scheme, the retention schedule (customer data deleted 90 days after contract end plus 35 days for backups; audit trails 10 years; HR records 5 years), data subject request handling, DPIA triggers, the EU-only sub-processor list with 30-day change notice, and breach handling linked to the Incident Response Plan.",
  text: `# ${pDp.name} v${pDp.version}

${documentControl(pDp, "LUM-POL-011", { approvedBy: "Security Steering Committee; DPO opinion attached" })}

## §1 Purpose and scope

This policy sets out how ${ORG.name} complies with the General Data Protection Regulation and the Belgian Data Protection Act when processing personal data — as a processor on behalf of customers using ${ORG.product}, and as a controller for its own staff, customer-contact and website data. It applies to all staff and contractors and implements control LUM-DP-01.

## §2 Roles

- **Processor**: contract content, signer identities, audit trails and metadata stored in ${ORG.product} are processed on documented customer instructions under the Data Processing Agreement (DPA) that forms part of every customer contract.
- **Controller**: HR data (Officient), customer-contact and prospect data (HubSpot), finance data (Exact Online), website analytics and support tickets.
- The **Legal Counsel & DPO** (${ownerName("Legal Counsel & DPO")}) is the registered Data Protection Officer with the Belgian Data Protection Authority, maintains the Record of Processing Activities (RoPA v4) and the DPIA register, and is the contact for data subjects and authorities.

## §3 Principles

Personal data is processed lawfully, fairly and transparently; collected for specified purposes; minimised; kept accurate; retained no longer than necessary; and protected by the controls in the Information Security Control Register. Privacy by design and by default is applied to every new feature through the threat modelling and DPIA triggers below.

## §4 Data classification

| Class | Definition | Examples | Handling |
| --- | --- | --- | --- |
| Public | Approved for publication | Marketing site, release notes | No restriction |
| Internal | Business information not for publication | Internal procedures, roadmap | Staff and contractors only |
| Confidential | Disclosure would harm ${ORG.shortName}, a customer or a person | Customer contract content, personal data, source code, security reports | Need-to-know; encrypted in transit and at rest; shared via expiring links only |
| Restricted | Disclosure would cause severe harm or breach the law | Signer identity documents, credentials and keys, HR health data, incident evidence | Named access only; PIM for systems; no export without DPO/CISO approval |

## §5 Retention schedule

| Data | Retention |
| --- | --- |
| Customer contract data (as processor) | Contract term plus 90 days export window; deleted from production thereafter and from backups within a further 35 days; deletion certificate on request |
| Customer audit trails (signatures, views) | Life of the contract plus 10 years, as contractually required for evidential value |
| HR records | 5 years after the end of employment (Belgian social law), payroll 10 years |
| CRM and prospect data | 3 years after the last meaningful contact |
| Support tickets | 3 years after closure |
| Security logs | 12 months hot, 24 months archive |

## §6 Data subject requests

As processor, ${ORG.shortName} forwards requests received directly to the customer within 2 working days and executes customer instructions within 5 working days using the platform's export and deletion functions. As controller, requests are answered within one month (extendable by two months for complex cases) through the DPO.

## §7 Data protection impact assessments

A DPIA is mandatory for processing that involves signer identity verification, profiling or automated decision-making, large-scale processing of special categories, or new sub-processors handling customer data. The DPIA for the e-signature module (identity verification through SignaTrust) was completed in 2025 and is reviewed annually.

## §8 Sub-processors and international transfers

All customer data is stored and processed within the EU/EEA. Sub-processors for the platform are Microsoft Ireland Operations Ltd (hosting, Microsoft 365), SignaTrust NV (qualified trust services) and Datadog (EU region, platform telemetry without contract content). The list is published to customers, and changes are notified 30 days in advance with a right to object under the DPA. No transfers to third countries take place; Microsoft support access is governed by the EU Data Boundary commitments.

## §9 Breach handling

Suspected personal data breaches are handled under the Incident Response Plan. The DPO assesses risk to data subjects and notifies the Belgian Data Protection Authority within 72 hours where required; as processor, ${ORG.shortName} informs affected customers without undue delay so they can meet their own obligations.

## §10 Training and review

Data protection training is part of the annual awareness programme, with role-specific sessions for Customer Success and People. The DPO reviews this policy annually and reports on data protection compliance at the Security Steering Committee.
`,
  records: [
    policyRecord(pDp),
    fact(
      "Data classification scheme",
      "Four classes: Public; Internal; Confidential (customer contract content, personal data, source code, security reports — need-to-know, encrypted, expiring links only); Restricted (signer identity documents, credentials and keys, HR health data, incident evidence — named access, PIM, no export without DPO/CISO approval).",
      "§4 Data classification"
    ),
    fact(
      "Retention schedule",
      "Customer contract data: contract term plus 90-day export window, then deleted from production and from backups within a further 35 days (deletion certificate on request). Customer audit trails: contract life plus 10 years. HR records: 5 years after employment (payroll 10 years). CRM: 3 years after last contact. Support tickets: 3 years. Security logs: 12 months hot, 24 months archive.",
      "§5 Retention schedule"
    ),
    fact(
      "Sub-processors",
      "Platform sub-processors: Microsoft Ireland Operations Ltd (hosting, Microsoft 365), SignaTrust NV (qualified trust services), Datadog EU (telemetry, no contract content). All processing within the EU/EEA; no third-country transfers; changes notified to customers 30 days in advance with right to object.",
      "§8 Sub-processors and international transfers"
    ),
  ],
};

// ---------------------------------------------------------------------------
// 15. Noordbank questionnaire response

const noordbankText = `# Vendor security & DORA ICT third-party due diligence questionnaire — response to Noordbank NV

| Field | Value |
| --- | --- |
| Customer | Noordbank NV, Brussels — Third-Party Risk Management / DORA ICT due diligence |
| Customer reference | NB-TPRM-2026-0147 |
| Service in scope | ${ORG.product} (contract lifecycle management and qualified e-signature) |
| Date of response | ${dateStr(162)} |
| Responder | ${ownerName("CISO")}, Chief Information Security Officer |
| Reviewed by | ${ownerName("Legal Counsel & DPO")}, Legal Counsel & DPO |
| Classification | Confidential — shared under NDA |

This document contains ${ORG.name}'s answers to the annual ICT third-party due diligence questionnaire issued by Noordbank NV in the context of its DORA ICT third-party risk management framework. Answers reflect the situation at the date of response. Supporting evidence (certificate, SoA, penetration test summary, DPA) is provided through the Noordbank supplier portal.

${QA_NOORDBANK.map((q) => `### ${q.anchor}. ${q.question}\n\n${q.answer}`).join("\n\n")}

### Q12. Additional remarks

${ORG.shortName} confirms that the information above may be recorded in Noordbank's register of information and that we will notify Noordbank of material changes to the service, its sub-processors or our certification status within 30 days.

*Signed on behalf of ${ORG.name} — ${ownerName("CISO")}, CISO, ${dateStr(162)}*
`;

const noordbank: DocumentSeed = {
  id: "doc-questionnaire-noordbank",
  title: "Vendor security & DORA ICT third-party due diligence questionnaire — response to Noordbank NV (March 2026)",
  filename: "NB-TPRM-2026-0147 Lumeo response - DORA ICT third-party due diligence.pdf",
  mime: PDF,
  category: "questionnaire",
  uploadedDaysAgo: 160,
  pageCount: 9,
  summary:
    "Lumeo's March 2026 answers to a DORA-driven ICT third-party due diligence questionnaire from Noordbank NV, a fictional Belgian bank. Eleven answers cover ISO 27001 certification, SOC 2 status, EU hosting and sub-processors, encryption and key management, MFA, incident notification and DORA reporting support, backup/DR, penetration testing, exit arrangements, audit rights and subcontracting. Answered by the CISO and reviewed by the DPO.",
  text: noordbankText,
  records: QA_NOORDBANK.map(
    (q): RecordSeed => ({
      kind: "qa_pair",
      id: q.id,
      question: q.question,
      answer: q.answer,
      anchor: q.anchor,
    })
  ),
};

// ---------------------------------------------------------------------------
// 16. Assurix questionnaire response

const assurixQ = (n: string) => QA_ASSURIX.find((q) => q.anchor === n);
const assurixBlock = (n: string) => {
  const q = assurixQ(n);
  return q ? `### ${q.anchor}. ${q.question}\n\n${q.answer}` : "";
};

const assurixText = `# Information security questionnaire — response to Assurix Insurance SA

| Field | Value |
| --- | --- |
| Customer | Assurix Insurance SA, Liège — Information Security & Outsourcing Office |
| Customer reference | ASX-ISO-2025-311 |
| Service in scope | ${ORG.product} (policy and broker contract workflows, advanced e-signature) |
| Date of response | ${dateStr(292)} |
| Responder | ${ownerName("CISO")}, Chief Information Security Officer |
| Contributors | ${ownerName("Head of Platform & SRE")} (Platform & SRE), ${ownerName("Head of People")} (People) |
| Classification | Confidential — shared under NDA |

Answers below reflect the situation at the date of response. Where a question overlaps with the ISO/IEC 27001 Statement of Applicability, the relevant Annex A reference is noted.

### Q1. Please describe your organisation, ownership and the service provided.

${ORG.name} is a privately held Belgian software company founded in ${ORG.founded}, headquartered in Ghent with an office in Namur, employing around 200 people. We develop and operate ${ORG.product}, a SaaS platform for contract lifecycle management and electronic signature used by approximately ${ORG.customers} organisations in the Benelux and France.

### Q2. Which information security certifications or attestations do you hold?

${ORG.shortName} is certified against ISO/IEC 27001:2022 (certificate ${ISO_CERT.number}, ${ISO_CERT.issuer}, valid until ${ISO_CERT.validUntil}) for the development, hosting, operation and support of ${ORG.product}. A SOC 2 Type II examination is being prepared for 2026.

${assurixBlock("Q3")}

### Q4. How is our data protected at rest and in transit?

Data at rest is encrypted with AES-256 under customer-managed keys in Azure Key Vault (HSM-backed); data in transit uses TLS 1.2 or higher with TLS 1.3 preferred. Details are in our Cryptography & Key Management Standard (Annex A.8.24).

${assurixBlock("Q5")}

${assurixBlock("Q6")}

### Q7. What backup and recovery arrangements are in place?

Point-in-time restore of 35 days for the database, geo-redundant storage and a warm-standby region, with RTO 4 hours and RPO 15 minutes; restore tests monthly and a regional failover exercise annually (Annex A.8.13, A.5.30).

${assurixBlock("Q8")}

${assurixBlock("Q9")}

### Q10. Which sub-processors handle our data and where?

Microsoft Ireland Operations Ltd (Azure West Europe / North Europe), SignaTrust NV (Belgium, qualified trust services) and Datadog (EU region, telemetry only). All processing takes place within the EU/EEA.

${assurixBlock("Q11")}

${assurixBlock("Q12")}

${assurixBlock("Q13")}

### Q14. Do you have cyber insurance?

Yes — ${ORG.shortName} holds a cyber liability insurance policy with a European insurer; the certificate of insurance can be provided on request through your procurement contact.

*Submitted on behalf of ${ORG.name} — ${ownerName("CISO")}, CISO, ${dateStr(292)}*
`;

const assurix: DocumentSeed = {
  id: "doc-questionnaire-assurix",
  title: "Information security questionnaire — response to Assurix Insurance SA (November 2025)",
  filename: "ASX-ISO-2025-311 Lumeo response - information security questionnaire.pdf",
  mime: PDF,
  category: "questionnaire",
  uploadedDaysAgo: 290,
  pageCount: 7,
  summary:
    "Lumeo's November 2025 response to a general information security questionnaire from Assurix Insurance SA, a fictional Belgian insurer. Fourteen answers cover the company profile, certifications, access reviews, encryption, logging and monitoring, vulnerability SLAs, backup, awareness training, GDPR and the DPO, sub-processors, secure development, personnel screening, physical security and cyber insurance. Eight answers were extracted as reusable Q&A records.",
  text: assurixText,
  records: QA_ASSURIX.map(
    (q): RecordSeed => ({
      kind: "qa_pair",
      id: q.id,
      question: q.question,
      answer: q.answer,
      anchor: q.anchor,
    })
  ),
};

// ---------------------------------------------------------------------------

export const DOCUMENTS: DocumentSeed[] = [
  overview,
  isoCert,
  controlRegister,
  assetInventory,
  infosec,
  accessControl,
  cryptography,
  incidentResponse,
  businessContinuity,
  supplierSecurity,
  secureDevelopment,
  acceptableUse,
  hrSecurity,
  dataProtection,
  noordbank,
  assurix,
];
