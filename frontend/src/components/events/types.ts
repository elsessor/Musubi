// Events & Tasks — shared data models

export type EventStatus = "Active" | "Planning" | "Completed" | "Cancelled" | "Archived" | (string & {});
export type TaskStatus = "To Do" | "In Progress" | "In Review" | "Completed" | (string & {});
export type TaskPriority = "Low" | "Medium" | "High" | "Critical";

export type Assignee = {
  initials: string;
  color: string; // tailwind bg class
  name?: string;
};

export type Nudge = {
  nudgeUID: string;
  triggerDate: string;
  nudgeType: string;
  sent: boolean;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  startDate?: string;
  time?: string;
  assignee: Assignee;
  requiredSkills?: string[];
  isLeaderOnly?: boolean;
  isAiGenerated?: boolean;
  blockedBy?: number;

  // Embedded subtask fields matching goal schema
  subtaskUID?: string;
  assignedMemberUID?: string | null;
  assignedMemberName?: string | null;
  deadline?: string;
  matchPercentage?: number;
  committee?: string;
  nudges?: Nudge[];
};

export type Event = {
  id: string;
  title: string;
  description: string;
  status: EventStatus;
  startDate: string;
  endDate: string;
  memberCount: number;
  progress: number; // 0–100
  committee?: string;
  tasks: Task[];
  customStatuses?: import("./statusUtils").CustomStatusConfig[];
  statusOrder?: string[];
};

// ── Generated task from atomizer ──────────────────────────────────────────────

export type GeneratedTask = {
  id: string;
  title: string;
  priority: TaskPriority;
  assigneeName: string;
  dueDate: string;
  status: TaskStatus;
  matchScore: number; // 0–100
  confirmed: boolean;
};

// ── Subtask review & goal draft models (MSB-FE-013) ───────────────────────────

export type Subtask = {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  estimatedDays: number;
  isLeaderOnly: boolean;
  isAiGenerated: boolean;
  isTemplateBased?: boolean;
  aiMetadata?: {
    confidenceScore: number; // e.g. 88 for 88%
  };
  priority: TaskPriority;
  assigneeName?: string;
  status?: TaskStatus;
  validationWarnings?: string[];
};

export type GoalDraft = {
  id: string;
  eventName: string;
  description: string;
  status: "Draft" | "Active" | "Completed";
  subtasks: Subtask[];
  generationSource?: "ai" | "template" | "manual";
};

// ── Starter Template Types (MSB-FE-014) ───────────────────────────────────────

export type OrgCategory =
  | "Governing"
  | "Academic"
  | "Socio-Civic"
  | "Arts & Culture"
  | "Sports & Recreation";

export type StarterTemplate = {
  id: string;
  category: OrgCategory;
  title: string;
  description: string;
  iconName: string;
  subtasks: Array<Omit<Subtask, "id">>;
};
