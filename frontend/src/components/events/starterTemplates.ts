import type { OrgCategory, StarterTemplate, Subtask } from "./types";

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "tpl-governing",
    category: "Governing",
    title: "General Assembly & Executive Governance",
    description: "Standard workflow for Student Councils & Executive Boards organizing campus-wide assemblies and policy sessions.",
    iconName: "Landmark",
    subtasks: [
      {
        title: "Draft Executive Assembly Agenda & Resolutions",
        description: "Prepare session outline, resolution drafts, and voting docket for the General Assembly.",
        requiredSkills: ["Governance", "Policy Drafting", "Administration"],
        estimatedDays: 3,
        isLeaderOnly: true,
        isAiGenerated: false,
        isTemplateBased: true,
        priority: "High",
        assigneeName: "Luis Garcia",
        status: "To Do"
      },
      {
        title: "Reserve Main Auditorium & Setup Sound System",
        description: "Coordinate with Campus Facilities for venue booking, aircon, and microphone setup.",
        requiredSkills: ["Logistics", "Campus Permits"],
        estimatedDays: 4,
        isLeaderOnly: false,
        isAiGenerated: false,
        isTemplateBased: true,
        priority: "High",
        assigneeName: "Beatrice Lim",
        status: "To Do"
      },
      {
        title: "Issue Departmental Attendance Notices & Quorum Tracking",
        description: "Send official invitations to class representatives and configure digital quorum verification.",
        requiredSkills: ["Communications", "Registration"],
        estimatedDays: 2,
        isLeaderOnly: false,
        isAiGenerated: false,
        isTemplateBased: true,
        priority: "Medium",
        assigneeName: "Marco Dela Cruz",
        status: "To Do"
      },
      {
        title: "Prepare Budget Breakdown & Liquidation Documentation",
        description: "Compile itemized expenditure estimates and submit financial requisition form.",
        requiredSkills: ["Finance", "Budgeting"],
        estimatedDays: 5,
        isLeaderOnly: true,
        isAiGenerated: false,
        isTemplateBased: true,
        priority: "Critical",
        assigneeName: "Ana Reyes",
        status: "To Do"
      }
    ]
  },
  {
    id: "tpl-academic",
    category: "Academic",
    title: "Academic Symposium & Lecture Series",
    description: "Tailored breakdown for scholarly clubs hosting research colloquiums, quiz bees, or guest speaker lectures.",
    iconName: "GraduationCap",
    subtasks: [
      {
        title: "Confirm Keynote Speakers & Honorarium Agreements",
        description: "Finalize speaker topics, travel accommodations, formal invitation letters, and honorarium vouchers.",
        requiredSkills: ["Academic Relations", "Public Relations"],
        estimatedDays: 5,
        isLeaderOnly: true,
        isAiGenerated: false,
        isTemplateBased: true,
        priority: "Critical",
        assigneeName: "Luis Garcia",
        status: "To Do"
      },
      {
        title: "Review Test Bank & Form Panel of Judges",
        description: "Vet academic quiz questions or research papers with faculty advisors and assign scorecards.",
        requiredSkills: ["Research", "Academic Vetting"],
        estimatedDays: 4,
        isLeaderOnly: true,
        isAiGenerated: false,
        isTemplateBased: true,
        priority: "High",
        assigneeName: "Beatrice Lim",
        status: "To Do"
      },
      {
        title: "Design Certificates of Recognition & Souvenir Kits",
        description: "Generate digital certificates for presenters, attendees, and guest panel members.",
        requiredSkills: ["Graphics Design", "Branding"],
        estimatedDays: 3,
        isLeaderOnly: false,
        isAiGenerated: false,
        isTemplateBased: true,
        priority: "Medium",
        assigneeName: "Marco Dela Cruz",
        status: "To Do"
      },
      {
        title: "Manage Participant Registration & Pre-event Evaluation Forms",
        description: "Publish Google Form / Web sign-ups, issue entry passes, and set up feedback surveys.",
        requiredSkills: ["Data Management", "Registration"],
        estimatedDays: 2,
        isLeaderOnly: false,
        isAiGenerated: false,
        isTemplateBased: true,
        priority: "Medium",
        assigneeName: "Ana Reyes",
        status: "To Do"
      }
    ]
  },
  {
    id: "tpl-socio-civic",
    category: "Socio-Civic",
    title: "Community Outreach & Service Project",
    description: "Operational framework for outreach programs, donation drives, and volunteer community initiatives.",
    iconName: "HeartHandshake",
    subtasks: [
      {
        title: "Secure LGU & Partner Community Permits",
        description: "Submit request letters to local barangay officials and secure safety protocols for the outreach site.",
        requiredSkills: ["Community Relations", "Permits"],
        estimatedDays: 6,
        isLeaderOnly: true,
        isAiGenerated: false,
        isTemplateBased: true,
        priority: "Critical",
        assigneeName: "Luis Garcia",
        status: "To Do"
      },
      {
        title: "Coordinate Goods Collection & Sorting Station",
        description: "Set up donation drop-off booths on campus and categorize packed relief/care goods.",
        requiredSkills: ["Inventory Control", "Volunteering"],
        estimatedDays: 4,
        isLeaderOnly: false,
        isAiGenerated: false,
        isTemplateBased: true,
        priority: "High",
        assigneeName: "Beatrice Lim",
        status: "To Do"
      },
      {
        title: "Conduct Volunteer Orientation & Safety Briefing",
        description: "Brief student volunteers on ground rules, duty rosters, emergency contacts, and transport schedules.",
        requiredSkills: ["Team Leadership", "Safety Protocols"],
        estimatedDays: 2,
        isLeaderOnly: false,
        isAiGenerated: false,
        isTemplateBased: true,
        priority: "Medium",
        assigneeName: "Marco Dela Cruz",
        status: "To Do"
      },
      {
        title: "Organize Transport Logistics & On-site First Aid Kit",
        description: "Book campus bus/van transport and coordinate with Red Cross / Campus Clinic for medical coverage.",
        requiredSkills: ["Transport Coordination", "First Aid"],
        estimatedDays: 3,
        isLeaderOnly: false,
        isAiGenerated: false,
        isTemplateBased: true,
        priority: "High",
        assigneeName: "Ana Reyes",
        status: "To Do"
      }
    ]
  },
  {
    id: "tpl-arts-culture",
    category: "Arts & Culture",
    title: "Cultural Festival & Arts Exhibition",
    description: "Creative project workflow for cultural nights, music fests, theatrical plays, and art galleries.",
    iconName: "Palette",
    subtasks: [
      {
        title: "Finalize Stage Production Schedule & Technical Rider",
        description: "Coordinate lighting cues, sound check times, stage props, and backstage access passes.",
        requiredSkills: ["Stage Management", "AV Production"],
        estimatedDays: 5,
        isLeaderOnly: true,
        isAiGenerated: false,
        isTemplateBased: true,
        priority: "High",
        assigneeName: "Luis Garcia",
        status: "To Do"
      },
      {
        title: "Execute Publicity Campaign & Ticket Pass Distribution",
        description: "Release teaser trailers, poster blasts across campus, and manage online ticket ticketing.",
        requiredSkills: ["Promotions", "Social Media", "Ticketing"],
        estimatedDays: 4,
        isLeaderOnly: false,
        isAiGenerated: false,
        isTemplateBased: true,
        priority: "High",
        assigneeName: "Beatrice Lim",
        status: "To Do"
      },
      {
        title: "Manage Performer Green Room & Talent Hospitality",
        description: "Provide refreshments, changing rooms, and scheduled call times for performing groups.",
        requiredSkills: ["Hospitality", "Event Care"],
        estimatedDays: 2,
        isLeaderOnly: false,
        isAiGenerated: false,
        isTemplateBased: true,
        priority: "Medium",
        assigneeName: "Marco Dela Cruz",
        status: "To Do"
      },
      {
        title: "Set up Gallery Exhibition Booths & Lighting",
        description: "Mount student art pieces, print artwork descriptions, and arrange gallery spotlighting.",
        requiredSkills: ["Curation", "Set Design"],
        estimatedDays: 3,
        isLeaderOnly: false,
        isAiGenerated: false,
        isTemplateBased: true,
        priority: "Medium",
        assigneeName: "Ana Reyes",
        status: "To Do"
      }
    ]
  },
  {
    id: "tpl-sports-recreation",
    category: "Sports & Recreation",
    title: "Sports Tournament & Athletic League",
    description: "Action plan for intra-university sports meets, esports tourneys, and recreational leagues.",
    iconName: "Trophy",
    subtasks: [
      {
        title: "Draft Tournament Rules, Brackets & Game Fixtures",
        description: "Formulate single/double elimination brackets, team seeding, and referee assignment schedules.",
        requiredSkills: ["Tournament Rules", "Arbitration"],
        estimatedDays: 4,
        isLeaderOnly: true,
        isAiGenerated: false,
        isTemplateBased: true,
        priority: "High",
        assigneeName: "Luis Garcia",
        status: "To Do"
      },
      {
        title: "Inspect Court Equipment & Procure Trophies / Medals",
        description: "Verify balls, nets, electronic scoreboard, and order customized championship trophies.",
        requiredSkills: ["Equipment Inventory", "Procurement"],
        estimatedDays: 5,
        isLeaderOnly: false,
        isAiGenerated: false,
        isTemplateBased: true,
        priority: "High",
        assigneeName: "Beatrice Lim",
        status: "To Do"
      },
      {
        title: "Deploy Campus First-Aid Responder Station",
        description: "Position medical stretchers, ice packs, and certified student medics near playing courts.",
        requiredSkills: ["Emergency Response", "First Aid"],
        estimatedDays: 2,
        isLeaderOnly: true,
        isAiGenerated: false,
        isTemplateBased: true,
        priority: "Critical",
        assigneeName: "Marco Dela Cruz",
        status: "To Do"
      },
      {
        title: "Coordinate Live Score Stream & Press Coverage",
        description: "Operate live score broadcast, update tournament leaderboard, and take action photos.",
        requiredSkills: ["Live Streaming", "Photography"],
        estimatedDays: 3,
        isLeaderOnly: false,
        isAiGenerated: false,
        isTemplateBased: true,
        priority: "Medium",
        assigneeName: "Ana Reyes",
        status: "To Do"
      }
    ]
  }
];

