// Condensed framework requirement catalogs. Injected into the Control Mapper
// prompt (and used by its simulated generator) so mapping rows are
// deterministic, with stable requirement IDs — no free recall from the model.

export interface FrameworkRequirement {
  id: string;
  title: string;
  summary: string;
}

export type FrameworkKey = "iso27001" | "nis2" | "soc2";

export interface Framework {
  key: FrameworkKey;
  name: string;
  shortName: string;
  requirements: FrameworkRequirement[];
}

export const FRAMEWORKS: Record<FrameworkKey, Framework> = {
  iso27001: {
    key: "iso27001",
    name: "ISO/IEC 27001:2022 (Annex A, selection)",
    shortName: "ISO 27001",
    requirements: [
      { id: "A.5.1", title: "Policies for information security", summary: "An information security policy and topic-specific policies are defined, approved by management, communicated and reviewed at planned intervals." },
      { id: "A.5.9", title: "Inventory of information and other associated assets", summary: "An inventory of information and associated assets, including owners, is developed and maintained." },
      { id: "A.5.15", title: "Access control", summary: "Rules to control physical and logical access are established and implemented based on business and security requirements." },
      { id: "A.5.19", title: "Information security in supplier relationships", summary: "Processes and procedures manage the information security risks associated with the use of supplier products and services." },
      { id: "A.5.23", title: "Information security for use of cloud services", summary: "Processes for acquisition, use, management and exit from cloud services are established per the organisation's security requirements." },
      { id: "A.5.24", title: "Incident management planning and preparation", summary: "Incident management is planned and prepared: processes, roles and responsibilities are defined, established and communicated." },
      { id: "A.5.30", title: "ICT readiness for business continuity", summary: "ICT readiness is planned, implemented, maintained and tested based on business continuity objectives and requirements." },
      { id: "A.6.1", title: "Screening", summary: "Background verification checks on candidates are carried out prior to joining and on an ongoing basis, proportional to business requirements and risk." },
      { id: "A.6.3", title: "Information security awareness, education and training", summary: "Personnel receive appropriate awareness education and training and regular updates of the policies relevant to their function." },
      { id: "A.7.1", title: "Physical security perimeters", summary: "Security perimeters are defined and used to protect areas containing information and other associated assets." },
      { id: "A.8.2", title: "Privileged access rights", summary: "The allocation and use of privileged access rights are restricted and managed." },
      { id: "A.8.5", title: "Secure authentication", summary: "Secure authentication technologies and procedures (e.g. MFA) are implemented based on access restrictions and the access control policy." },
      { id: "A.8.7", title: "Protection against malware", summary: "Protection against malware is implemented and supported by appropriate user awareness." },
      { id: "A.8.8", title: "Management of technical vulnerabilities", summary: "Information about technical vulnerabilities is obtained, exposure evaluated and appropriate measures taken." },
      { id: "A.8.9", title: "Configuration management", summary: "Configurations, including security configurations, of hardware, software, services and networks are established, documented, implemented, monitored and reviewed." },
      { id: "A.8.13", title: "Information backup", summary: "Backup copies of information, software and systems are maintained and regularly tested per the agreed topic-specific policy." },
      { id: "A.8.15", title: "Logging", summary: "Logs recording activities, exceptions, faults and other relevant events are produced, stored, protected and analysed." },
      { id: "A.8.24", title: "Use of cryptography", summary: "Rules for the effective use of cryptography, including key management, are defined and implemented." },
      { id: "A.8.25", title: "Secure development life cycle", summary: "Rules for the secure development of software and systems are established and applied." },
    ],
  },
  nis2: {
    key: "nis2",
    name: "NIS2 (Directive (EU) 2022/2555, Art. 21(2) — Belgian NIS2 Act)",
    shortName: "NIS2",
    requirements: [
      { id: "Art. 21(2)(a)", title: "Risk analysis and information system security policies", summary: "Policies on risk analysis and information system security are in place, with documented, system-level risk analyses." },
      { id: "Art. 21(2)(b)", title: "Incident handling", summary: "Incident handling capabilities cover prevention, detection, analysis, containment, response and recovery — including the 24h/72h/1-month reporting duties towards the CCB." },
      { id: "Art. 21(2)(c)", title: "Business continuity and crisis management", summary: "Business continuity measures: backup management, disaster recovery and crisis management with assigned roles." },
      { id: "Art. 21(2)(d)", title: "Supply chain security", summary: "Security aspects of the relationships with direct suppliers and service providers are addressed, considering their vulnerabilities and practices." },
      { id: "Art. 21(2)(e)", title: "Security in acquisition, development and maintenance", summary: "Security in network and information systems acquisition, development and maintenance, including vulnerability handling and disclosure." },
      { id: "Art. 21(2)(f)", title: "Effectiveness assessment", summary: "Policies and procedures to assess the effectiveness of the cybersecurity risk-management measures themselves." },
      { id: "Art. 21(2)(g)", title: "Cyber hygiene and training", summary: "Basic cyber hygiene practices and cybersecurity training across the organisation." },
      { id: "Art. 21(2)(h)", title: "Cryptography and encryption", summary: "Policies and procedures regarding the use of cryptography and, where appropriate, encryption." },
      { id: "Art. 21(2)(i)", title: "HR security, access control and asset management", summary: "Human resources security, access control policies and asset management." },
      { id: "Art. 21(2)(j)", title: "Multi-factor authentication and secured communications", summary: "Use of multi-factor or continuous authentication, secured voice/video/text communications and secured emergency communication systems." },
    ],
  },
  soc2: {
    key: "soc2",
    name: "SOC 2 — Trust Services Criteria (Security, Availability, Confidentiality; selection)",
    shortName: "SOC 2",
    requirements: [
      { id: "CC2.1", title: "Information to support internal control", summary: "The entity obtains or generates and uses relevant, quality information — including security policies and responsibilities communicated to personnel — to support the functioning of internal control." },
      { id: "CC3.1", title: "Objectives and risk identification", summary: "The entity specifies objectives with sufficient clarity and identifies and analyses risks to their achievement, including a periodic risk assessment." },
      { id: "CC4.1", title: "Monitoring of controls", summary: "The entity selects, develops and performs ongoing and/or separate evaluations (internal audits, control monitoring) to ascertain whether controls are present and functioning." },
      { id: "CC5.3", title: "Policies and procedures", summary: "The entity deploys control activities through policies that establish what is expected and procedures that put policies into action." },
      { id: "CC6.1", title: "Logical access security architecture", summary: "Logical access security software, infrastructure and architectures are implemented over protected information assets, including identification, authentication and encryption of data at rest." },
      { id: "CC6.2", title: "User registration and authorisation", summary: "New internal and external users are registered and authorised before being issued credentials; access is removed when no longer required." },
      { id: "CC6.3", title: "Access modification and removal", summary: "Access to data, software and infrastructure is authorised, modified or removed based on roles and least privilege, with periodic review." },
      { id: "CC6.6", title: "Boundary protection against external threats", summary: "Logical access security measures protect against threats from sources outside the system boundaries (firewalls, WAF, intrusion detection)." },
      { id: "CC6.7", title: "Restriction and encryption of data transmission", summary: "The transmission, movement and removal of information is restricted to authorised users and processes and protected during transmission." },
      { id: "CC6.8", title: "Prevention and detection of malicious software", summary: "Controls prevent or detect and act upon the introduction of unauthorised or malicious software." },
      { id: "CC7.1", title: "Vulnerability and configuration change detection", summary: "Detection and monitoring procedures identify changes to configurations that introduce vulnerabilities, and newly discovered vulnerabilities." },
      { id: "CC7.2", title: "Anomaly monitoring", summary: "System components and their operation are monitored for anomalies indicative of malicious acts, natural disasters and errors; anomalies are analysed as potential security events." },
      { id: "CC7.3", title: "Security event evaluation", summary: "Identified security events are evaluated to determine whether they could or have resulted in a failure to meet objectives (security incidents), and if so, actions are taken." },
      { id: "CC7.4", title: "Incident response", summary: "The entity responds to identified security incidents by executing a defined incident response programme to understand, contain, remediate and communicate." },
      { id: "CC7.5", title: "Recovery from incidents", summary: "The entity identifies, develops and implements activities to recover from identified security incidents." },
      { id: "CC8.1", title: "Change management", summary: "Changes to infrastructure, data, software and procedures are authorised, designed, developed, configured, documented, tested, approved and implemented to meet objectives." },
      { id: "CC9.1", title: "Risk mitigation for business disruption", summary: "Risk mitigation activities address potential business disruptions, including business continuity planning." },
      { id: "CC9.2", title: "Vendor and business partner risk", summary: "The entity assesses and manages risks associated with vendors and business partners, including contractual security commitments and periodic assessment." },
      { id: "A1.2", title: "Environmental protections, backup and recovery infrastructure", summary: "Environmental protections, software, data backup processes and recovery infrastructure are authorised, designed, developed, implemented, operated, monitored and maintained to meet availability objectives." },
      { id: "A1.3", title: "Recovery plan testing", summary: "Recovery plan procedures supporting system recovery are tested to help meet availability objectives." },
      { id: "C1.1", title: "Identification and protection of confidential information", summary: "Confidential information is identified and maintained (classified, handled and protected) to meet confidentiality objectives." },
      { id: "C1.2", title: "Disposal of confidential information", summary: "Confidential information is disposed of to meet the entity's objectives related to confidentiality (retention and deletion)." },
    ],
  },
};

export const FRAMEWORK_LIST: Framework[] = Object.values(FRAMEWORKS);

export function isFrameworkKey(key: string): key is FrameworkKey {
  return key in FRAMEWORKS;
}
