import assert from "node:assert/strict";
import test from "node:test";
import { getCalendarDates, getCalendarHeading, isCalendarItemVisible, moveCalendarDate, type CalendarDisplayOptions } from "../../frontend/src/utils/calendarViews.js";

const date = (year: number, month: number, day: number) => new Date(year, month - 1, day);
const key = (day: Date) => `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
const options: CalendarDisplayOptions = { showWeekends: true, showCancelled: true, showCompleted: true };

test("calendar periods provide one day, a full week, four days, and a 30-day schedule", () => {
  const anchor = date(2026, 10, 14);
  assert.deepEqual(getCalendarDates(anchor, "day").map(key), ["2026-10-14"]);
  const week = getCalendarDates(anchor, "week");
  assert.equal(week.length, 7);
  assert.equal(key(week[0]), "2026-10-11");
  assert.equal(key(week[6]), "2026-10-17");
  assert.deepEqual(getCalendarDates(date(2026, 12, 30), "four-days").map(key), ["2026-12-30", "2026-12-31", "2027-1-1", "2027-1-2"]);
  const schedule = getCalendarDates(date(2026, 12, 15), "schedule");
  assert.equal(schedule.length, 30);
  assert.equal(key(schedule[29]), "2027-1-13");
});

test("month grids keep complete weeks, including leap days and adjacent-month padding", () => {
  const august = getCalendarDates(date(2026, 8, 1), "month");
  assert.equal(august.length, 42);
  assert.equal(key(august[0]), "2026-7-26");
  assert.equal(key(august[41]), "2026-9-5");
  const leapMonth = getCalendarDates(date(2028, 2, 1), "month");
  assert.equal(leapMonth.length, 35);
  assert.ok(leapMonth.some((day) => key(day) === "2028-2-29"));
  assert.equal(getCalendarDates(date(2028, 1, 1), "year").length, 366);
  assert.equal(getCalendarDates(date(2027, 1, 1), "year").length, 365);
});

test("hiding weekends keeps five-column month/week grids and four working days", () => {
  const week = getCalendarDates(date(2026, 10, 11), "week", false);
  assert.deepEqual(week.map((day) => day.getDay()), [1, 2, 3, 4, 5]);
  const month = getCalendarDates(date(2026, 8, 1), "month", false);
  assert.equal(month.length, 30);
  assert.ok(month.every((day) => day.getDay() !== 0 && day.getDay() !== 6));
  assert.deepEqual(getCalendarDates(date(2026, 10, 9), "four-days", false).map(key), ["2026-10-9", "2026-10-12", "2026-10-13", "2026-10-14"]);
});

test("navigation uses the selected period and avoids overflowing short months", () => {
  assert.equal(key(moveCalendarDate(date(2026, 12, 31), "day", 1)), "2027-1-1");
  assert.equal(key(moveCalendarDate(date(2027, 1, 1), "day", -1)), "2026-12-31");
  assert.equal(key(moveCalendarDate(date(2026, 12, 28), "week", 1)), "2027-1-4");
  assert.equal(key(moveCalendarDate(date(2026, 1, 31), "month", 1)), "2026-2-1");
  assert.equal(key(moveCalendarDate(date(2026, 1, 1), "month", -1)), "2025-12-1");
  assert.equal(key(moveCalendarDate(date(2028, 2, 29), "year", 1)), "2029-1-1");
  assert.equal(key(moveCalendarDate(date(2026, 12, 15), "schedule", 1)), "2027-1-14");
  assert.equal(key(moveCalendarDate(date(2026, 10, 9), "four-days", 1, false)), "2026-10-15");
  assert.equal(key(moveCalendarDate(date(2026, 10, 15), "four-days", -1, false)), "2026-10-9");
  assert.equal(key(moveCalendarDate(date(2026, 10, 9), "day", 1, false)), "2026-10-12");
});

test("display switches hide completed and cancelled items while preserving custom statuses", () => {
  for (const status of ["Completed", " Done ", "Cancelled", "Canceled", "Declined", "Awaiting approval"]) {
    assert.equal(isCalendarItemVisible(status, options), true);
  }
  const hidden = { ...options, showCompleted: false, showCancelled: false };
  for (const status of ["Completed", " Done ", "Cancelled", "Canceled", "Declined"]) {
    assert.equal(isCalendarItemVisible(status, hidden), false);
  }
  assert.equal(isCalendarItemVisible("Awaiting approval", hidden), true);
  assert.equal(isCalendarItemVisible("Completed", { ...options, showCancelled: false }), true);
  assert.equal(isCalendarItemVisible("Cancelled", { ...options, showCompleted: false }), true);
});

test("headings identify the active period and include both years for crossing ranges", () => {
  assert.equal(getCalendarHeading(date(2026, 10, 11), "month"), "October 2026");
  assert.equal(getCalendarHeading(date(2026, 10, 11), "year"), "2026");
  assert.equal(getCalendarHeading(date(2026, 10, 11), "day"), "Oct 11, 2026");
  assert.equal(getCalendarHeading(date(2026, 12, 30), "four-days"), "Dec 30, 2026 – Jan 2, 2027");
  assert.equal(getCalendarHeading(date(2026, 10, 11), "week", false), "Oct 12 – Oct 16, 2026");
});
