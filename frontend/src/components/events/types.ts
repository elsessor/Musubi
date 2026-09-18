// Events & Tasks — shared data models

<<<<<<< HEAD
export type EventStatus = "Active" | "Planning" | "Completed" | "Cancelled" | "Archived";
export type TaskStatus = "To Do" | "In Progress" | "In Review" | "Completed";
=======
export type EventStatus = "Active" | "Planning" | "Completed" | "Archived" | (string & {});
export type TaskStatus = "To Do" | "In Progress" | "In Review" | "Completed" | (string & {});
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
export type TaskPriority = "Low" | "Medium" | "High" | "Critical";

export type Assignee = {
  initials: string;
  color: string; // tailwind bg class
<<<<<<< HEAD
  name?: string;
=======
};

export type Nudge = {
  nudgeUID: string;
  triggerDate: string;
  nudgeType: string;
  sent: boolean;
};

export type Subtask = {
  subtaskUID: string;
  title?: string;
  assignedMemberUID?: string | null;
  assignedMemberName?: string | null;
  description: string;
  deadline?: string;
  status: TaskStatus;
  matchPercentage?: number;
  isLeaderOnly?: boolean;
  nudges?: Nudge[];
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
};

export type Task = {
  id: string;
  title: string;
<<<<<<< HEAD
  description?: string;
=======
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignee: Assignee;
<<<<<<< HEAD
  requiredSkills?: string[];
  isLeaderOnly?: boolean;
  isAiGenerated?: boolean;
  blockedBy?: number;
=======
  blockedBy?: number;
  // Embedded subtask fields matching goal schema
  subtaskUID?: string;
  assignedMemberUID?: string | null;
  assignedMemberName?: string | null;
  description?: string;
  deadline?: string;
  matchPercentage?: number;
  isLeaderOnly?: boolean;
  committee?: string;
  nudges?: Nudge[];
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
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
<<<<<<< HEAD

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


=======
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
