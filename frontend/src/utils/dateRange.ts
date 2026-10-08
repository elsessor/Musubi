const EMPTY_DATES = new Set(["", "tbd", "not set"]);

export function parseScheduleDate(value: unknown, endOfDay = false): Date | null {
  if (typeof value !== "string" || EMPTY_DATES.has(value.trim().toLowerCase())) return null;
  const normalized = value.trim().replace(/\s+at\s+/i, " ");
  const iso = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?$/i);
  const medium = normalized.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?$/i);
  if (iso || medium) {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const year = Number(iso ? iso[1] : medium![3]);
    const month = iso ? Number(iso[2]) - 1 : months.indexOf(medium![1].slice(0, 3).toLowerCase());
    const day = Number(iso ? iso[3] : medium![2]);
    const match = (iso || medium)!;
    let hour = match[4] ? Number(match[4]) : endOfDay ? 23 : 0;
    const minute = match[5] ? Number(match[5]) : endOfDay ? 59 : 0;
    if (match[6]) {
      if (hour < 1 || hour > 12) return null;
      hour = hour % 12 + (match[6].toUpperCase() === "PM" ? 12 : 0);
    }
    if (month < 0 || month > 11 || hour > 23 || minute > 59) return null;
    const date = new Date(year, month, day, hour, minute, !match[4] && endOfDay ? 59 : 0);
    return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : null;
  }
  const date = new Date(normalized);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function getDateRangeError(start: unknown, target: unknown, kind: "Event" | "Task" = "Event"): string | null {
  const present = (value: unknown) => value != null && !(typeof value === "string" && EMPTY_DATES.has(value.trim().toLowerCase()));
  const startDate = parseScheduleDate(start);
  const targetDate = parseScheduleDate(target, true);
  const targetLabel = kind === "Task" ? "deadline" : "target date";
  if (present(start) && !startDate) return `${kind} start date is invalid. Choose a valid date and time.`;
  if (present(target) && !targetDate) return `${kind} ${targetLabel} is invalid. Choose a valid date and time.`;
  if (startDate && targetDate && startDate > targetDate) return `${kind} ${targetLabel} must be on or after its start date and time.`;
  return null;
}
