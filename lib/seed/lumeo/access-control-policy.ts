// Sample input for the Policy Reviewer: Lumeo's Access Control Policy as it
// was approved in November 2025 — deliberately a little behind the control
// register (Authenticator push as primary MFA, manual contractor offboarding,
// the since-decommissioned GlobalProtect VPN, no NIS2/incident wording), so
// the change note below produces a meaningful review delta.

export const ACCESS_CONTROL_POLICY_TEXT = `Access Control Policy (v2.2)

Owner: Chief Information Security Officer · Approved: 5 November 2025 · Classification: Internal

1. Purpose and scope
This policy defines how access to Lumeo Software NV information systems, including the Lumeo Contract Cloud platform, the Microsoft Azure and Microsoft 365 environments and corporate SaaS applications, is granted, reviewed and revoked. It applies to all employees, contractors, interns and service accounts at the Ghent and Namur offices and to anyone working remotely on Lumeo's behalf. It supports the Information Security Policy and the ISO/IEC 27001 Statement of Applicability.

2. Roles and responsibilities
The CISO owns this policy and approves exceptions. The Head of Platform & SRE owns the technical implementation in Microsoft Entra ID and Azure. Line managers are accountable for requesting, reviewing and confirming the access of the people they manage. Application and service owners recertify access to the systems they own. The Head of People ensures that joiner, mover and leaver events are recorded in Officient in a timely manner.

3. Authentication
Every user authenticates with a unique personal account in Microsoft Entra ID; shared accounts are prohibited. Multi-factor authentication using Microsoft Authenticator push approval is required for remote access and for all administrator accounts. Members of the Production Admins group must additionally register a FIDO2 security key for access to production systems. Passwords must be at least 12 characters long, must not be reused across systems and are checked against known-breached password lists. Legacy authentication protocols that cannot support MFA are blocked.

4. Access provisioning
Access is granted on the principle of least privilege through role profiles in Entra ID that are assigned automatically from the job role recorded in Officient. Access outside the standard role profile requires a request in the IT service portal and approval by the line manager and the owner of the application concerned. Access to customer data in the production environment is limited to Platform & SRE and Customer Success roles with a documented business need. Service accounts are owned by a named person, documented in the application register and reviewed with the same cadence as user accounts.

5. Privileged access
Privileged roles in Entra ID and Azure are assigned as eligible only and activated just-in-time through Privileged Identity Management, with approval, a documented justification and a maximum activation window of four hours. Permanent privileged assignments are not permitted. Two break-glass accounts are held offline by the CISO and the Head of Platform & SRE, excluded from conditional access, and any use is investigated.

6. Access revocation
Line managers must notify IT Operations within five working days when a contractor's engagement ends so that the contractor's accounts can be disabled. Employee accounts are disabled by IT Operations on the employee's last working day, based on the leaving date recorded in Officient. Access rights that are no longer required following a change of role must be removed within ten working days of the change. Disabled accounts are deleted after 90 days once any data retention obligations have been met.

7. Access reviews
Application and service owners recertify user and privileged access to the systems they own quarterly, using Entra ID access reviews. The results are documented and revocations resulting from a review are applied within five working days. The CISO reports the completion of access reviews to the Security Steering Committee.

8. Remote access
Remote access to internal administrative services is only permitted from Lumeo-managed, Intune-enrolled devices through the GlobalProtect VPN with certificate-based device authentication. Access to the Microsoft 365 environment from personal devices is limited to Teams and Outlook mobile applications protected by Intune app protection policies. Office networks are treated as untrusted for platform administration.

9. Exceptions
Exceptions to this policy must be requested in writing, risk-assessed and approved by the CISO for a maximum period of twelve months. Approved exceptions are recorded in the exception register and reviewed at each renewal.`;

export const ACCESS_CONTROL_POLICY_CHANGE_NOTE = `Passkeys (FIDO2) were rolled out to all staff in July 2026 — Microsoft Authenticator push is now fallback only, and MFA applies to all access to Lumeo systems, not only remote access.
Contractor and employee offboarding is now automated through the Officient leaver flow (same-day disablement), replacing manual notification to IT Operations.
The legacy GlobalProtect VPN was decommissioned in 2025; remote access to internal admin services now goes through Microsoft Entra Private Access with device compliance checks.
NIS2 applies to Lumeo (registered with the CCB as an important entity) — emergency access decisions taken during security incidents must follow the Incident Response Plan and be traceable to support CCB incident reporting.`;
