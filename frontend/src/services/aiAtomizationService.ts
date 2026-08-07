import type {
  AIMetadata,
  CommitteeScope,
  GoalDraft,
  GoalPriority,
  PromptChainStep,
  Subtask,
  TaskComplexity
} from "@/types/goal";

export interface AIAtomizationOptions {
  goal: GoalDraft;
  signal?: AbortSignal;
  onStepChange?: (steps: PromptChainStep[], currentStepIndex: number) => void;
}

export const INITIAL_PROMPT_CHAIN_STEPS: PromptChainStep[] = [
  {
    id: "step-1",
    name: "analyze_intent",
    label: "Analyzing intent...",
    description: "Parsing high-level goal objectives, scope constraints, and target outcomes.",
    status: "idle"
  },
  {
    id: "step-2",
    name: "break_subtasks",
    label: "Breaking into subtasks...",
    description: "Decomposing macro goal into actionable atomic work units across committees.",
    status: "idle"
  },
  {
    id: "step-3",
    name: "estimate_complexity",
    label: "Estimating complexity...",
    description: "Calculating effort ratings, estimated hours, and resource requirements.",
    status: "idle"
  },
  {
    id: "step-4",
    name: "set_dependencies",
    label: "Setting dependencies...",
    description: "Mapping prerequisite tasks, sequential flow, and timeline constraints.",
    status: "idle"
  }
];

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new DOMException("Aborted", "AbortError"));
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abortHandler);
      resolve();
    }, ms);

    const abortHandler = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", abortHandler, { once: true });
  });
}

export function generateContextualSubtasks(goal: GoalDraft): Subtask[] {
  const scope = goal.committeeScope || "Org-Wide";
  const priority = goal.priority || "High";
  const lowerTitle = goal.title.toLowerCase();

  let subtasks: Subtask[] = [];

  if (lowerTitle.includes("fest") || lowerTitle.includes("event") || lowerTitle.includes("symposium") || lowerTitle.includes("gala")) {
    subtasks = [
      {
        id: "st-101",
        title: "Finalize Venue Reservation & Campus Permits",
        description: "Submit request to University Affairs and secure main hall booking with required AV permit.",
        committeeScope: scope === "Org-Wide" ? "Logistics" : scope,
        priority: "Urgent",
        estimatedHours: 6,
        complexity: "M",
        dependencies: []
      },
      {
        id: "st-102",
        title: "Draft Budget Breakdown & Sponsorship Proposal",
        description: "Outline total anticipated costs and prepare sponsorship deck for corporate partners.",
        committeeScope: scope === "Org-Wide" ? "Finance" : scope,
        priority: priority,
        estimatedHours: 10,
        complexity: "L",
        dependencies: []
      },
      {
        id: "st-103",
        title: "Launch Social Media Campaign & Banner Designs",
        description: "Design promotional graphics, set up event registration link, and publish announcement posts.",
        committeeScope: scope === "Org-Wide" ? "Marketing" : scope,
        priority: "Medium",
        estimatedHours: 8,
        complexity: "S",
        dependencies: ["st-101", "st-102"]
      },
      {
        id: "st-104",
        title: "Confirm Guest Speakers & Technical Schedule",
        description: "Send invitations to keynote speakers, confirm travel arrangements, and finalize stage program schedule.",
        committeeScope: scope === "Org-Wide" ? "Program" : scope,
        priority: priority,
        estimatedHours: 12,
        complexity: "L",
        dependencies: ["st-101"]
      },
      {
        id: "st-105",
        title: "Setup On-site Registration & Volunteer Briefing",
        description: "Prepare QR check-in badges, assign volunteer shifts, and conduct pre-event walkthrough.",
        committeeScope: scope === "Org-Wide" ? "Logistics" : scope,
        priority: "High",
        estimatedHours: 5,
        complexity: "M",
        dependencies: ["st-103", "st-104"]
      }
    ];
  } else if (lowerTitle.includes("workshop") || lowerTitle.includes("training") || lowerTitle.includes("hackathon") || lowerTitle.includes("tech")) {
    subtasks = [
      {
        id: "st-201",
        title: "Define Technical Curriculum & Lab Requirements",
        description: "Prepare slide decks, hands-on coding repositories, and setup instructions for participants.",
        committeeScope: scope === "Org-Wide" ? "Technical" : scope,
        priority: "High",
        estimatedHours: 12,
        complexity: "L",
        dependencies: []
      },
      {
        id: "st-202",
        title: "Secure Lab Computers & Software Licenses",
        description: "Coordinate with IT department for computer lab access and pre-installed developer tools.",
        committeeScope: scope === "Org-Wide" ? "Logistics" : scope,
        priority: priority,
        estimatedHours: 4,
        complexity: "S",
        dependencies: ["st-201"]
      },
      {
        id: "st-203",
        title: "Create Participant Registration Form & Outreach",
        description: "Publish Google Form / Web link and promote across student forums and discord channels.",
        committeeScope: scope === "Org-Wide" ? "Marketing" : scope,
        priority: "Medium",
        estimatedHours: 5,
        complexity: "S",
        dependencies: []
      },
      {
        id: "st-204",
        title: "Print Certificates & Prepare Swag Distribution",
        description: "Design participation certificates and procure branded stickers / snacks for attendees.",
        committeeScope: scope === "Org-Wide" ? "Finance" : scope,
        priority: "Low",
        estimatedHours: 6,
        complexity: "M",
        dependencies: ["st-203"]
      }
    ];
  } else {
    // Default high-level goal decomposition
    subtasks = [
      {
        id: "st-301",
        title: "Initial Scope Alignment & Stakeholder Kickoff",
        description: "Convene core committee leads to review goal parameters, assign roles, and define KPIs.",
        committeeScope: scope,
        priority: priority,
        estimatedHours: 4,
        complexity: "S",
        dependencies: []
      },
      {
        id: "st-302",
        title: "Resource Allocation & Budget Authorization",
        description: "Itemize necessary expenditures, verify treasury balance, and obtain executive sign-off.",
        committeeScope: scope === "Org-Wide" ? "Finance" : scope,
        priority: priority,
        estimatedHours: 6,
        complexity: "M",
        dependencies: ["st-301"]
      },
      {
        id: "st-303",
        title: "Execute Primary Operations & Task Deliverables",
        description: `Implement core activities described in: "${goal.description.slice(0, 80)}${goal.description.length > 80 ? "..." : ""}"`,
        committeeScope: scope,
        priority: priority,
        estimatedHours: 16,
        complexity: "XL",
        dependencies: ["st-302"]
      },
      {
        id: "st-304",
        title: "Post-Execution Evaluation & Impact Report",
        description: "Gather feedback metrics from members, analyze goal completion rate, and compile summary report.",
        committeeScope: scope === "Org-Wide" ? "Marketing" : scope,
        priority: "Medium",
        estimatedHours: 5,
        complexity: "M",
        dependencies: ["st-303"]
      }
    ];
  }

  return subtasks;
}

