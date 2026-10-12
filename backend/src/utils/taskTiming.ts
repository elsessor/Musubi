import { parseScheduleDate } from "./dateRange.js";

// Campus schedules without an explicit offset use Asia/Manila (UTC+08:00).
const DAY = 86400000;
const CAMPUS_OFFSET = 8 * 3600000;
export type ScheduledTask = {
  id?: string; status?: string; dueDate?: string; deadline?: string; archivedAt?: unknown;
  submittedAt?: string | null; submittedDueDate?: string | null;
  completedAt?: string | null; completedDueDate?: string | null;
  blockedBy?: number; blockedByTaskTitles?: string[];
};

export function parseTaskDeadline(value: unknown): Date | null {
  if (typeof value !== "string" || !/\b\d{4}\b/.test(value)) return null;
  const date = parseScheduleDate(value, true);
  if (!date) return null;
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value.trim())) return date;
  const timed = /\d{1,2}:\d{2}/.test(value);
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), timed ? date.getHours() : 23, timed ? date.getMinutes() : 59, timed ? date.getSeconds() : 59, timed ? date.getMilliseconds() : 999) - CAMPUS_OFFSET);
}

export function getTaskDeadline(task: ScheduledTask): Date | null {
  return parseTaskDeadline(task.dueDate) || parseTaskDeadline(task.deadline);
}

export function isTaskInactive(task: { status?: string; archivedAt?: unknown }): boolean {
  return Boolean(task.archivedAt) || ["archived", "cancelled", "canceled"].includes((task.status || "").trim().toLowerCase());
}

export function getTaskDeliveryTime(task: ScheduledTask): Date | null {
  for (const value of [task.submittedAt, task.completedAt]) {
    if (value) { const date = new Date(value); if (Number.isFinite(date.getTime())) return date; }
  }
  return null;
}

export function getTaskPerformanceDeadline(task: ScheduledTask): Date | null {
  const snapshot = task.submittedAt ? task.submittedDueDate : task.completedDueDate;
  return typeof snapshot === "string" ? parseTaskDeadline(snapshot) : getTaskDeadline(task);
}

export function campusDateKey(date: Date): string {
  return new Date(date.getTime() + CAMPUS_OFFSET).toISOString().slice(0, 10);
}

export function getTaskTiming(task: ScheduledTask, now = new Date()) {
  const deadline = getTaskDeadline(task);
  const status = (task.status || "").trim().toLowerCase();
  if (isTaskInactive(task)) return { kind: "inactive", label: "", deadline };
  if (["completed", "done"].includes(status)) {
    const delivered = getTaskDeliveryTime(task), target = getTaskPerformanceDeadline(task);
    return { kind: delivered && target && delivered > target ? "completed-late" : "completed", label: delivered && target && delivered > target ? "Completed late" : "", deadline };
  }
  if (status === "in review") return { kind: "awaiting-review", label: "Awaiting review", deadline };
  if (!deadline) return { kind: "none", label: "No deadline", deadline };
  if (now > deadline) {
    const elapsed = now.getTime() - deadline.getTime();
    const duration = elapsed >= DAY ? ` ${Math.floor(elapsed / DAY)}d` : elapsed >= 3600000 ? ` ${Math.floor(elapsed / 3600000)}h` : "";
    return { kind: "overdue", label: `Overdue${duration}${task.blockedBy ? " · Blocked" : ""}`, deadline };
  }
  const days = Math.floor((deadline.getTime() + CAMPUS_OFFSET) / DAY) - Math.floor((now.getTime() + CAMPUS_OFFSET) / DAY);
  if (days === 0) return { kind: "due-today", label: "Due today", deadline };
  if (days === 1) return { kind: "due-tomorrow", label: "Due tomorrow", deadline };
  if (days <= 3) return { kind: "approaching", label: `Due in ${days} days`, deadline };
  return { kind: "upcoming", label: "", deadline };
}

export function getTaskReminder(task: ScheduledTask, now = new Date()) {
  const timing = getTaskTiming(task, now);
  return ["overdue", "due-today", "due-tomorrow", "approaching"].includes(timing.kind) && timing.deadline ? timing : null;
}

export function taskReminderId(eventId: string, taskId: string, deadline: Date, kind: string, recipientUID: string): string {
  return ["deadline", eventId, taskId, deadline.toISOString(), kind, recipientUID].map(encodeURIComponent).join("_");
}
