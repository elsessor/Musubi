// Events & Tasks — shared data models

export type EventStatus = "Active" | "Planning" | "Completed" | "Archived";
export type TaskStatus = "To Do" | "In Progress" | "In Review" | "Completed";
export type TaskPriority = "Low" | "Medium" | "High" | "Critical";

export type Assignee = {
  initials: string;
  color: string; // tailwind bg class
};

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignee: Assignee;
  blockedBy?: number;
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

// ── Subtask review & goal draft models (MSB-FE-013) ───────────────────────────

export type Subtask = {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  estimatedDays: number;
  isLeaderOnly: boolean;
  isAiGenerated: boolean;
  aiMetadata?: {
    confidenceScore: number; // e.g. 88 for 88%
  };
  priority: TaskPriority;
  assigneeName?: string;
  status?: TaskStatus;
};

export type GoalDraft = {
  id: string;
  eventName: string;
  description: string;
  status: "Draft" | "Active" | "Completed";
  subtasks: Subtask[];
};

