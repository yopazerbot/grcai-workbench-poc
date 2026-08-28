// Connected-system evidence snapshots (simulated integrations). These are NOT
// document-derived: they represent what read-only connectors to Lumeo's
// systems would report today. Timestamps are day-offsets materialised at seed
// time so evidence freshness stays realistic relative to "now".

export interface SnapshotEntrySeed {
  controls: string[];
  description: string;
  whatCounts: string;
  collectedDaysAgo: number;
  gap?: string;
}

export interface SystemSnapshotSeed {
  key: string;
  system: string;
  summary: string;
  entries: SnapshotEntrySeed[];
}

export const SYSTEM_SNAPSHOTS: SystemSnapshotSeed[] = [
  {
    key: "entra",
    system: "Microsoft Entra ID",
    summary: "Identity provider: conditional access, PIM, access reviews, sign-in logs.",
    entries: [
      {
        controls: ["LUM-AC-02"],
        description:
          "Conditional access report: MFA required for all users (212 enabled, 0 excluded except 2 break-glass accounts); legacy authentication blocked; 38 FIDO2 keys registered for the 'Production Admins' and 'Platform Engineers' groups; 61 passkeys registered by staff (rollout in progress).",
        whatCounts:
          "Tenant-wide MFA enforcement, blocked legacy auth and phishing-resistant methods for privileged users evidence the authentication control as designed.",
        collectedDaysAgo: 2,
      },
      {
        controls: ["LUM-AC-01"],
        description:
          "Q3 2026 access review campaign: 14 of 16 application access reviews completed and signed off by owners; 2 reviews (HubSpot, Datadog) pending past the due date.",
        whatCounts: "Completed, owner-signed quarterly access reviews evidence periodic recertification.",
        collectedDaysAgo: 38,
        gap: "2 application access reviews pending sign-off past the due date.",
      },
      {
        controls: ["LUM-AC-03"],
        description:
          "PIM report: 11 eligible privileged role assignments, 0 permanent; 47 JIT activations in the last 30 days, all with approval and justification; break-glass accounts unused in the period.",
        whatCounts: "Eligible-only privileged roles with logged JIT activations evidence privileged access management.",
        collectedDaysAgo: 2,
      },
    ],
  },
  {
    key: "azure",
    system: "Microsoft Azure",
    summary: "Platform hosting: Key Vault, PostgreSQL, Blob Storage, AKS, Defender for Cloud, Azure Policy.",
    entries: [
      {
        controls: ["LUM-CR-02"],
        description:
          "Azure Policy compliance: 100% of PostgreSQL servers and storage accounts use customer-managed keys from Key Vault 'kv-lumeo-prod'; last key rotation 2026-03-11; 2 development storage accounts use platform-managed keys (exception EXC-2026-07 approved).",
        whatCounts: "CMK enforcement reports and key rotation timestamps evidence encryption-at-rest and key management.",
        collectedDaysAgo: 4,
      },
      {
        controls: ["LUM-CR-01"],
        description:
          "Front Door and Application Gateway TLS policy export: minimum TLS 1.2 on all endpoints, TLS 1.3 enabled, HSTS max-age 1 year; 1 legacy customer webhook endpoint still accepts TLS 1.1 (change CHG-2311 scheduled).",
        whatCounts: "Endpoint TLS policy configuration evidences encryption in transit.",
        collectedDaysAgo: 9,
        gap: "1 legacy webhook endpoint still accepts TLS 1.1 (change CHG-2311 scheduled).",
      },
      {
        controls: ["LUM-VM-02"],
        description:
          "Terraform drift report and AKS maintenance: 0 unmanaged resource changes in production in the last 7 days; AKS node image auto-upgrade channel 'patch' with last upgrade 2026-08-19; PostgreSQL minor version 16.4 current.",
        whatCounts: "IaC drift reports and managed maintenance history evidence configuration and patch management of the platform.",
        collectedDaysAgo: 3,
      },
      {
        controls: ["LUM-VM-01"],
        description:
          "Defender for Cloud secure score 91%; Defender Vulnerability Management: 0 critical, 3 high open (2 within SLA, 1 at day 9 on staging node pool), 27 medium open.",
        whatCounts: "Vulnerability scanner findings with age against SLA evidence the vulnerability management process.",
        collectedDaysAgo: 3,
        gap: "1 high finding (staging node pool) at day 9, exceeding the 7-day SLA.",
      },
    ],
  },
  {
    key: "github",
    system: "GitHub Enterprise Cloud",
    summary: "Source control and CI/CD: branch protection, code scanning, Dependabot, secret scanning.",
    entries: [
      {
        controls: ["LUM-SD-01"],
        description:
          "Branch protection export: 100% of the 43 production repositories require pull-request review (≥1 reviewer, CODEOWNERS) and passing status checks (build, CodeQL, dependency review); direct pushes to main blocked; 312 merged PRs in the last 30 days, all with review.",
        whatCounts: "Branch protection settings and PR review records evidence the peer-review and CI gates of the secure development lifecycle.",
        collectedDaysAgo: 1,
      },
      {
        controls: ["LUM-VM-01"],
        description:
          "Dependabot and CodeQL: 0 critical, 2 high dependency alerts open (both under 48 hours), 11 medium; 0 open secret-scanning alerts.",
        whatCounts: "Open alert counts with age evidence dependency and code vulnerability handling.",
        collectedDaysAgo: 1,
      },
    ],
  },
  {
    key: "intune",
    system: "Microsoft Intune",
    summary: "Endpoint management: compliance, encryption, update rings.",
    entries: [
      {
        controls: ["LUM-VM-02"],
        description:
          "Device compliance report: 213 managed devices; 201 compliant; 12 non-compliant (9 missing the August cumulative update beyond 14 days, 3 not checked in for 30+ days).",
        whatCounts: "Endpoint compliance and update ring status evidence endpoint patch management.",
        collectedDaysAgo: 3,
        gap: "9 devices more than 14 days behind on patches and 3 devices not checked in for 30+ days, without documented exception.",
      },
      {
        controls: ["LUM-CR-02"],
        description: "Encryption report: BitLocker / FileVault enabled on 213 of 213 managed devices; recovery keys escrowed in Entra ID.",
        whatCounts: "Full-disk encryption status evidences endpoint encryption at rest.",
        collectedDaysAgo: 3,
      },
    ],
  },
  {
    key: "sentinel",
    system: "Microsoft Sentinel",
    summary: "SIEM: log source health, analytics rules, incident handling.",
    entries: [
      {
        controls: ["LUM-LM-01"],
        description:
          "Data connector health: 14 of 15 log sources healthy; Officient audit-log feed degraded for 11 days (ticket SEC-1042 open with vendor). Retention: 365 days hot, 730 days archive confirmed.",
        whatCounts: "Connector health and retention settings evidence centralised log collection.",
        collectedDaysAgo: 1,
        gap: "Officient audit-log feed degraded since 11 days (SEC-1042).",
      },
      {
        controls: ["LUM-LM-02"],
        description:
          "Analytics: 86 active rules mapped to MITRE ATT&CK; 23 incidents in the last 30 days, all triaged within SLA (median 22 minutes); weekly review sign-offs present for the last 8 weeks.",
        whatCounts: "Active detection rules, incident triage timings and weekly sign-offs evidence security monitoring.",
        collectedDaysAgo: 6,
      },
    ],
  },
  {
    key: "azure-backup",
    system: "Azure Backup",
    summary: "Backup vault: PostgreSQL, Blob and AKS backup jobs; restore tests.",
    entries: [
      {
        controls: ["LUM-BC-01"],
        description:
          "Backup job report: 100% success over the last 30 days for PostgreSQL PITR, Blob geo-replication and AKS configuration backups; monthly restore test executed 2026-08-05 (PostgreSQL restore to isolated environment, 41 minutes).",
        whatCounts: "Backup job success rates and documented restore tests evidence the backup control.",
        collectedDaysAgo: 1,
      },
      {
        controls: ["LUM-BC-02"],
        description:
          "Annual regional failover exercise report (2026-01-14): core platform failover to North Europe completed in 3h 05m (RTO 4h) with data loss under 5 minutes (RPO 15 min); e-signature service descoped due to the SignaTrust integration and tested separately in a limited way.",
        whatCounts: "The failover exercise report evidences DR capability — but only for the services in scope of the exercise.",
        collectedDaysAgo: 226,
      },
    ],
  },
  {
    key: "officient",
    system: "Officient (HR)",
    summary: "HR system: screening and training completion registers.",
    entries: [
      {
        controls: ["LUM-HR-01"],
        description:
          "Screening register: 17 joiners in the last 6 months, 17 with completed identity verification and references; 5 of 5 production-access roles with criminal record extract on file before account creation.",
        whatCounts: "Screening completion records per joiner evidence pre-employment screening.",
        collectedDaysAgo: 21,
      },
      {
        controls: ["LUM-HR-02"],
        description:
          "Training register: 2026 annual awareness campaign completion 88% (176 of 200 staff; target 95%); Q2 phishing simulation click rate 6.5%; secure coding training completion for engineers 92%.",
        whatCounts: "Training completion percentages against target evidence the awareness programme.",
        collectedDaysAgo: 105,
        gap: "Annual awareness completion at 88% against the 95% target; 24 staff outstanding.",
      },
    ],
  },
];
