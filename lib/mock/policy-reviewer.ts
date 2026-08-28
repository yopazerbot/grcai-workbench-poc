import { sourceLabel } from "@/lib/source-ref";
import type { OrgData } from "@/lib/org-context";

// Input-aware simulated generator: parses the actually-pasted policy into
// sections, maps each change-note point onto the best-matching section, and
// drafts replacement wording with verbatim current-text excerpts. Points that
// cannot be mapped confidently become "uncertain" items — never silent.

interface Section {
  heading: string;
  body: string;
}

function parseSections(text: string): Section[] {
  const lines = text.split(/\r?\n/);
  const headingRe = /^(\d+(\.\d+)*[.)]?\s+.+|#{1,3}\s+.+|[A-Z][A-Z\s&/-]{6,})$/;
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (headingRe.test(line) && line.length < 90) {
      if (current) sections.push(current);
      current = { heading: line.replace(/^#+\s+/, ""), body: "" };
    } else if (current) {
      current.body += (current.body ? " " : "") + line;
    }
  }
  if (current) sections.push(current);
  return sections.filter((s) => s.body.length > 0);
}

const sentences = (text: string): string[] =>
  text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);

function excerpt(section: Section, contentMatch: RegExp): string {
  const hits = sentences(section.body).filter((s) => contentMatch.test(s));
  if (hits.length > 0) return hits.join(" ");
  return sentences(section.body).slice(0, 2).join(" ");
}

function overlapScore(a: string, b: string): number {
  const words = (t: string) =>
    new Set(
      t
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3)
    );
  const wa = words(a);
  const wb = words(b);
  let n = 0;
  for (const w of wa) if (wb.has(w)) n++;
  return n;
}

/** "LUM-AC-02 — Multi-factor & phishing-resistant authentication (Control Register v2.3, §3.2)". */
function control(org: OrgData | undefined, id: string): string {
  const c = org?.controls?.find((x) => x.id === id);
  return c ? `${c.id} — ${c.name} (${sourceLabel(c)})` : id;
}

function policy(org: OrgData | undefined, id: string, fallback: string): string {
  const p = org?.policies?.find((x) => x.id === id);
  if (!p) return fallback;
  const label = sourceLabel(p, "");
  // The source document is usually the policy itself — don't repeat its name.
  return label.startsWith(p.name) ? label : `${p.name} v${p.version} (${label || "Knowledge base"})`;
}

interface Rule {
  changeMatch: RegExp;
  /** Anchored to the start of a heading (optionally numbered) so body text never matches. */
  sectionMatch: RegExp;
  contentMatch: RegExp;
  proposed: string;
  reason: string;
  source: (org: OrgData | undefined) => string;
  /** Raised as an uncertain addition when no section matches. */
  additionSection: string;
  additionProposed: string;
}

const heading = (alternatives: string) =>
  new RegExp(`^(\\d+(\\.\\d+)*[.)]?\\s+)?(${alternatives})\\b`, "i");

