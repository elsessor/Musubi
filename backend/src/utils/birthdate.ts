export function isValidBirthdate(value: string, today = new Date()): boolean {
  if (!value) return true;
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) return false;
  const [, yearText, monthText, dayText] = parts;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const parsed = new Date(0);
  parsed.setUTCFullYear(year, month - 1, day);
  parsed.setUTCHours(0, 0, 0, 0);
  const validCalendarDate = year > 0 && parsed.getUTCFullYear() === year && parsed.getUTCMonth() + 1 === month && parsed.getUTCDate() === day;
  const currentDate = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return validCalendarDate && parsed.getTime() <= currentDate;
}
