// Events & Tasks — shared data models

export type EventStatus = "Active" | "Planning" | "Completed" | "Archived";
export type TaskStatus = "To Do" | "In Progress" | "In Review" | "Completed";
export type TaskPriority = "Low" | "Medium" | "High" | "Critical";

export type Assignee = {
  initials: string;
  color: string; // tailwind bg class
};

export type Nudge = {
  nudgeUID: string;
  triggerDate: string;
  nudgeType: string;
  sent: boolean;
};

export type Subtask = {
  subtaskUID: string;
  assignedMemberUID?: string | null;
  assignedMemberName?: string | null;
  description: string;
  deadline?: string;
  status: TaskStatus;
  matchPercentage?: number;
  isLeaderOnly?: boolean;
  nudges?: Nudge[];
};

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignee: Assignee;
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
