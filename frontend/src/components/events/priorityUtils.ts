import type { TaskPriority } from "./types";

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; classes: string; dot: string }> = {
  Low: { label: "Low", classes: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
  Medium: { label: "Medium", classes: "bg-blue-50 text-blue-600 ring-blue-200", dot: "bg-blue-500" },
  High: { label: "High", classes: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  Critical: { label: "Critical", classes: "bg-rose-50 text-rose-600 ring-rose-200", dot: "bg-rose-500" }
};

export const ALL_PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Critical"];
