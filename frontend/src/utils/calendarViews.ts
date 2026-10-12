export type CalendarPeriod = "day" | "week" | "month" | "year" | "schedule" | "four-days";

export type CalendarDisplayOptions = {
  showWeekends: boolean;
  showCancelled: boolean;
  showCompleted: boolean;
  showGoogleCalendar?: boolean;
};

export const CALENDAR_PERIODS: { value: CalendarPeriod; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "schedule", label: "Schedule" },
  { value: "four-days", label: "4 days" }
];

export function addCalendarDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function isCalendarWeekend(date: Date): boolean {
  return date.getDay() === 0 || date.getDay() === 6;
}

export function getCalendarDates(date: Date, period: CalendarPeriod, showWeekends = true): Date[] {
  if (period === "day") return [addCalendarDays(date, 0)];
  let start = addCalendarDays(date, 0);
  let length = period === "schedule" ? 30 : period === "four-days" ? 4 : 7;
  if (period === "month") {
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    start = addCalendarDays(first, -first.getDay());
    length = Math.ceil((first.getDay() + new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()) / 7) * 7;
  } else if (period === "week") {
    start = addCalendarDays(date, -date.getDay());
  } else if (period === "year") {
    start = new Date(date.getFullYear(), 0, 1);
    length = (new Date(date.getFullYear() + 1, 0, 1).getTime() - start.getTime()) / 86_400_000;
    length = Math.round(length);
  }
  const days: Date[] = [];
  for (let offset = 0; period === "four-days" ? days.length < 4 : offset < length; offset++) {
    const day = addCalendarDays(start, offset);
    if (showWeekends || !isCalendarWeekend(day)) days.push(day);
  }
  return days;
}

export function moveCalendarDate(date: Date, period: CalendarPeriod, direction: -1 | 1, showWeekends = true): Date {
  if (period === "month") return new Date(date.getFullYear(), date.getMonth() + direction, 1);
  if (period === "year") return new Date(date.getFullYear() + direction, 0, 1);
  if (period === "week") return addCalendarDays(date, 7 * direction);
  if (period === "schedule") return addCalendarDays(date, 30 * direction);
  let next = addCalendarDays(date, 0);
  const steps = period === "four-days" ? 4 : 1;
  for (let i = 0; i < steps; i++) {
    do { next = addCalendarDays(next, direction); }
    while (!showWeekends && isCalendarWeekend(next));
  }
  return next;
}

export function isCalendarItemVisible(status: string, options: CalendarDisplayOptions): boolean {
  const normalized = status.trim().toLowerCase();
  if (options.showGoogleCalendar === false && normalized === "google calendar") return false;
  if (!options.showCompleted && ["completed", "done"].includes(normalized)) return false;
  if (!options.showCancelled && ["cancelled", "canceled", "declined"].includes(normalized)) return false;
  return true;
}

export function getCalendarHeading(date: Date, period: CalendarPeriod, showWeekends = true): string {
  if (period === "year") return String(date.getFullYear());
  if (period === "month") return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  if (period === "day") return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const days = getCalendarDates(date, period, showWeekends);
  const end = days[days.length - 1];
  const startLabel = days[0].toLocaleDateString("en-US", { month: "short", day: "numeric", ...(days[0].getFullYear() !== end.getFullYear() ? { year: "numeric" } : {}) });
  return `${startLabel} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}
