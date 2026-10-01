export function parseDateInput(value: string) {
  if (!value.trim()) return Number.NaN;
  // MiniCalendarPicker uses "Jun 1, 2026 at 09:00 AM".
  const normalized = value.replace(/\s+at\s+/i, " ");
  const timestamp = new Date(normalized).getTime();
  return timestamp;
}

export function isStartAfterEnd(start: string, end: string) {
  const startTime = parseDateInput(start);
  const endTime = parseDateInput(end);
  return Number.isFinite(startTime) && Number.isFinite(endTime) && startTime > endTime;
}
