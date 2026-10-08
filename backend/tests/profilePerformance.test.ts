import assert from "node:assert/strict";
import test from "node:test";
import { recordTaskPerformance } from "../src/utils/taskPerformance.js";
import { getAssignedProfileTasks, getProfileMetrics, getProfileTaskStatus, type ProfileTask } from "../../frontend/src/utils/profileMetrics.js";
import type { Event } from "../../frontend/src/components/events/types.js";

const leader = { uid: "leader", fullName: "Team Leader", isLeader: true };
const member = { uid: "member", fullName: "Team Member", isLeader: false };
const now = new Date(2026, 9, 8, 12);
const recordedTime = now.toISOString();
const task = (overrides: Partial<ProfileTask> = {}): ProfileTask => ({
  id: "task", title: "Assigned work", status: "To Do", priority: "Medium", dueDate: "2026-10-08",
  assignedMemberUID: "member", assignedMemberName: "Team Member",
  assignee: { initials: "TM", color: "bg-blue-500", name: "Team Member" },
  eventId: "event", eventTitle: "Organization event", ...overrides
});

test("assignment uses UID first and only falls back to names for legacy tasks", () => {
  const event = { id: "event", title: "Event", tasks: [
    task(), task({ id: "other", assignedMemberUID: "someone-else" }),
    task({ id: "legacy", assignedMemberUID: null }), task({ id: "unassigned", assignedMemberUID: null, assignedMemberName: null, assignee: { initials: "", color: "" } })
  ] } as Event;
  assert.deepEqual(getAssignedProfileTasks([event], "member", "Team Member").map((item) => item.id), ["task", "legacy"]);
  assert.deepEqual(getAssignedProfileTasks([event], "", "Team Member"), []);
});

test("empty metrics have zero counts and unknown scores rather than invented percentages", () => {
  const metrics = getProfileMetrics([], now);
  assert.equal(metrics.workload, 0);
  assert.equal(metrics.averageMatch, null);
  assert.equal(metrics.reliability, null);
  assert.equal(metrics.rating, null);
  assert.equal(metrics.ratingCount, 0);
});

test("scores use unfinished tasks, valid saved matches, and known completion deadlines", () => {
  const metrics = getProfileMetrics([
    task({ matchPercentage: 0 }), task({ status: "In Review", matchPercentage: 100 }),
    task({ status: "Completed", completedAt: new Date(2026, 9, 8, 18).toISOString() }),
    task({ status: "Done", completedAt: new Date(2026, 9, 9, 1).toISOString(), matchPercentage: 999 }),
    task({ status: "Completed", completedAt: null }), task({ status: "Cancelled" })
  ], now);
  assert.equal(metrics.workload, 40);
  assert.equal(metrics.averageMatch, 50);
  assert.equal(metrics.reliability, 50);
  assert.equal(metrics.reliabilitySampleCount, 2);
  assert.equal(metrics.counts.done, 3);
  assert.equal(metrics.counts.cancelled, 1);
  assert.equal(getProfileMetrics(Array.from({ length: 9 }, () => task()), now).workload, 100);
  assert.equal(getProfileTaskStatus(task({ status: "  DONE " })), "done");
  assert.equal(getProfileTaskStatus(task({ status: "Blocked" })), "active");
});

test("monthly chart includes days 29–31 and excludes undated and previous-month completions", () => {
  const metrics = getProfileMetrics([
    task({ status: "Done", completedAt: new Date(2026, 9, 31, 12).toISOString() }),
    task({ status: "Done", completedAt: new Date(2026, 8, 30, 12).toISOString() }),
    task({ status: "Done", completedAt: null }), task({ status: "Done", completedAt: "invalid" })
  ], now);
  assert.deepEqual(metrics.weeks.map((week) => week.count), [0, 0, 0, 0, 1]);
  assert.equal(metrics.undatedCompletions, 2);
  assert.equal(getProfileMetrics([], new Date(2026, 1, 8)).weeks.length, 4);
});

