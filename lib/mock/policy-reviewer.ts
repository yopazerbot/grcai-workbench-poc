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

interface Rule {
  changeMatch: RegExp;
  sectionMatch: RegExp;
  contentMatch: RegExp;
  proposed: string;
  reason: string;
  source: string;
  /** Raised as an uncertain addition when no section matches. */
  additionSection: string;
  additionProposed: string;
}

const RULES: Rule[] = [
  {
    changeMatch: /passkey|fido2|webauthn|phishing[- ]resistant/i,
    sectionMatch: /authenticat|password|mfa|login/i,
    contentMatch: /authenticator|multi[- ]?factor|password|authenticat/i,
    proposed:
      "Multi-factor authentication is required for all access to AFG systems, not only remote access. Phishing-resistant passkeys (FIDO2) are the primary authentication method for all staff; Microsoft Authenticator push approval is retained as a fallback only. Where passwords remain in use they must be at least 12 characters.",
    reason:
      "The change note records the passkey (FIDO2) rollout completed in July; the policy still names Authenticator push as the primary method and limits MFA to remote access.",
    source: "Change note; Control AFG-AC-02 — Multi-factor authentication",
    additionSection: "Proposed addition — Authentication",
    additionProposed:
      "Add an authentication clause: phishing-resistant passkeys (FIDO2) are the primary authentication method for all staff, with Microsoft Authenticator push approval as fallback only.",
  },
  {
    changeMatch: /personio|automat.{0,30}(offboard|leaver|revocation|contractor)|(offboard|leaver|contractor).{0,40}automat/i,
    sectionMatch: /revocation|offboard|leaver|termination|deprovision/i,
    contentMatch: /notify|working days|manual|leaves?\b/i,
    proposed:
      "Contractor and employee access is revoked automatically on the last working day via the Personio-driven leaver flow. Manual notification to IT is no longer required; exceptions are escalated to IT Operations on the same day.",
    reason:
      "The change note records that contractor offboarding is now automated through Personio; the policy still requires manual notification within five working days.",
    source: "Change note; Control AFG-AC-01 — Access control & RBAC (automated JML)",
    additionSection: "Proposed addition — Access revocation",
    additionProposed:
      "Add a revocation clause: access is removed automatically via the Personio-driven leaver flow on the last working day for employees and contractors alike.",
  },
  {
    changeMatch: /dora|major[- ]incident|incident report/i,
    sectionMatch: /incident|emergency|break[- ]?glass/i,
    contentMatch: /incident|emergency/i,
    proposed:
      "Access decisions taken during security incidents (emergency revocations, break-glass grants) follow the Incident Response Plan. Incident-related access changes are logged and retained to support DORA major-incident reporting.",
    reason:
      "DORA is in force; incident-driven access decisions must be traceable to the Incident Response Plan and its reporting duties.",
    source: "Change note; Incident Response Plan v3.0; DORA Art. 17/19",
    additionSection: "Proposed addition — Incident-related access decisions",
    additionProposed:
      "Add a clause: access changes made during security incidents (emergency revocation, break-glass access) follow the Incident Response Plan, and are logged to support DORA major-incident reporting.",
  },
  {
    changeMatch: /encrypt|tls|cryptograph/i,
    sectionMatch: /encrypt|cryptograph|data protection|transmission/i,
    contentMatch: /encrypt|tls|cryptograph/i,
    proposed:
      "Data in transit is protected with TLS 1.2 or higher (TLS 1.3 where supported); data at rest is encrypted with AES-256 under centrally managed keys with annual rotation, per the Cryptography & Key Management Policy.",
    reason:
      "Aligns the policy's cryptography wording with the current Cryptography & Key Management Policy and operated controls.",
    source: "Cryptography & Key Management Policy v2.4; Controls AFG-CR-01/AFG-CR-02",
    additionSection: "Proposed addition — Cryptography",
    additionProposed:
      "Add a cryptography clause referencing the Cryptography & Key Management Policy: TLS 1.2+ in transit, AES-256 at rest with managed key rotation.",
  },
  {
    changeMatch: /remote|hybrid|home[- ]?work/i,
    sectionMatch: /remote|scope|equipment|mobile/i,
    contentMatch: /remote|equipment|device/i,
    proposed:
      "Remote and hybrid work is permitted from AFG-managed, Intune-enrolled devices only. Remote access requires GlobalProtect VPN with certificate-based device authentication and is subject to the same authentication requirements as on-site access.",
    reason:
      "The change note indicates updated remote/hybrid working arrangements; the policy should bind remote access to managed devices and VPN.",
    source: "Change note; Acceptable Use Policy v5.0; asset register (Intune, GlobalProtect)",
    additionSection: "Proposed addition — Remote access",
    additionProposed:
      "Add a remote access clause: managed, Intune-enrolled devices only, via GlobalProtect VPN with certificate-based device authentication.",
  },
];

export function mockPolicyReviewer(input: Record<string, string>, _org: OrgData): unknown {
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
      const target = sections.find(
        (s) => rule.sectionMatch.test(s.heading) || rule.sectionMatch.test(s.body)
      );
      if (target) {
        items.push({
          section: target.heading,
          current_text: excerpt(target, rule.contentMatch),
          proposed_text: rule.proposed,
          reason: rule.reason,
          confidence: "confident",
          source_note: rule.source,
        });
      } else {
        items.push({
          section: rule.additionSection,
          current_text: "(not currently covered)",
          proposed_text: rule.additionProposed,
          reason: `${rule.reason} No existing section covers this — placement needs analyst confirmation.`,
          confidence: "uncertain",
          source_note: rule.source,
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
