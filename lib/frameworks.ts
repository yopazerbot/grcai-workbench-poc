// Condensed framework requirement catalogs. Injected into the Control Mapper
// prompt (and used by its simulated generator) so mapping rows are
// deterministic, with stable requirement IDs — no free recall from the model.

export interface FrameworkRequirement {
  id: string;
  title: string;
  summary: string;
}

export interface Framework {
  key: "iso27001" | "dora" | "nis2";
  name: string;
  requirements: FrameworkRequirement[];
}

export const FRAMEWORKS: Record<Framework["key"], Framework> = {
  iso27001: {
    key: "iso27001",
    name: "ISO/IEC 27001:2022 (Annex A, selection)",
    requirements: [
      { id: "A.5.1", title: "Policies for information security", summary: "An information security policy and topic-specific policies are defined, approved, communicated and reviewed." },
      { id: "A.5.9", title: "Inventory of information and other associated assets", summary: "An inventory of information and associated assets, with owners, is developed and maintained." },
      { id: "A.5.15", title: "Access control", summary: "Rules to control physical and logical access are established based on business and security requirements." },
      { id: "A.5.19", title: "Information security in supplier relationships", summary: "Processes manage information security risks associated with the use of supplier products and services." },
      { id: "A.5.24", title: "Incident management planning and preparation", summary: "Incident management is planned and prepared: processes, roles and responsibilities are defined." },
      { id: "A.5.30", title: "ICT readiness for business continuity", summary: "ICT readiness is planned, implemented, maintained and tested based on continuity objectives." },
      { id: "A.6.1", title: "Screening", summary: "Background verification checks on candidates are carried out proportional to business requirements and risk." },
      { id: "A.6.3", title: "Information security awareness, education and training", summary: "Personnel receive appropriate awareness education, training and regular policy updates." },
      { id: "A.7.1", title: "Physical security perimeters", summary: "Security perimeters protect areas containing information and associated assets." },
      { id: "A.8.2", title: "Privileged access rights", summary: "Allocation and use of privileged access rights are restricted and managed." },
      { id: "A.8.5", title: "Secure authentication", summary: "Secure authentication technologies and procedures (e.g. MFA) are implemented per the access control policy." },
      { id: "A.8.7", title: "Protection against malware", summary: "Protection against malware is implemented and supported by user awareness." },
      { id: "A.8.8", title: "Management of technical vulnerabilities", summary: "Vulnerabilities are identified, exposure evaluated and appropriate measures taken." },
      { id: "A.8.9", title: "Configuration management", summary: "Configurations, including security configurations, are established, documented, monitored and reviewed." },
      { id: "A.8.13", title: "Information backup", summary: "Backup copies are maintained and regularly tested per the agreed backup policy." },
      { id: "A.8.15", title: "Logging", summary: "Logs recording activities, exceptions and events are produced, stored, protected and analysed." },
      { id: "A.8.24", title: "Use of cryptography", summary: "Rules for effective use of cryptography, including key management, are defined and implemented." },
      { id: "A.8.25", title: "Secure development life cycle", summary: "Rules for secure development of software and systems are established and applied." },
    ],
  },
  dora: {
    key: "dora",
    name: "DORA (Regulation (EU) 2022/2554, selection)",
    requirements: [
      { id: "Art. 5", title: "Governance and organisation", summary: "The management body defines, approves and oversees the ICT risk management framework." },
      { id: "Art. 6", title: "ICT risk management framework", summary: "A sound, comprehensive and documented ICT risk management framework is maintained and reviewed." },
      { id: "Art. 8", title: "Identification", summary: "ICT-supported business functions, assets and dependencies are identified, classified and documented." },
      { id: "Art. 9", title: "Protection and prevention", summary: "ICT systems are protected with policies and tools for security, including encryption, access control and patching." },
      { id: "Art. 10", title: "Detection", summary: "Anomalous activities and ICT incidents are promptly detected, with multiple layers of control and monitoring." },
      { id: "Art. 11", title: "Response and recovery", summary: "An ICT business continuity policy with response and recovery plans is implemented and tested." },
      { id: "Art. 12", title: "Backup policies and restoration", summary: "Backup policies, restoration and recovery procedures and methods are established and tested." },
      { id: "Art. 13", title: "Learning and evolving", summary: "Lessons from incidents and testing feed into ICT security awareness and evolution of the framework." },
      { id: "Art. 17", title: "ICT-related incident management process", summary: "A process to detect, manage, log and notify ICT-related incidents is defined and implemented." },
      { id: "Art. 19", title: "Reporting of major ICT-related incidents", summary: "Major ICT-related incidents are classified and reported to the competent authority within set timelines." },
      { id: "Art. 24-26", title: "Digital operational resilience testing", summary: "A resilience testing programme is maintained, including threat-led penetration testing (TLPT) where required." },
      { id: "Art. 28", title: "ICT third-party risk management", summary: "ICT third-party risk is managed across the lifecycle, with a register of information for all ICT service arrangements." },
    ],
  },
  nis2: {
    key: "nis2",
    name: "NIS2 (Directive (EU) 2022/2555, Art. 21(2))",
    requirements: [
      { id: "Art. 21(2)(a)", title: "Risk analysis and information system security policies", summary: "Policies on risk analysis and information system security are in place." },
      { id: "Art. 21(2)(b)", title: "Incident handling", summary: "Incident handling capabilities cover prevention, detection, analysis, containment and response." },
      { id: "Art. 21(2)(c)", title: "Business continuity and crisis management", summary: "Business continuity measures: backup management, disaster recovery and crisis management." },
      { id: "Art. 21(2)(d)", title: "Supply chain security", summary: "Security aspects of relationships with direct suppliers and service providers are addressed." },
      { id: "Art. 21(2)(e)", title: "Security in acquisition, development and maintenance", summary: "Security in network and information systems acquisition, development and maintenance, including vulnerability handling and disclosure." },
      { id: "Art. 21(2)(f)", title: "Effectiveness assessment", summary: "Policies and procedures to assess the effectiveness of cybersecurity risk-management measures." },
      { id: "Art. 21(2)(g)", title: "Cyber hygiene and training", summary: "Basic cyber hygiene practices and cybersecurity training." },
      { id: "Art. 21(2)(h)", title: "Cryptography and encryption", summary: "Policies and procedures regarding the use of cryptography and, where appropriate, encryption." },
      { id: "Art. 21(2)(i)", title: "HR security, access control and asset management", summary: "Human resources security, access control policies and asset management." },
      { id: "Art. 21(2)(j)", title: "Multi-factor authentication and secured communications", summary: "Use of MFA or continuous authentication, secured voice/video/text communications and secured emergency communication." },
    ],
  },
};
