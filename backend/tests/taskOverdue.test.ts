import assert from "node:assert/strict";
import test from "node:test";
import * as backend from "../src/utils/taskTiming.js";
import * as frontend from "../../frontend/src/utils/taskTiming.js";
import { recordTaskPerformance } from "../src/utils/taskPerformance.js";
import { applyTaskStatusUpdate, assertCanContributeTask } from "../src/utils/taskPermissions.js";
import { memberForViewer } from "../src/utils/profileAccess.js";
import { getProfileMetrics } from "../../frontend/src/utils/profileMetrics.js";

const actor = { uid: "leader", fullName: "Leader", isLeader: true };
const original = { id: "task", title: "Budget", status: "To Do", dueDate: "2026-10-12", assignedMemberUID: "member", assignee: { initials: "M", color: "blue" }, priority: "Medium" };

test("deadline calculation is identical in the browser and server, with date-only deadlines ending the Manila day", () => {
  for (const utility of [frontend, backend]) {
    assert.equal(utility.parseTaskDeadline("2026-10-12")?.toISOString(), "2026-10-12T15:59:59.999Z");
    assert.equal(utility.parseTaskDeadline("10/12/2026")?.toISOString(), "2026-10-12T15:59:59.999Z");
    assert.equal(utility.parseTaskDeadline("Oct 12, 2026 at 05:30 PM")?.toISOString(), "2026-10-12T09:30:00.000Z");
    assert.equal(utility.parseTaskDeadline("2026-10-12T17:30:00")?.toISOString(), "2026-10-12T09:30:00.000Z");
    assert.equal(utility.parseTaskDeadline("2026-10-12T17:30:00Z")?.toISOString(), "2026-10-12T17:30:00.000Z");
    for (const missing of ["", "TBD", "No deadline", "not set", "invalid", "2026-02-30"]) assert.equal(utility.parseTaskDeadline(missing), null);
    assert.equal(utility.getTaskTiming(original, new Date("2026-10-12T15:59:59.999Z")).kind, "due-today");
    assert.equal(utility.getTaskTiming(original, new Date("2026-10-12T16:00:00Z")).kind, "overdue");
  }
});

test("today and tomorrow use calendar days, timed deadlines expire exactly, and blockers remain visible", () => {
  const today = new Date("2026-10-11T16:00:00Z");
  assert.equal(backend.getTaskTiming(original, today).label, "Due today");
  assert.equal(backend.getTaskTiming({ ...original, dueDate: "2026-10-13" }, today).label, "Due tomorrow");
  assert.equal(backend.getTaskTiming({ ...original, dueDate: "2026-10-14" }, today).label, "Due in 2 days");
  const timed = { ...original, dueDate: "Oct 12, 2026 at 09:00 AM" };
  assert.equal(backend.getTaskTiming(timed, new Date("2026-10-12T01:00:00Z")).kind, "due-today");
  const overdue = backend.getTaskTiming({ ...timed, blockedBy: 1, blockedByTaskTitles: ["Approval"] }, new Date("2026-10-12T01:00:01Z"));
  assert.match(overdue.label, /Overdue · Blocked/);
  assert.equal(timed.status, "To Do");
});

test("undated, review, completed, cancelled and archived tasks never generate deadline reminders", () => {
  const now = new Date("2026-10-15T00:00:00Z");
  for (const task of [{ ...original, dueDate: "" }, ...["In Review", "Completed", "Done", "Cancelled", "canceled", "Archived"].map(status => ({ ...original, status })), { ...original, archivedAt: now.toISOString() }]) {
    assert.equal(backend.getTaskReminder(task, now), null);
  }
  assert.equal(backend.getTaskTiming({ ...original, dueDate: "" }, now).label, "No deadline");
  assert.equal(backend.getTaskTiming({ ...original, status: "In Review" }, now).label, "Awaiting review");
});

