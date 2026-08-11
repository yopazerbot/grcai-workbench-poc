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
  dora: {
    key: "dora",
    name: "DORA (Regulation (EU) 2022/2554, selection)",
    requirements: [
      { id: "Art. 5", title: "Governance and organisation", summary: "The management body defines, approves and oversees the ICT risk management framework, allocates the ICT risk function, sets a reporting cadence and maintains sufficient ICT risk knowledge." },
      { id: "Art. 6", title: "ICT risk management framework", summary: "A sound, comprehensive and documented ICT risk management framework — including risk appetite and tolerance for ICT disruptions — is maintained and reviewed at least yearly." },
      { id: "Art. 8", title: "Identification", summary: "ICT-supported business functions, information assets and their dependencies — including those on third parties — are identified, classified and documented, mapped to critical or important functions." },
      { id: "Art. 9", title: "Protection and prevention", summary: "ICT systems are continuously protected with policies, procedures and tools: security of networks, encryption, access management, patching and change control." },
      { id: "Art. 10", title: "Detection", summary: "Anomalous activities and ICT-related incidents are promptly detected, with multiple layers of control, defined alert thresholds and automatic monitoring." },
      { id: "Art. 11", title: "Response and recovery", summary: "An ICT business continuity policy with dedicated response and recovery plans is implemented, tested and reviewed, with defined recovery objectives per function." },
      { id: "Art. 12", title: "Backup policies and restoration", summary: "Backup policies and restoration and recovery procedures and methods are established, with restoration tested periodically." },
      { id: "Art. 13", title: "Learning and evolving", summary: "Lessons from incidents, tests and near-misses are captured and drive changes to the ICT risk framework, awareness and training." },
      { id: "Art. 14", title: "Communication", summary: "Communication plans for ICT-related incidents exist towards clients, counterparts and the public, with assigned spokespersons and prepared disclosure." },
      { id: "Art. 17", title: "ICT-related incident management process", summary: "A process to detect, manage, log and notify ICT-related incidents is defined and implemented, with early warning indicators and root-cause follow-up." },
      { id: "Art. 18-19", title: "Classification and reporting of major incidents", summary: "Incidents are classified against the regulatory materiality criteria; major ICT-related incidents are reported to the competent authority via initial, intermediate and final reports within set timelines." },
      { id: "Art. 24-26", title: "Digital operational resilience testing", summary: "A documented, risk-based resilience testing programme covers critical or important functions, including vulnerability assessments and — where designated — threat-led penetration testing (TLPT)." },
      { id: "Art. 28", title: "ICT third-party risk and register of information", summary: "ICT third-party risk is managed across the lifecycle; a register of information on all ICT service arrangements is maintained and reported in the regulatory format." },
      { id: "Art. 30", title: "Key contractual provisions", summary: "Contracts with ICT providers contain the mandated provisions: service descriptions, security requirements, audit and access rights, exit assistance and subcontracting conditions." },
    ],
  },
  nis2: {
    key: "nis2",
    name: "NIS2 (Directive (EU) 2022/2555, Art. 21(2))",
    requirements: [
      { id: "Art. 21(2)(a)", title: "Risk analysis and information system security policies", summary: "Policies on risk analysis and information system security are in place, with documented, system-level risk analyses." },
      { id: "Art. 21(2)(b)", title: "Incident handling", summary: "Incident handling capabilities cover prevention, detection, analysis, containment, response and recovery." },
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
};