test("reliability handles calendar-picker time strings and a valid legacy deadline", () => {
  const metrics = getProfileMetrics([
    task({ status: "Done", dueDate: "Oct 8, 2026 at 05:30 PM", completedAt: new Date(2026, 9, 8, 17, 0).toISOString() }),
    task({ status: "Done", dueDate: "Oct 8, 2026 at 05:30 PM", completedAt: new Date(2026, 9, 8, 18, 0).toISOString() }),
    task({ status: "Done", dueDate: "TBD", deadline: "2026-10-08", completedAt: new Date(2026, 9, 8, 23, 0).toISOString() })
  ], now);
  assert.equal(metrics.reliabilitySampleCount, 3);
  assert.equal(metrics.reliability, 67);
});

test("rating averages only recorded reviews on completed tasks", () => {
  const saved = { reviewerUID: "leader", reviewedAt: recordedTime };
  const metrics = getProfileMetrics([
    task({ status: "Done", performanceReview: { ...saved, rating: 5 } }),
    task({ status: "Done", performanceReview: { ...saved, rating: 4 } }),
    task({ status: "In Progress", performanceReview: { ...saved, rating: 1 } }),
    task({ status: "Done", performanceReview: { rating: 5 } })
  ], now);
  assert.equal(metrics.rating, 4.5);
  assert.equal(metrics.ratingCount, 2);
});

test("server records completion transitions, preserves history and leaves legacy completions undated", () => {
  const original = task();
  const done = recordTaskPerformance([{ ...original, status: "Completed", completedAt: "forged" }], [original], member, recordedTime)[0];
  assert.equal(done.completedAt, recordedTime);
  assert.equal(recordTaskPerformance([done], [done], leader, "later")[0].completedAt, recordedTime);
  assert.equal(recordTaskPerformance([{ ...done, status: "To Do" }], [done], member, "later")[0].completedAt, null);
  const legacy = task({ status: "Completed" });
  assert.equal(recordTaskPerformance([{ ...legacy, completedAt: recordedTime }], [legacy], leader)[0].completedAt, null);
});

test("leader reviews record attribution; member attempts cannot forge ratings", () => {
  const original = task({ status: "Done", completedAt: recordedTime });
  const reviewed = recordTaskPerformance([{ ...original, performanceReview: { rating: 4, reviewerUID: "forged" } }], [original], leader, recordedTime)[0];
  assert.deepEqual(reviewed.performanceReview, { rating: 4, reviewerUID: "leader", reviewedAt: recordedTime });
  assert.deepEqual(recordTaskPerformance([{ ...reviewed, performanceReview: { rating: 5 } }], [reviewed], member)[0].performanceReview, reviewed.performanceReview);
  assert.equal(recordTaskPerformance([{ ...original, performanceReview: { rating: 5 } }], [original], member)[0].performanceReview, null);
  assert.equal(recordTaskPerformance([{ ...reviewed, status: "In Progress" }], [reviewed], leader)[0].performanceReview, null);
});

test("self-reviews and invalid ratings are rejected; reassignment clears stale reviews", () => {
  const original = task({ status: "Completed" });
  const reviewed = recordTaskPerformance([{ ...original, performanceReview: { rating: 5 } }], [original], leader, recordedTime)[0];
  assert.equal(recordTaskPerformance([{ ...reviewed, assignedMemberUID: "another" }], [reviewed], leader)[0].performanceReview, null);
  assert.throws(() => recordTaskPerformance([{ ...original, assignedMemberUID: "leader", performanceReview: { rating: 5 } }], [original], leader), /cannot rate your own/);
  assert.throws(() => recordTaskPerformance([{ ...original, performanceReview: { rating: 6 } }], [original], leader), /between 1 and 5/);
  assert.throws(() => recordTaskPerformance([{ ...original, performanceReview: { rating: 4.5 } }], [original], leader), /between 1 and 5/);
});
