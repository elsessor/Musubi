import assert from "node:assert/strict";
import test from "node:test";
import { getEventMemberCount } from "../src/utils/eventMembers.js";
import { getEventMemberCount as frontendCount } from "../../frontend/src/utils/eventMembers.js";

test("events without assigned tasks have zero members", () => {
  for (const tasks of [undefined, null, {}, [], [null, {}, { assignee: { initials: "UA" } }],
    [{ assignedMemberName: "Unassigned" }, { assignee: { name: "TBD" } }, { assigneeName: "Not Assigned" }]]) {
    assert.equal(getEventMemberCount(tasks), 0);
    assert.equal(frontendCount(tasks), 0);
  }
});

test("many tasks assigned to the same member count that member once", () => {
  const tasks = [
    { assignedMemberUID: "member-1", assignedMemberName: "Hans" },
    { assignedMemberUID: "member-1", assignedMemberName: "Hans", status: "Completed" },
    { assignedMemberUID: "member-2", assignedMemberName: "Carl" },
    { assignedMemberUID: "member-3" },
    { assignedMemberUID: "member-2", status: "In Progress" },
    { assignedMemberUID: "member-1" }
  ];
  assert.equal(getEventMemberCount(tasks), 3);
  assert.equal(frontendCount(tasks), 3);
});

test("distinct IDs remain distinct even when display names match", () => {
  const tasks = [
    { assignedMemberUID: "first", assignedMemberName: "Hans Ernie San Miguel" },
    { assignedMemberUID: "second", assignedMemberName: "Hans Ernie San Miguel" }
  ];
  assert.equal(getEventMemberCount(tasks), 2);
  assert.equal(frontendCount(tasks), 2);
});

test("legacy names are normalized and do not duplicate identified assignees", () => {
  const tasks = [
    { assignedMemberUID: "first", assignedMemberName: "Hans Ernie San Miguel" },
    { assignee: { name: " hans  ernie san miguel " } },
    { assigneeName: "Carl Valencia" },
    { assignedMemberName: "CARL VALENCIA" },
    { assignee: { name: "Unassigned" } }
  ];
  assert.equal(getEventMemberCount(tasks), 2);
  assert.equal(frontendCount(tasks), 2);
  assert.equal(getEventMemberCount([...tasks].reverse()), 2);
});

test("assignment changes and deleting a member's last task change the count", () => {
  const tasks = [{ assignedMemberUID: "first" }, { assignedMemberUID: "first" }];
  const reassigned = [tasks[0], { ...tasks[1], assignedMemberUID: "second" }];
  assert.equal(getEventMemberCount(tasks), 1);
  assert.equal(getEventMemberCount(reassigned), 2);
  assert.equal(getEventMemberCount(reassigned.slice(0, 1)), 1);
  assert.equal(getEventMemberCount([]), 0);
  for (const fixture of [tasks, reassigned, reassigned.slice(0, 1), []]) {
    assert.equal(frontendCount(fixture), getEventMemberCount(fixture));
  }
});