export function getStarterTemplateByCategory(category: OrgCategory): StarterTemplate {
  const found = STARTER_TEMPLATES.find((t) => t.category === category);
  return (
    found ||
    STARTER_TEMPLATES[0]
  );
}

// ── Semantic Safeguard Validation Engine (MSB-FE-014) ─────────────────────────

export function validateSubtaskSafeguards(subtask: Subtask): string[] {
  const warnings: string[] = [];

  // 1. Missing or overly brief title / description
  if (!subtask.title || subtask.title.trim().length < 5) {
    warnings.push("Incomplete Title: Title must be at least 5 characters long.");
  }
  if (!subtask.description || subtask.description.trim().length < 10) {
    warnings.push("Missing Detail: Subtask description is missing or vague.");
  }

  // 2. Missing required skills
  if (!subtask.requiredSkills || subtask.requiredSkills.length === 0) {
    warnings.push("Missing Skills: No required competencies or skills assigned.");
  }

  // 3. Low AI match confidence
  if (subtask.isAiGenerated && subtask.aiMetadata) {
    if (subtask.aiMetadata.confidenceScore < 70) {
      warnings.push(`Low AI Confidence (${subtask.aiMetadata.confidenceScore}%): AI output requires manual verification.`);
    }
  }

  // 4. Sensitive Keywords lacking Leader-Only designation
  const sensitiveKeywords = ["budget", "finance", "permit", "legal", "audit", "contract", "honorarium", "cash"];
  const titleAndDesc = `${subtask.title} ${subtask.description}`.toLowerCase();
  const containsSensitive = sensitiveKeywords.some((kw) => titleAndDesc.includes(kw));

  if (containsSensitive && !subtask.isLeaderOnly) {
    warnings.push("Governance Safeguard: Subtask involves financial/legal actions — recommend restricting to Leader Only.");
  }

  // 5. Unassigned assignee
  if (!subtask.assigneeName || subtask.assigneeName.trim() === "") {
    warnings.push("Unassigned Task: No suggested committee member or lead assigned.");
  }

  return warnings;
}
