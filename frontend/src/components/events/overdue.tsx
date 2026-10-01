import { AlertTriangle } from "lucide-react";
import type { Task } from "./types";

function parseDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const fallback = new Date(`${value}, ${new Date().getFullYear()}`);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function getOverdueDays(task: Pick<Task, "status" | "dueDate" | "deadline">, now = new Date()) {
  if (task.status === "Completed" || task.status === "Done") return 0;
  const due = parseDate(task.dueDate || task.deadline);
  if (!due || due >= now) return 0;
  return Math.max(1, Math.floor((now.getTime() - due.getTime()) / 86_400_000));
}

export function OverdueBadge({ task }: { task: Pick<Task, "status" | "dueDate" | "deadline"> }) {
  const days = getOverdueDays(task);
  if (!days) return null;
  return <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200"><AlertTriangle size={10} /> Overdue {days}d</span>;
}
