import assert from "node:assert/strict";
import test from "node:test";
import { isEventScheduledOnDay, isTaskScheduledOnDay, isSameCalendarDay } from "../../frontend/src/utils/calendarSchedule.js";

const day = (year: number, month: number, date: number) => new Date(year, month - 1, date);

test("subtasks match the complete deadline, never a day substring or another month/year", () => {
  const task = { dueDate: "Oct 18, 2026 at 02:30 PM" };
  assert.equal(isTaskScheduledOnDay(task, day(2026, 10, 18)), true);
  for (const date of [day(2026, 10, 1), day(2026, 10, 8), day(2026, 9, 18), day(2027, 10, 18)]) {
    assert.equal(isTaskScheduledOnDay(task, date), false);
  }
});

test("undated, incomplete and invalid schedules never receive invented calendar dates", () => {
  for (const value of ["", "TBD", "Not set", "Oct 8", "8", "invalid", "2026-02-30"]) {
    assert.equal(isTaskScheduledOnDay({ dueDate: value }, day(2026, 10, 8)), false);
    assert.equal(isEventScheduledOnDay({ startDate: value }, day(2026, 10, 8)), false);
  }
});

test("subtasks support saved ISO dates, deadline fields and start-only schedules", () => {
  for (const task of [{ dueDate: "2026-10-08" }, { dueDate: "TBD", deadline: "Oct 8, 2026" }, { startDate: "2026-10-08" }]) {
    assert.equal(isTaskScheduledOnDay(task, day(2026, 10, 8)), true);
  }
  assert.equal(isTaskScheduledOnDay({ startDate: "2026-10-07", dueDate: "2026-10-08" }, day(2026, 10, 7)), false);
});

test("events occupy only their saved inclusive range across month and year boundaries", () => {
  const event = { startDate: "Dec 31, 2026 at 09:00 AM", endDate: "Jan 2, 2027" };
  for (const date of [day(2026, 12, 31), day(2027, 1, 1), day(2027, 1, 2)]) {
    assert.equal(isEventScheduledOnDay(event, date), true);
  }
  for (const date of [day(2026, 12, 30), day(2027, 1, 3), day(2026, 1, 1)]) {
    assert.equal(isEventScheduledOnDay(event, date), false);
  }
});

test("single-day and legacy event ranges work without inventing invalid endpoints", () => {
  assert.equal(isEventScheduledOnDay({ startDate: "Oct 8, 2026 at 09:00 AM" }, day(2026, 10, 8)), true);
  assert.equal(isEventScheduledOnDay({ startDate: "Oct 8, 2026 - Oct 10, 2026", endDate: "TBD" }, day(2026, 10, 9)), true);
  assert.equal(isEventScheduledOnDay({ startDate: "2026-10-08", endDate: "invalid" }, day(2026, 10, 8)), false);
  assert.equal(isEventScheduledOnDay({ startDate: "2026-10-09", endDate: "2026-10-08" }, day(2026, 10, 8)), false);
});

test("today highlighting compares the day, month and year and ignores time", () => {
  const today = new Date(2026, 9, 8, 15, 30);
  assert.equal(isSameCalendarDay(day(2026, 10, 8), today), true);
  assert.equal(isSameCalendarDay(day(2026, 9, 8), today), false);
  assert.equal(isSameCalendarDay(day(2027, 10, 8), today), false);
});
