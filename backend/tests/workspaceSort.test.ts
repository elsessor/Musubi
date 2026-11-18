import assert from "node:assert/strict";
import test from "node:test";
import type { Event, Task } from "../../frontend/src/components/events/types.js";
import { eventStartTime, matchesEventSchedule, scheduleTime, sortCalendarItems, sortEvents, sortTasks } from "../../frontend/src/utils/workspaceSort.js";

const now = new Date("2026-11-18T04:00:00Z"); // Noon in Manila.
const event = (id: string, changes: Partial<Event> = {}): Event => ({ id, title: id, status: "Planning", startDate: "TBD", endDate: "TBD", description: "", tasks: [], memberCount: 0, progress: 0, ...changes });
const task = (id: string, changes: Partial<Task> = {}): Task => ({ id, title: id, status: "To Do", dueDate: "TBD", priority: "Medium", assignee: { initials: "", color: "" }, ...changes });
const ids = (items: { id: string }[]) => items.map((item) => item.id);

test("events place ongoing work first, then upcoming, undated, past and archived, with cancelled last", () => {
  const items = [
    event("archived", { status: "Archived", startDate: "2026-11-19" }),
    event("past-old", { status: "Active", startDate: "2026-10-01", endDate: "2026-10-05" }),
    event("upcoming-later", { startDate: "2026-12-01" }),
    event("cancelled", { status: "Cancelled", startDate: "2026-11-19" }),
    event("undated"),
    event("upcoming-next", { status: "Waiting for Approval", startDate: "Nov 19, 2026 at 09:00 AM" }),
    event("past-recent", { status: "Completed", startDate: "2026-11-17", endDate: "2026-11-17" }),
    event("ongoing", { status: "Active", startDate: "2026-11-18", endDate: "2026-11-18" })
  ];
  assert.deepEqual(ids(sortEvents(items, "upcoming", now)), ["ongoing", "upcoming-next", "upcoming-later", "undated", "past-recent", "past-old", "archived", "cancelled"]);
});

test("ongoing events sort by scheduled start date, while terminal statuses override future dates", () => {
  const items = [event("done", { status: "Completed", startDate: "2027-01-01" }), event("long", { startDate: "2026-11-16", endDate: "2026-11-20" }), event("short", { startDate: "2026-11-17", endDate: "2026-11-18" }), event("stored", { archivedAt: now.toISOString(), startDate: "2026-11-18" })];
  assert.deepEqual(ids(sortEvents(items, "upcoming", now)), ["long", "short", "done", "stored"]);
});

test("Latest event date reverses scheduled start dates rather than record creation dates", () => {
  const items = [event("new-record", { startDate: "2026-11-19", createdAt: "2026-11-18" }), event("far-future", { startDate: "2027-02-01", createdAt: "2026-10-01" }), event("no-date", { createdAt: "2026-11-20" }), event("next-month", { startDate: "2026-12-01" })];
  assert.deepEqual(ids(sortEvents(items, "latest", now)), ["far-future", "next-month", "new-record", "no-date"]);
  assert.deepEqual(ids(items), ["new-record", "far-future", "no-date", "next-month"]);
});

test("Upcoming and Ongoing filters use dates, not workflow names, and exclude terminal records", () => {
  const items = [event("future-active", { status: "Active", startDate: "2026-11-19" }), event("current-custom", { status: "Waiting for Approval", startDate: "2026-11-18" }), event("past-active", { status: "Active", startDate: "2026-11-17" }), event("future-done", { status: "Completed", startDate: "2026-11-19" }), event("future-cancelled", { status: "Cancelled", startDate: "2026-11-19" }), event("future-archived", { archivedAt: now.toISOString(), startDate: "2026-11-19" }), event("unknown"), event("reversed", { startDate: "2026-11-20", endDate: "2026-11-19" })];
  assert.deepEqual(ids(items.filter((item) => matchesEventSchedule(item, "upcoming", now))), ["future-active"]);
  assert.deepEqual(ids(items.filter((item) => matchesEventSchedule(item, "ongoing", now))), ["current-custom"]);
  assert.deepEqual(ids(items.filter((item) => matchesEventSchedule(item, "past", now))), ["past-active", "future-done"]);
  assert.equal(items.filter((item) => matchesEventSchedule(item, "all", now)).length, items.length);
});

test("date filters switch at the exact start and end boundaries in campus time", () => {
  const item = event("timed", { startDate: "Nov 18, 2026 at 01:00 PM", endDate: "Nov 18, 2026 at 02:00 PM" });
  assert.equal(matchesEventSchedule(item, "upcoming", new Date("2026-11-18T04:59:59Z")), true);
  assert.equal(matchesEventSchedule(item, "ongoing", new Date("2026-11-18T05:00:00Z")), true);
  assert.equal(matchesEventSchedule(item, "ongoing", new Date("2026-11-18T06:00:00Z")), true);
  assert.equal(matchesEventSchedule(item, "past", new Date("2026-11-18T06:00:01Z")), true);
});

test("schedule filters compose with workflow filters and any sort order", () => {
  const items = [event("later", { status: "Waiting for Approval", startDate: "2026-12-01" }), event("soon", { status: "Waiting for Approval", startDate: "2026-11-19" }), event("planning", { status: "Planning", startDate: "2026-11-20" })];
  const filtered = items.filter((item) => matchesEventSchedule(item, "upcoming", now) && item.status === "Waiting for Approval");
  assert.deepEqual(ids(sortEvents(filtered, "upcoming", now)), ["soon", "later"]);
  assert.deepEqual(ids(sortEvents(filtered, "latest", now)), ["later", "soon"]);
});