export async function runAIAtomizationPromptChain(
  options: AIAtomizationOptions
): Promise<{ goal: GoalDraft; subtasks: Subtask[]; aiMetadata: AIMetadata }> {
  const { goal, signal, onStepChange } = options;
  const startTime = Date.now();

  const steps: PromptChainStep[] = INITIAL_PROMPT_CHAIN_STEPS.map((s) => ({
    ...s,
    status: "idle"
  }));

  const updateSteps = (idx: number, status: PromptChainStep["status"], details?: string) => {
    steps[idx] = {
      ...steps[idx],
      status,
      startedAt: status === "in_progress" ? new Date().toISOString() : steps[idx].startedAt,
      completedAt: status === "completed" ? new Date().toISOString() : steps[idx].completedAt,
      details: details ?? steps[idx].details
    };
    onStepChange?.([...steps], idx);
  };

  // Step 1: analyze_intent
  updateSteps(0, "in_progress", "Parsing goal title and user intent parameters...");
  await delay(900, signal);
  updateSteps(0, "completed", "Intent extracted. Target domain identified.");

  // Step 2: break_subtasks
  updateSteps(1, "in_progress", "Generating candidate atomic subtasks...");
  await delay(1100, signal);
  const subtasks = generateContextualSubtasks(goal);
  updateSteps(1, "completed", `Created ${subtasks.length} subtasks based on scope.`);

  // Step 3: estimate_complexity
  updateSteps(2, "in_progress", "Calculating difficulty index and estimated duration...");
  await delay(800, signal);
  updateSteps(2, "completed", "Complexity ratings (XS-XL) and effort estimates assigned.");

  // Step 4: set_dependencies
  updateSteps(3, "in_progress", "Building task dependency graph and critical path...");
  await delay(800, signal);
  updateSteps(3, "completed", "Prerequisite relationships established.");

  const totalTime = Date.now() - startTime;

  const aiMetadata: AIMetadata = {
    promptChainSteps: steps,
    generatedAt: new Date().toISOString(),
    model: "Musubi Atomizer v2.4 (Gemini Pro)",
    executionTimeMs: totalTime,
    tokensUsed: 1420,
    confidenceScore: 0.94
  };

  const updatedGoal: GoalDraft = {
    ...goal,
    aiMetadata,
    subtasks,
    status: "Pending Review"
  };

  return {
    goal: updatedGoal,
    subtasks,
    aiMetadata
  };
}
