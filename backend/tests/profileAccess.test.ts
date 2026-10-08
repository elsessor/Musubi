import assert from "node:assert/strict";
import test from "node:test";
import { canViewMemberPerformance, memberForViewer, taskForViewer } from "../src/utils/profileAccess.js";
import type { TaskActor } from "../src/utils/taskPermissions.js";
import { getProfileReturnPath } from "../../frontend/src/utils/profileNavigation.js";

const member: TaskActor = { uid: "member", fullName: "Team Member", role: "Organization Member", organizationId: "org" };
const leader: TaskActor = { uid: "leader", fullName: "Team Leader", role: "Student Leader", organizationId: "org" };
const data = { fullName: "Other Member", role: "Organization Member", organizationId: "org", skills: ["Design"], email: "private@example.com", birthdate: "2000-01-01" };
const task = { id: "task", title: "Exhibit setup", assignedMemberUID: "other", assignedMemberName: "Other Member", status: "Completed", completedAt: "2026-10-08T10:00:00", dueDate: "2026-10-08", performanceReview: { rating: 4, reviewerUID: "leader" } };
const events = [{ id: "event", title: "Exhibit", tasks: [task, { ...task, id: "active", status: "Awaiting permits" }] }];

test("members receive only collaboration fields on another member's profile", () => {
  const profile = memberForViewer(member, "other", data, events);
  assert.equal(profile.name, "Other Member");
  assert.equal(profile.availability, "Available");
  assert.equal(memberForViewer(member, "other", { ...data, status: "On Leave" }, events).availability, "On Leave");
  for (const key of ["workload", "reliability", "assignedTasks", "email", "birthdate", "performanceReview"]) {
    assert.equal(key in profile, false, key);
  }
});

test("leaders and the profile owner receive saved assignments and real performance", () => {
  for (const viewer of [leader, { ...member, uid: "other", fullName: "Other Member" }]) {
    const profile = memberForViewer(viewer, "other", data, events);
    assert.ok("assignedTasks" in profile);
    assert.equal(profile.workload, 20);
    assert.equal(profile.reliability, "100%");
    assert.equal(profile.assignedTasks.length, 2);
    assert.equal(profile.assignedTasks[0].performanceReview.rating, 4);
    assert.equal(profile.assignedTasks[0].eventId, "event");
    assert.equal(profile.assignedTasks[0].completedAt, task.completedAt);
    assert.equal(profile.assignedTasks[0].dueDate, task.dueDate);
    assert.equal("email" in profile, false);
    assert.equal("birthdate" in profile, false);
  }
});

test("full profile navigation returns to the originating tab or committee", () => {
  assert.equal(getProfileReturnPath("/dashboard/organization?tab=members"), "/dashboard/organization?tab=members");
  assert.equal(getProfileReturnPath("/dashboard/organization?tab=committees"), "/dashboard/organization?tab=committees");
  assert.equal(getProfileReturnPath("/dashboard/organization/committees?committeeId=arts%20club"), "/dashboard/organization/committees?committeeId=arts+club");
  for (const source of [null, "https://example.com", "//example.com", "/sign-in", "/dashboard/organization?tab=unknown"]) {
    assert.equal(getProfileReturnPath(source), "/dashboard/organization?tab=members");
  }
});

test("organization membership scopes profile access, including student leaders", () => {
  assert.throws(() => memberForViewer(member, "other", { ...data, organizationId: "different-org" }, events));
  assert.throws(() => memberForViewer(leader, "other", { ...data, organizationId: "different-org" }, events));
  assert.equal(canViewMemberPerformance(member, "other"), false);
  assert.equal(canViewMemberPerformance(member, "member"), true);
});

test("task responses hide others' reviews while preserving shared task details", () => {
  const visible = taskForViewer(member, task);
  assert.equal("performanceReview" in visible, false);
  assert.equal(visible.title, task.title);
  assert.equal(visible.assignedMemberUID, "other");
  assert.equal(task.performanceReview.rating, 4);
  assert.equal(taskForViewer(leader, task).performanceReview.rating, 4);
  assert.equal(taskForViewer({ ...member, uid: "other" }, task).performanceReview.rating, 4);
});

test("review access uses UID first, supports exact legacy names, and has no made-up reliability", () => {
  assert.equal("performanceReview" in taskForViewer({ ...member, fullName: "Other Member" }, task), false);
  assert.equal(taskForViewer(member, { ...task, assignedMemberUID: null, assignedMemberName: " team member " }).performanceReview.rating, 4);
  const empty = memberForViewer(leader, "other", data, []);
  assert.ok("workload" in empty);
  assert.equal(empty.workload, 0);
  assert.equal(empty.reliability, "—");
});
