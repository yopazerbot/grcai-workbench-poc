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
  { pattern: /postgres(ql)?|rds\b/i, asset: "RDS PostgreSQL 15 (AWS eu-west-1, client platform)" },
  { pattern: /spring\s*(boot|framework)?|java\b/i, asset: "Java 21 / Spring Boot 3.3 backend services" },
  { pattern: /next\.?js|node\.?js|\bnode\b/i, asset: "TypeScript / Next.js frontends on Node.js 20" },
  { pattern: /kubernetes|\beks\b|k8s/i, asset: "EKS (Kubernetes 1.31) cluster (AWS eu-west-1)" },
  { pattern: /redis|elasticache/i, asset: "ElastiCache Redis (AWS eu-west-1)" },
  { pattern: /\bs3\b/i, asset: "AWS S3 (client platform storage)" },
  { pattern: /entra|azure\s*ad\b/i, asset: "Microsoft Entra ID (identity provider)", extraControls: ["AFG-AC-01", "AFG-AC-02"] },
  { pattern: /intune/i, asset: "Microsoft Intune (endpoint management)" },
  { pattern: /sentinel/i, asset: "Microsoft Sentinel (SIEM)", extraControls: ["AFG-LM-01"] },
  { pattern: /exchange online|sharepoint|microsoft 365|m365|\bteams\b|outlook/i, asset: "Microsoft 365 (Exchange Online, SharePoint, Teams)" },
  { pattern: /azure(?!\s*ad)/i, asset: "Microsoft Azure (West Europe, corporate IT)" },
  { pattern: /github/i, asset: "GitHub Enterprise Cloud (source code management)", extraControls: ["AFG-SD-01"] },
  { pattern: /veeam/i, asset: "Veeam Backup & Replication 12", extraControls: ["AFG-BC-01"] },
  { pattern: /palo\s*alto|pan-os|globalprotect/i, asset: "Palo Alto NGFW PA-3220 (PAN-OS 11.1) / GlobalProtect VPN" },
  { pattern: /crowdstrike|falcon/i, asset: "CrowdStrike Falcon EDR (endpoints)" },
  { pattern: /windows\s*11|windows\b/i, asset: "Windows 11 endpoints" },
  { pattern: /macos|\bmac\b/i, asset: "macOS endpoints" },
  { pattern: /personio/i, asset: "Personio (HR SaaS)" },
  { pattern: /salesforce/i, asset: "Salesforce (CRM SaaS)" },
];

const NOT_IN_STACK: Array<{ pattern: RegExp; product: string }> = [
  { pattern: /gitlab/i, product: "GitLab" },
  { pattern: /vmware|esxi|vcenter/i, product: "VMware ESXi/vCenter" },
  { pattern: /citrix|netscaler/i, product: "Citrix NetScaler" },
  { pattern: /fortinet|fortigate|fortios/i, product: "Fortinet appliances" },
  { pattern: /ivanti/i, product: "Ivanti products" },
  { pattern: /moveit/i, product: "MOVEit Transfer" },
  { pattern: /oracle\s*(database|db)/i, product: "Oracle Database" },
  { pattern: /exchange\s*server|on[- ]prem(ise)?s?\s*exchange/i, product: "on-premises Exchange" },
];

const SOURCE_NOTE = "Asset & technology stack summary; internal control register";

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
          .join(" and ")}, which the asset register lists as not in use at AFG.`
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
        affected_controls: [...new Set(["AFG-VM-01", "AFG-VM-02", ...extraControls])],
        source_note: SOURCE_NOTE,
      },
      actions: [
        {
          title: "Confirm affected versions and apply the fix",
          description: `Verify the deployed versions of ${assets.join(", ")} against the affected range in ${ref} and apply the vendor fix via the emergency patching path (actively exploited vulnerabilities qualify for same-day mitigation under the vulnerability SLAs).`,
          priority: "p1",
          related_controls: ["AFG-VM-01", "AFG-VM-02"],
        },
        {
          title: "Apply interim mitigations and hunt for exploitation",
          description:
            "Apply any vendor interim mitigations, and search Sentinel for indicators of exploitation across the affected components since the advisory's exploitation-observed date. Escalate hits via the incident response plan.",
          priority: "p2",
          related_controls: ["AFG-LM-01", "AFG-LM-02", "AFG-IR-01"],
        },
        {
          title: "Record the assessment and track to closure",
          description:
            "Record this exposure assessment and remediation in the risk register, and track patch completion to closure in the next vulnerability management review.",
          priority: "p3",
          related_controls: ["AFG-VM-01"],
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
            .join(" and ")}, and the asset register explicitly lists ${
            absent.length === 1 ? "this product" : "these products"
          } as not in use at AFG. No component of the operated stack matches the advisory's affected products.`,
        affected_assets: [],
        affected_controls: ["AFG-VM-01"],
        source_note: SOURCE_NOTE,
      },
      actions: [],
    };
  }

  return {
    assessment: {
      exposure: "undetermined",
      reasoning:
        `Exposure cannot be determined from available data: the advisory does not name products or versions that can be matched against the asset register. ` +
        `The register covers the major platforms (Azure, AWS, M365, Entra ID, GitHub, PostgreSQL, Java/TypeScript services and network/endpoint tooling), but ${ref} references none of them explicitly.`,
      affected_assets: [],
      affected_controls: ["AFG-VM-01"],
      source_note: SOURCE_NOTE,
    },
    actions: [
      {
        title: "Identify affected products and re-run the check",
        description:
          "Extract the affected products and version ranges from the vendor advisory (or ask the sender), then re-check them against the asset register and CMDB export.",
        priority: "p2",
        related_controls: ["AFG-VM-01"],
      },
    ],
  };
}