test("server submission time and deadline snapshots protect an on-time member from delayed review and later schedule edits", () => {
  const submitted = recordTaskPerformance([{ ...original, status: "In Review", submittedAt: "forged", submittedDueDate: "forged" }], [original], { ...actor, isLeader: false }, "2026-10-12T10:00:00Z")[0];
  assert.equal(submitted.submittedAt, "2026-10-12T10:00:00Z");
  assert.equal(submitted.submittedDueDate, original.dueDate);
  const completed = recordTaskPerformance([{ ...submitted, status: "Completed", submittedAt: "forged" }], [submitted], actor, "2026-10-14T10:00:00Z")[0];
  assert.equal(completed.submittedAt, submitted.submittedAt);
  assert.equal(backend.getTaskTiming(completed).kind, "completed");
  const metrics = getProfileMetrics([{ ...completed, eventId: "event", eventTitle: "Event" } as any]);
  assert.equal(metrics.reliability, 100);
  const view = memberForViewer({ uid: "member", fullName: "Member", role: "Organization Member", organizationId: "org" }, "member", { organizationId: "org", fullName: "Member" }, [{ id: "event", title: "Event", tasks: [completed] }]);
  assert.equal("reliability" in view && view.reliability, "100%");
  const late = recordTaskPerformance([{ ...original, status: "In Review" }], [original], actor, "2026-10-13T00:00:00Z")[0];
  const lateDone = recordTaskPerformance([{ ...late, status: "Completed" }], [late], actor, "2026-10-14T00:00:00Z")[0];
  const extended = recordTaskPerformance([{ ...lateDone, dueDate: "2026-10-20", deadlineChangeReason: "Historical correction" }], [lateDone], actor)[0];
  assert.equal(backend.getTaskTiming(extended).label, "Completed late");
  const reopened = recordTaskPerformance([{ ...submitted, status: "In Progress" }], [submitted], actor)[0];
  assert.equal(reopened.submittedAt, null);
  assert.equal(reopened.submittedDueDate, null);
  assert.equal(recordTaskPerformance([{ ...reopened, status: "In Review" }], [reopened], actor, "2026-10-15T00:00:00Z")[0].submittedAt, "2026-10-15T00:00:00Z");
});

test("deadline changes save without a reason and record trusted reviewer/time/history, while preserving reminder delivery history", () => {
  for (const dueDate of ["2026-10-20", ""]) {
    const changed = recordTaskPerformance([{ ...original, dueDate }], [original], actor, "2026-10-13T00:00:00Z")[0];
    assert.deepEqual(changed.dueDateHistory, [{ from: original.dueDate, to: dueDate, changedBy: "leader", changedByUID: "leader", changedByName: "Leader", changedAt: "2026-10-13T00:00:00Z" }]);
  }
  const previous = { ...original, nudges: [{ nudgeUID: "legacy", sent: true }, { nudgeUID: "reserved", deadlineKey: "key", sent: true }] };
  const updated = recordTaskPerformance([{ ...previous, dueDate: "2026-10-20", deadlineChangeReason: "Waiting for approval", dueDateHistory: [{ reason: "forged" }] }], [previous], actor, "2026-10-13T00:00:00Z")[0];
  assert.deepEqual(updated.dueDateHistory, [{ from: original.dueDate, to: "2026-10-20", reason: "Waiting for approval", changedBy: "leader", changedByUID: "leader", changedByName: "Leader", changedAt: "2026-10-13T00:00:00Z" }]);
  assert.equal("deadlineChangeReason" in updated, false);
  assert.deepEqual(updated.nudges, [previous.nudges[1]]);
  const saved = recordTaskPerformance([{ ...previous, nudges: [] }], [previous], actor)[0];
  assert.deepEqual(saved.nudges, previous.nudges);
  const undated = recordTaskPerformance([{ ...original, status: "In Review", dueDate: "" }], [{ ...original, dueDate: "" }], actor)[0];
  assert.equal(backend.getTaskPerformanceDeadline({ ...undated, dueDate: "2026-10-20" }), null);
});

test("overdue work remains actionable, while only leaders can cancel or reopen cancelled work", () => {
  const member = { uid: "member", fullName: "Member", role: "Organization Member" as const, organizationId: "org" };
  assert.doesNotThrow(() => assertCanContributeTask(member, "org", original));
  assert.equal(applyTaskStatusUpdate(original, { status: "In Review" }, { tasks: [original] }, member).status, "In Review");
  for (const status of ["Cancelled", "canceled"]) assert.throws(() => applyTaskStatusUpdate(original, { status }, { customStatuses: [{ name: status }], tasks: [original] }, member), /Only leaders/);
  assert.throws(() => assertCanContributeTask(member, "org", { ...original, status: "Cancelled" }), /reopen/);
  assert.doesNotThrow(() => assertCanContributeTask({ ...member, role: "Student Leader" }, "org", { ...original, status: "Cancelled" }));
  assert.throws(() => recordTaskPerformance([{ ...original, status: "Cancelled" }], [{ ...original, status: "Completed" }], actor), /cannot be cancelled/);
});