const RULES: Rule[] = [
  {
    changeMatch: /passkey|fido2|webauthn|phishing[- ]resistant/i,
    sectionMatch: heading("authentication|user authentication|passwords? and authentication|logon|login"),
    contentMatch: /authenticator|multi[- ]?factor|fido2|password/i,
    proposed:
      "Multi-factor authentication is required for all access to Lumeo systems, on-site and remote alike. Phishing-resistant passkeys (FIDO2) are the primary authentication method for all staff; Microsoft Authenticator push approval is retained as a fallback only. Members of the Production Admins group must use a hardware FIDO2 security key for access to production systems. Where passwords remain in use they must be at least 12 characters long, must not be reused across systems and are checked against known-breached password lists.",
    reason:
      "The change note records the passkey (FIDO2) rollout to all staff completed in July 2026; the policy still names Authenticator push as the primary method and limits the MFA requirement to remote access and administrators.",
    source: (org) => `Change note; ${control(org, "LUM-AC-02")}`,
    additionSection: "Proposed addition — Authentication",
    additionProposed:
      "Add an authentication clause: MFA applies to all access; phishing-resistant passkeys (FIDO2) are the primary method for all staff, with Microsoft Authenticator push approval as fallback only.",
  },
  {
    changeMatch: /officient|automat.{0,30}(offboard|leaver|revocation|contractor)|(offboard|leaver|contractor).{0,40}automat/i,
    sectionMatch: heading("access revocation|revocation|deprovisioning|offboarding|leavers?|termination of access"),
    contentMatch: /notify|contractor|last working day|disabled by/i,
    proposed:
      "Employee and contractor accounts are disabled automatically on the last working day through the Officient-driven leaver flow into Entra ID; manual notification to IT Operations is no longer required. Where a leaving date is not yet recorded in Officient, the line manager records it the same day so that the automated flow can run. Access rights that are no longer required following a change of role must be removed within ten working days of the change.",
    reason:
      "The change note records that offboarding is now automated through the Officient leaver flow (same-day disablement); the policy still requires line managers to notify IT Operations within five working days for contractors and relies on manual disablement by IT Operations for employees.",
    source: (org) => `Change note; ${control(org, "LUM-AC-01")}`,
    additionSection: "Proposed addition — Access revocation",
    additionProposed:
      "Add a revocation clause: accounts are disabled automatically on the last working day via the Officient-driven leaver flow for employees and contractors alike; manual notification to IT Operations is no longer required.",
  },
  {
    changeMatch: /\bvpn\b|globalprotect|private access|zero[- ]trust|global secure access/i,
    sectionMatch: heading("remote access|remote working|remote and hybrid working"),
    contentMatch: /vpn|globalprotect|certificate|device|remote/i,
    proposed:
      "Remote access to internal administrative services is only permitted from Lumeo-managed, Intune-enrolled devices through Microsoft Entra Private Access, which enforces device compliance and conditional access on every connection; the legacy GlobalProtect VPN has been decommissioned. Access to the Microsoft 365 environment from personal devices remains limited to Teams and Outlook mobile applications protected by Intune app protection policies. Office networks are treated as untrusted for platform administration.",
    reason:
      "The change note records that the GlobalProtect VPN was decommissioned in 2025 and that remote access to admin services now runs through Microsoft Entra Private Access with device compliance checks; the policy still mandates the VPN.",
    source: (org) =>
      `Change note; ${control(org, "LUM-AC-01")}; asset inventory (Microsoft Entra Private Access)`,
    additionSection: "Proposed addition — Remote access",
    additionProposed:
      "Add a remote access clause: managed, Intune-enrolled devices only, through Microsoft Entra Private Access with device compliance checks; no legacy VPN.",
  },
  {
    changeMatch: /nis\s*2|\bccb\b|incident response plan|emergency access|major[- ]incident|incident report/i,
    sectionMatch: heading("incident-related access|incident|emergency access|break[- ]?glass"),
    contentMatch: /incident|emergency|break[- ]?glass/i,
    proposed:
      "Access decisions taken during security incidents — emergency revocations, break-glass activations and temporary privilege grants — follow the Incident Response Plan and are approved by the incident manager. Every incident-related access change is logged with the incident reference and retained so that it can support NIS2 incident reporting to the Centre for Cybersecurity Belgium (CCB).",
    reason:
      "NIS2 applies to Lumeo as a CCB-registered important entity; incident-driven access decisions must be traceable to the Incident Response Plan and its CCB reporting duties, which the policy does not address.",
    source: (org) =>
      `Change note; ${policy(org, "incident-response", "Incident Response Plan v2.1")}; ${control(org, "LUM-IR-01")}`,
    additionSection: "Proposed addition — Incident-related access decisions",
    additionProposed:
      "Add a clause on incident-related access decisions: emergency revocations, break-glass activations and temporary privilege grants during security incidents follow the Incident Response Plan, are approved by the incident manager, and are logged with the incident reference to support NIS2 reporting to the CCB.",
  },
  {
    changeMatch: /encrypt|\btls\b|cryptograph|key management/i,
    sectionMatch: heading("encryption|cryptography|data protection|transmission"),
    contentMatch: /encrypt|tls|cryptograph|key/i,
    proposed:
      "Data in transit is protected with TLS 1.2 or higher (TLS 1.3 preferred); data at rest is encrypted with AES-256 under customer-managed keys in Azure Key Vault with annual rotation, per the Cryptography & Key Management Standard.",
    reason:
      "Aligns the policy's cryptography wording with the current Cryptography & Key Management Standard and the operated encryption controls.",
    source: (org) =>
      `${policy(org, "cryptography", "Cryptography & Key Management Standard v1.4")}; ${control(org, "LUM-CR-01")}; ${control(org, "LUM-CR-02")}`,
    additionSection: "Proposed addition — Cryptography",
    additionProposed:
      "Add a cryptography clause referencing the Cryptography & Key Management Standard: TLS 1.2+ in transit, AES-256 at rest with customer-managed keys and annual rotation.",
  },
];

