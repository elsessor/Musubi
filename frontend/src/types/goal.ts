export type GoalPriority = "Low" | "Medium" | "High" | "Urgent";

export type CommitteeScope =
  | "Org-Wide"
  | "Logistics"
  | "Marketing"
  | "Finance"
  | "Sponsorship"
  | "Program"
  | "Technical";

export type TaskComplexity = "XS" | "S" | "M" | "L" | "XL";

export type PromptChainStepName =
  | "analyze_intent"
  | "break_subtasks"
  | "estimate_complexity"
  | "set_dependencies";

export interface PromptChainStep {
  id: string;
  name: PromptChainStepName;
  label: string;
  description: string;
  status: "idle" | "in_progress" | "completed" | "error";
  startedAt?: string;
  completedAt?: string;
  details?: string;
}

export interface AIMetadata {
  promptChainSteps: PromptChainStep[];
  generatedAt?: string;
  model?: string;
  executionTimeMs?: number;
  tokensUsed?: number;
  confidenceScore?: number;
}

export interface Subtask {
  id: string;
  title: string;
  description: string;
  committeeScope: CommitteeScope;
  priority: GoalPriority;
  estimatedHours: number;
  complexity: TaskComplexity;
  dependencies: string[]; // Subtask IDs
  assigneeName?: string;
  dueDate?: string;
}

export interface GoalDraft {
  id?: string;
  title: string;
  description: string;
  targetDate: string;
  priority: GoalPriority;
  committeeScope: CommitteeScope;
  aiMetadata?: AIMetadata;
  subtasks?: Subtask[];
  createdAt?: string;
  status?: "Draft" | "In Progress" | "Completed" | "Pending Review";
}
