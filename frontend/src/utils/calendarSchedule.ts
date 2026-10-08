import { parseScheduleDate } from "./dateRange";

function calendarDate(value: unknown): Date | null {
  // A missing year must not make an item recur in every viewed year.
  if (typeof value !== "string" || !/\b\d{4}\b/.test(value)) return null;
  return parseScheduleDate(value);
}

function dayTime(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function isSameCalendarDay(date: Date, other: Date): boolean {
  return dayTime(date) === dayTime(other);
}

export function isEventScheduledOnDay(event: { startDate?: string; endDate?: string }, day: Date): boolean {
  const [startValue, legacyEnd] = (event.startDate || "").split(" - ");
  const start = calendarDate(startValue);
  const endValue = event.endDate && !/^(tbd|not set)$/i.test(event.endDate.trim())
    ? event.endDate : legacyEnd;
  const end = endValue?.trim() ? calendarDate(endValue) : start;
  if (!start || !end || dayTime(start) > dayTime(end)) return false;
  return dayTime(day) >= dayTime(start) && dayTime(day) <= dayTime(end);
}

export function isTaskScheduledOnDay(task: { dueDate?: string; deadline?: string; startDate?: string }, day: Date): boolean {
  const value = [task.dueDate, task.deadline, task.startDate]
    .find((date) => date?.trim() && !/^(tbd|not set)$/i.test(date.trim()));
  const scheduled = calendarDate(value);
  return scheduled !== null && isSameCalendarDay(scheduled, day);
}