test("date-only events remain ongoing throughout the campus day, with legacy ranges supported", () => {
  const item = event("today", { startDate: "Nov 18, 2026 - Nov 20, 2026" });
  assert.equal(eventStartTime(item), Date.parse("2026-11-17T16:00:00Z"));
  const future = event("next", { startDate: "2026-11-21" });
  assert.deepEqual(ids(sortEvents([future, item], "upcoming", new Date("2026-11-20T15:59:59Z"))), ["today", "next"]);
  assert.deepEqual(ids(sortEvents([future, item], "upcoming", new Date("2026-11-20T16:00:00Z"))), ["next", "today"]);
});

test("recent event sorts use real metadata, keep unknown timestamps last and use creation time for untouched events", () => {
  const items = [event("unknown"), event("first", { createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-11-18T00:00:00Z" }), event("second", { createdAt: "2026-11-01T00:00:00Z" })];
  assert.deepEqual(ids(sortEvents(items, "created", now)), ["second", "first", "unknown"]);
  assert.deepEqual(ids(sortEvents(items, "updated", now)), ["first", "second", "unknown"]);
});

test("name sorts are natural, deterministic, and never mutate records or saved order", () => {
  const items = Object.freeze([Object.freeze(event("b", { title: "Event 10" })), Object.freeze(event("a", { title: "Event 2" })), Object.freeze(event("c", { title: "event 2" }))]);
  assert.deepEqual(ids(sortEvents(items, "name", now)), ["a", "c", "b"]);
  assert.deepEqual(ids(sortEvents([...items].reverse(), "name", now)), ["a", "c", "b"]);
  assert.deepEqual(items.map((item) => item.id), ["b", "a", "c"]);
});

test("task attention sorting agrees with overdue badges and keeps finished work at the bottom", () => {
  const items = [
    task("done", { status: "Done", dueDate: "2026-11-01", completedAt: now.toISOString() }),
    task("archived", { status: "In Progress", archivedAt: now.toISOString(), dueDate: "2026-10-01" }),
    task("undated"), task("future", { dueDate: "2026-11-20" }),
    task("today", { dueDate: "2026-11-18" }),
    task("review", { status: "In Review", dueDate: "2026-11-01" }),
    task("overdue", { dueDate: "2026-11-17" }),
    task("oldest-overdue", { dueDate: "2026-11-16", blockedBy: 1 })
  ];
  assert.deepEqual(ids(sortTasks(items, "attention", now)), ["oldest-overdue", "overdue", "review", "today", "future", "undated", "done", "archived"]);
});

test("date-only task deadlines use the end of the Manila day and fall back from TBD to deadline", () => {
  const items = [task("tomorrow", { dueDate: "2026-11-19" }), task("today", { deadline: "2026-11-18" }), task("morning", { dueDate: "Nov 18, 2026 at 09:00 AM" })];
  assert.deepEqual(ids(sortTasks(items, "attention", now)), ["morning", "today", "tomorrow"]);
  assert.equal(scheduleTime("2026-11-18", true), Date.parse("2026-11-18T15:59:59.999Z"));
});

test("priority sorting places critical unfinished tasks first, followed by high, medium and low", () => {
  const items = [task("low", { priority: "Low", dueDate: "2026-11-17" }), task("done-critical", { priority: "Critical", status: "Completed" }), task("medium"), task("high", { priority: "High" }), task("critical", { priority: "Critical" })];
  assert.deepEqual(ids(sortTasks(items, "priority", now)), ["critical", "high", "medium", "low", "done-critical"]);
});

test("task deadlines break ties by priority and name; archived status and cancelled tasks stay inactive", () => {
  const items = [task("z", { dueDate: "2026-11-20" }), task("b", { dueDate: "2026-11-20", priority: "Critical" }), task("a", { dueDate: "2026-11-20", priority: "Critical" }), task("stored", { status: "Archived", dueDate: "2026-10-01" }), task("cancelled", { status: "Cancelled", dueDate: "2026-11-01" })];
  assert.deepEqual(ids(sortTasks(items, "deadline", now)), ["a", "b", "z", "cancelled", "stored"]);
  assert.deepEqual(ids(sortTasks(items, "name", now)), ["a", "b", "cancelled", "stored", "z"]);
});

test("calendar entries sort by actual scheduled instants with deterministic ties and undated items last", () => {
  const items = [event("afternoon", { startDate: "Nov 18, 2026 at 02:00 PM" }), event("unknown"), event("morning", { startDate: "2026-11-18T09:00:00+08:00" }), event("all-day", { startDate: "2026-11-18" })];
  assert.deepEqual(ids(sortCalendarItems(items, eventStartTime, (item) => item.title, (item) => item.id)), ["all-day", "morning", "afternoon", "unknown"]);
  assert.deepEqual(ids(items), ["afternoon", "unknown", "morning", "all-day"]);
});

test("missing years and invalid dates never become invented sorting timestamps", () => {
  for (const value of ["TBD", "Not set", "", "Nov 18", "18", "invalid", "2026-02-30"]) assert.equal(scheduleTime(value), null);
  assert.equal(scheduleTime("Nov 18, 2026 at 09:00 AM"), scheduleTime("2026-11-18T01:00:00Z"));
});
