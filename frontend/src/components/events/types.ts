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
