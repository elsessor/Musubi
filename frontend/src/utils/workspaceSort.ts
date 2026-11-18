import type { Event, Task } from "@/components/events/types";
import { parseScheduleDate } from "./dateRange";
import { getTaskDeadline, getTaskTiming, isTaskInactive, parseTaskDeadline } from "./taskTiming";
import { isDependencyComplete } from "./taskDependencies";

export type EventSortMode = "upcoming" | "latest" | "created" | "updated" | "name";
export type EventScheduleFilter = "all" | "upcoming" | "ongoing" | "past";
export type TaskSortMode = "attention" | "deadline" | "priority" | "name";
const names = new Intl.Collator("en", { sensitivity: "base", numeric: true });

function compareTime(left: number | null, right: number | null, descending = false): number {
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;
  return descending ? right - left : left - right;
}

/** Offset-free campus dates use Manila time; undated records never get invented dates. */
export function scheduleTime(value: unknown, endOfDay = false): number | null {
  if (typeof value !== "string" || !/\b\d{4}\b/.test(value)) return null;
  if (endOfDay) return parseTaskDeadline(value)?.getTime() ?? null;
  const date = parseScheduleDate(value);
  if (!date) return null;
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value.trim())) return date.getTime();
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()) - 8 * 3600000;
}

export function eventStartTime(event: Pick<Event, "startDate">): number | null {
  return scheduleTime((event.startDate || "").split(" - ")[0]);
}

function eventEndTime(event: Pick<Event, "startDate" | "endDate">): number | null {
  const [start, legacyEnd] = (event.startDate || "").split(" - ");
  return scheduleTime(event.endDate, true) ?? scheduleTime(legacyEnd, true) ?? scheduleTime(start, true);
}

type EventPhase = "ongoing" | "upcoming" | "undated" | "past" | "cancelled" | "archived";
const EVENT_PHASE_ORDER: Record<EventPhase, number> = { ongoing: 0, upcoming: 1, undated: 2, past: 3, archived: 4, cancelled: 5 };

function eventPhase(event: Event, now: Date, start = eventStartTime(event), end = eventEndTime(event)): EventPhase {
  const status = event.status.trim().toLowerCase();
  if (event.archivedAt || status === "archived") return "archived";
  if (["cancelled", "canceled"].includes(status)) return "cancelled";
  if (status === "completed") return "past";
  if (start === null || end === null || end < start) return "undated";
  if (end < now.getTime()) return "past";
  return start > now.getTime() ? "upcoming" : "ongoing";
}

export function matchesEventSchedule(event: Event, filter: EventScheduleFilter, now = new Date()): boolean {
  return filter === "all" || eventPhase(event, now) === filter;
}

function tie(left: { id: string; title: string }, right: { id: string; title: string }): number {
  return names.compare(left.title, right.title) || names.compare(left.id, right.id);
}

export function sortEvents<T extends Event>(events: readonly T[], mode: EventSortMode = "upcoming", now = new Date()): T[] {
  const prepared = events.map((event) => {
    const start = eventStartTime(event), end = eventEndTime(event);
    const group = EVENT_PHASE_ORDER[eventPhase(event, now, start, end)];
    return { event, start, end, group };
  });
  prepared.sort((left, right) => {
    if (mode === "name") return tie(left.event, right.event);
    if (mode === "latest") return compareTime(left.start, right.start, true) || tie(left.event, right.event);
    if (mode === "created" || mode === "updated") {
      const date = (event: T) => scheduleTime(mode === "created" ? event.createdAt : event.updatedAt || event.createdAt);
      return compareTime(date(left.event), date(right.event), true) || tie(left.event, right.event);
    }
    return left.group - right.group
      || compareTime(left.group >= 3 ? left.end : left.start, right.group >= 3 ? right.end : right.start, left.group >= 3)
      || tie(left.event, right.event);
  });
  return prepared.map(({ event }) => event);
}

const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export function sortTasks<T extends Task>(tasks: readonly T[], mode: TaskSortMode = "attention", now = new Date()): T[] {
  const prepared = tasks.map((task) => ({
    task,
    group: isTaskInactive(task) ? 2 : isDependencyComplete(task.status) ? 1 : 0,
    deadline: getTaskDeadline(task)?.getTime() ?? null,
    overdue: getTaskTiming(task, now).kind === "overdue",
    priority: PRIORITY_ORDER[task.priority] ?? PRIORITY_ORDER.Medium
  }));
  prepared.sort((left, right) => {
    if (mode === "name") return tie(left.task, right.task);
    const group = left.group - right.group;
    if (group) return group;
    if (mode === "attention" && left.group === 0 && left.overdue !== right.overdue) return left.overdue ? -1 : 1;
    if (mode === "priority" && left.group === 0 && left.priority !== right.priority) return left.priority - right.priority;
    if (left.group !== 0) {
      const date = (task: T) => scheduleTime(left.group === 2 ? task.archivedAt : task.completedAt) ?? getTaskDeadline(task)?.getTime() ?? null;
      return compareTime(date(left.task), date(right.task), true) || tie(left.task, right.task);
    }
    return compareTime(left.deadline, right.deadline) || left.priority - right.priority || tie(left.task, right.task);
  });
  return prepared.map(({ task }) => task);
}

export function sortCalendarItems<T>(items: readonly T[], getTime: (item: T) => number | null, getTitle: (item: T) => string, getId: (item: T) => string): T[] {
  return [...items].sort((left, right) => compareTime(getTime(left), getTime(right)) || names.compare(getTitle(left), getTitle(right)) || names.compare(getId(left), getId(right)));
}