export function mockPolicyReviewer(input: Record<string, string>, org: OrgData): unknown {
  const sections = parseSections(input.policy ?? "");
  const changePoints = (input.changes ?? "")
    .split(/\r?\n|(?<=[.;])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8)
    .slice(0, 12);

  const items: unknown[] = [];
  const usedRules = new Set<Rule>();

  for (const point of changePoints) {
    const rule = RULES.find((r) => !usedRules.has(r) && r.changeMatch.test(point));

    if (rule) {
      usedRules.add(rule);
      const target = sections.find((s) => rule.sectionMatch.test(s.heading));
      if (target) {
        items.push({
          section: target.heading,
          current_text: excerpt(target, rule.contentMatch),
          proposed_text: rule.proposed,
          reason: rule.reason,
          confidence: "confident",
          source_note: rule.source(org),
        });
      } else {
        items.push({
          section: rule.additionSection,
          current_text: "(not currently covered)",
          proposed_text: rule.additionProposed,
          reason: `${rule.reason} No existing section covers this — placement needs analyst confirmation.`,
          confidence: "uncertain",
          source_note: rule.source(org),
        });
      }
      continue;
    }

    // Generic fallback: map the change point onto the best-overlapping section.
    const scored = sections
      .map((s) => ({ s, score: overlapScore(point, `${s.heading} ${s.body}`) }))
      .sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (best && best.score >= 2) {
      items.push({
        section: best.s.heading,
        current_text: sentences(best.s.body).slice(0, 2).join(" "),
        proposed_text: `Update this section to reflect: ${point}`,
        reason:
          "Mapped to this section by wording overlap with the change note; the exact rewording needs analyst judgement.",
        confidence: "uncertain",
        source_note: "Change note (unmapped point)",
      });
    } else {
      items.push({
        section: "Unmapped change",
        current_text: "(no matching section found)",
        proposed_text: `Consider adding a clause covering: ${point}`,
        reason:
          "This change-note point could not be mapped to any section of the pasted policy.",
        confidence: "uncertain",
        source_note: "Change note (unmapped point)",
      });
    }
  }

  // A policy with no recognisable change points still yields a review outcome.
  if (items.length === 0) {
    items.push({
      section: sections[0]?.heading ?? "Full policy text",
      current_text: sections[0] ? sentences(sections[0].body).slice(0, 2).join(" ") : "(empty)",
      proposed_text:
        "No change proposed. The change note contained no identifiable change points for this policy.",
      reason: "Nothing in the change note maps to this policy's scope.",
      confidence: "uncertain",
      source_note: "Change note",
    });
  }

  return { items };
}
