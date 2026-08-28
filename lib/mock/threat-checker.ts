import type { OrgData } from "@/lib/org-context";

// Input-aware simulated generator: keyword-matches the pasted advisory
// against the seeded technology stack. Stack hit → exposed; only known
// not-in-use products → not exposed; nothing recognisable → undetermined.

interface StackEntry {
  pattern: RegExp;
  asset: string;
  extraControls?: string[];
}

const STACK: StackEntry[] = [
  { pattern: /postgres(ql)?|azure database for postgresql|flexible server/i, asset: "Azure Database for PostgreSQL Flexible Server (PostgreSQL 16, West Europe)" },
  { pattern: /\.net\s*[0-9]|\bdotnet\b|asp\.net|\bc#|\bnuget\b|entity framework/i, asset: ".NET 8 / C# backend services (≈40 microservices on AKS)" },
  { pattern: /\breact\b|\bnode\.?js\b|\bnpm\b|typescript|\bvite\b|webpack/i, asset: "React 18 / TypeScript frontend (Node.js 20, build-time only)" },
  { pattern: /kubernetes|\baks\b|k8s|containerd/i, asset: "Azure Kubernetes Service (Kubernetes 1.31, prod/staging in West Europe, DR in North Europe)" },
  { pattern: /redis|azure cache/i, asset: "Azure Cache for Redis (session and queue cache)" },
  { pattern: /blob storage|azure storage|\bblob\b/i, asset: "Azure Blob Storage (contract documents, immutable signed-contract container)" },
  { pattern: /key vault|keyvault|managed hsm/i, asset: "Azure Key Vault Premium (HSM-backed customer-managed keys)", extraControls: ["LUM-CR-02"] },
  { pattern: /front door|\bwaf\b|application gateway/i, asset: "Azure Front Door Premium + WAF (platform entry point)", extraControls: ["LUM-CR-01"] },
  { pattern: /entra(?!\s*private access)|azure\s*ad\b|azure active directory|conditional access/i, asset: "Microsoft Entra ID P2 (identity provider)", extraControls: ["LUM-AC-01", "LUM-AC-02", "LUM-AC-03"] },
  { pattern: /private access|global secure access/i, asset: "Microsoft Entra Private Access (zero-trust remote access)", extraControls: ["LUM-AC-01"] },
  { pattern: /intune/i, asset: "Microsoft Intune (endpoint management)" },
  { pattern: /defender for endpoint|defender for cloud|microsoft defender|\bmde\b/i, asset: "Microsoft Defender for Endpoint / Defender for Cloud" },
  { pattern: /sentinel/i, asset: "Microsoft Sentinel (SIEM)", extraControls: ["LUM-LM-01"] },
  { pattern: /exchange online|sharepoint online|microsoft 365|m365|office 365|\bteams\b|outlook|onedrive/i, asset: "Microsoft 365 E5 (Exchange Online, SharePoint Online, OneDrive, Teams)" },
  { pattern: /\bazure\b(?!\s*(ad\b|active directory|database|blob|storage|cache|key vault|kubernetes|front door|backup|monitor))/i, asset: "Microsoft Azure (West Europe / North Europe)" },
  { pattern: /github/i, asset: "GitHub Enterprise Cloud (source control, Actions CI/CD)", extraControls: ["LUM-SD-01"] },
  { pattern: /terraform|hashicorp/i, asset: "Terraform (infrastructure as code for all Azure resources)", extraControls: ["LUM-VM-02"] },
  { pattern: /azure backup|recovery services vault/i, asset: "Azure Backup (PostgreSQL PITR, Blob, AKS backups)", extraControls: ["LUM-BC-01"] },
  { pattern: /veeam/i, asset: "Veeam Backup for Microsoft 365", extraControls: ["LUM-BC-01"] },
  { pattern: /meraki/i, asset: "Cisco Meraki MX security appliances (Ghent and Namur offices)" },
  { pattern: /windows\s*1[01]\b|windows (client|desktop)|\bwindows\b(?!\s*server)/i, asset: "Windows 11 endpoints (Intune-managed, BitLocker)" },
  { pattern: /macos|\bmac\s*os\b|\bapple\b/i, asset: "macOS endpoints (Intune-managed, FileVault)" },
  { pattern: /datadog/i, asset: "Datadog (APM and infrastructure monitoring)" },
  { pattern: /officient/i, asset: "Officient (HR system of record, drives JML into Entra ID)", extraControls: ["LUM-AC-01"] },
  { pattern: /hubspot/i, asset: "HubSpot (CRM and marketing automation)" },
  { pattern: /exact online/i, asset: "Exact Online (finance and invoicing)" },
  { pattern: /(jira|confluence|atlassian)\s*cloud/i, asset: "Atlassian Jira & Confluence Cloud (backlog, change tickets, documentation)" },
  { pattern: /signatrust/i, asset: "SignaTrust NV integration (qualified trust services, eIDAS)", extraControls: ["LUM-TP-01"] },
];

const NOT_IN_STACK: Array<{ pattern: RegExp; product: string }> = [
  { pattern: /\baws\b|amazon web services|\bec2\b|\bs3\b|\beks\b|\brds\b/i, product: "Amazon Web Services" },
  { pattern: /google cloud|\bgcp\b|\bgke\b/i, product: "Google Cloud Platform" },
  { pattern: /gitlab/i, product: "GitLab" },
  { pattern: /vmware|esxi|vcenter|vsphere/i, product: "VMware ESXi / vCenter" },
  { pattern: /citrix|netscaler/i, product: "Citrix NetScaler" },
  { pattern: /fortinet|fortigate|fortios|fortimanager/i, product: "Fortinet appliances" },
  { pattern: /palo\s*alto|pan-os|globalprotect/i, product: "Palo Alto Networks appliances" },
  { pattern: /ivanti|pulse secure|connect secure/i, product: "Ivanti products" },
  { pattern: /moveit/i, product: "MOVEit Transfer" },
  { pattern: /oracle\s*(database|db)\b/i, product: "Oracle Database" },
  { pattern: /exchange\s*server|on[- ]prem(ise)?s?\s*exchange/i, product: "on-premises Exchange" },
  { pattern: /cisco\s*asa|adaptive security appliance|firepower/i, product: "Cisco ASA" },
  { pattern: /crowdstrike|falcon sensor/i, product: "CrowdStrike" },
  { pattern: /\bjava\b|spring\s*(boot|framework)|log4j|log4shell|\bjvm\b|tomcat/i, product: "Java / Spring in production" },
  { pattern: /(jira|confluence|atlassian)\s*(server|data\s*cent(er|re))/i, product: "self-hosted Atlassian (Jira/Confluence Server or Data Center)" },
];

const SOURCE_NOTE =
  "Asset & Technology Inventory — CMDB export August 2026; Information Security Control Register v2.3";

export function mockThreatChecker(input: Record<string, string>, _org: OrgData): unknown {
  const advisory = input.advisory ?? "";
  const cve = advisory.match(/CVE-\d{4}-\d{4,7}/i)?.[0]?.toUpperCase() ?? null;
  const ref = cve ?? "the advisory";

  const matched = STACK.filter((e) => e.pattern.test(advisory));
  const absent = NOT_IN_STACK.filter((e) => e.pattern.test(advisory));

  const absentNote =
    absent.length > 0
      ? ` The advisory also concerns ${absent
          .map((a) => a.product)
          .join(" and ")}, which the asset inventory lists as not in use at Lumeo.`
      : "";

  if (matched.length > 0) {
    const assets = [...new Set(matched.map((m) => m.asset))];
    const extraControls = [...new Set(matched.flatMap((m) => m.extraControls ?? []))];
    return {
      assessment: {
        exposure: "exposed",
        reasoning:
          `The organisation is exposed: ${ref} affects ${assets.length === 1 ? "a component" : "components"} in the operated stack — ${assets.join("; ")}. ` +
          `Affected versions must be confirmed against the deployed versions before remediation is closed.${absentNote}`,
        affected_assets: assets,
        affected_controls: [...new Set(["LUM-VM-01", "LUM-VM-02", ...extraControls])],
        source_note: SOURCE_NOTE,
      },
      actions: [
        {
          title: "Confirm affected versions and apply the fix",
          description: `Verify the deployed versions of ${assets.join(", ")} against the affected range in ${ref} and apply the vendor fix via the emergency change path (actively exploited vulnerabilities qualify for same-day mitigation under the 48-hour critical SLA).`,
          priority: "p1",
          related_controls: ["LUM-VM-01", "LUM-VM-02", "LUM-SD-02"],
        },
        {
          title: "Apply interim mitigations and hunt for exploitation",
          description:
            "Apply any vendor interim mitigations, and search Sentinel for indicators of exploitation across the affected components since the advisory's exploitation-observed date. Escalate hits via the Incident Response Plan (S1/S2) and assess NIS2 reporting to the CCB.",
          priority: "p2",
          related_controls: ["LUM-LM-01", "LUM-LM-02", "LUM-IR-01"],
        },
        {
          title: "Record the assessment and track to closure",
          description:
            "Record this exposure assessment and remediation in the risk register, and track patch completion to closure in the next vulnerability management review; inform financial customers if their contractual notification thresholds are met.",
          priority: "p3",
          related_controls: ["LUM-VM-01", "LUM-GOV-02"],
        },
      ],
    };
  }

  if (absent.length > 0) {
    return {
      assessment: {
        exposure: "not_exposed",
        reasoning:
          `The organisation is not exposed: ${ref} affects ${absent
            .map((a) => a.product)
            .join(" and ")}, and the asset inventory explicitly lists ${
            absent.length === 1 ? "this product" : "these products"
          } as not in use at Lumeo. No component of the operated stack matches the advisory's affected products.`,
        affected_assets: [],
        affected_controls: ["LUM-VM-01"],
        source_note: SOURCE_NOTE,
      },
      actions: [],
    };
  }

  return {
    assessment: {
      exposure: "undetermined",
      reasoning:
        `Exposure cannot be determined from available data: the advisory does not name products or versions that can be matched against the asset inventory. ` +
        `The inventory covers the major platforms (Microsoft Azure, AKS, PostgreSQL, Microsoft 365, Entra ID, GitHub, .NET and React/TypeScript services, Defender, Intune and the office network), but ${ref} references none of them explicitly.`,
      affected_assets: [],
      affected_controls: ["LUM-VM-01"],
      source_note: SOURCE_NOTE,
    },
    actions: [
      {
        title: "Identify affected products and re-run the check",
        description:
          "Extract the affected products and version ranges from the vendor advisory (or ask the sender), then re-check them against the asset inventory and Azure Resource Graph.",
        priority: "p2",
        related_controls: ["LUM-VM-01", "LUM-AM-01"],
      },
    ],
  };
}
