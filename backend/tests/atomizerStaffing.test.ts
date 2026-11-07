import assert from "node:assert/strict";
import test from "node:test";
import { delegateSubtasksHeuristically } from "../../frontend/src/utils/heuristicDelegation.js";

const members = Array.from({ length: 6 }, (_, index) => ({
  id: `member-${index}`, name: `Member ${index}`, skills: [], activeTasksCount: 0
})) as Parameters<typeof delegateSubtasksHeuristically>[1];
const tasks = Array.from({ length: 8 }, (_, index) => ({
  id: `task-${index}`, title: `Task ${index}`, description: "",
  assigneeName: members[index % 6].name, requiredSkills: [],
  estimatedDays: 1, isLeaderOnly: false, isAiGenerated: true, priority: "Medium"
})) as Parameters<typeof delegateSubtasksHeuristically>[0];

test("four available members limits all eight assignments in a six-member organization", () => {
  const assigned = delegateSubtasksHeuristically(tasks, members, 4);
  assert.equal(assigned.length, 8);
  assert.equal(new Set(assigned.map((task) => task.assignedMemberUID)).size, 4);
  assert.ok(assigned.every((task) => task.assignedMemberUID));
  const pool = members.filter((member) => assigned.some((task) => task.assignedMemberUID === member.id));
  const reassigned = delegateSubtasksHeuristically(tasks, pool);
  assert.ok(reassigned.every((task) => pool.some((member) => member.id === task.assignedMemberUID)));
});

test("one available member owns all tasks; no capacity leaves tasks unassigned", () => {
  assert.equal(new Set(delegateSubtasksHeuristically(tasks, members, 1).map((task) => task.assignedMemberUID)).size, 1);
  assert.ok(delegateSubtasksHeuristically(tasks, members, 0).every((task) => task.assignedMemberUID === null && task.assigneeName === "Unassigned"));
});
