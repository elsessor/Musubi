import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../src/utils/AppError.js";
import { applyTaskStatusUpdate } from "../src/utils/taskPermissions.js";
import * as backend from "../src/utils/taskDependencies.js";
import * as frontend from "../../frontend/src/utils/taskDependencies.js";

const task = (id: string, status = "To Do", dependsOnTaskIds: string[] = []) => ({ id, title: `Task ${id}`, status, dependsOnTaskIds });
const conflict = (error: unknown) => error instanceof AppError && error.statusCode === 409;

test("legacy tasks remain independent; ordering and stale blocked counts do not create prerequisites", () => {
  const tasks = [{ id: "a", status: "To Do", blockedBy: 99 }, { id: "b", status: "Completed" }];
  assert.equal(frontend.getTaskDependencyError(tasks), null);
  assert.equal(frontend.withTaskDependencyState(tasks)[0].blockedBy, 0);
  assert.equal(frontend.getTaskDependencyError([...tasks].reverse()), null);
});

test("blocked tasks cannot start, enter review, finish, or bypass checks through custom working stages", () => {
  const original = [task("a"), task("b", "To Do", ["a"])];
  for (const status of ["In Progress", "In Review", "Completed", "Done", "Awaiting Approval"]) {
    const tasks = [original[0], { ...original[1], status }];
    assert.match(frontend.getTaskDependencyError(tasks, original)!, /Task b is blocked.*Task a/);
    assert.throws(() => backend.assertTaskDependencies(tasks, original), conflict);
  }
  for (const status of ["To Do", "Pending", "Backlogs", "Blocked", "On Hold", "Cancelled"]) {
    assert.equal(frontend.getTaskDependencyError([original[0], { ...original[1], status }], original), null);
  }
});

test("all prerequisites must finish, recognizing Completed and Done case-insensitively", () => {
  const tasks = [task("a", " completed "), task("b"), task("c", "To Do", ["a", "b"])];
  assert.deepEqual(frontend.getBlockingDependencies(tasks[2], tasks).map((item) => item.id), ["b"]);
  assert.equal(frontend.withTaskDependencyState(tasks)[2].blockedBy, 1);
  tasks[1].status = "DONE";
  assert.equal(frontend.withTaskDependencyState(tasks)[2].blockedBy, 0);
  assert.equal(frontend.getTaskDependencyError([tasks[0], tasks[1], { ...tasks[2], status: "In Progress" }], tasks), null);
});

test("cancelled prerequisites do not satisfy completion requirements", () => {
  const tasks = [task("a", "Cancelled"), task("b", "Completed", ["a"])];
  assert.throws(() => backend.assertTaskDependencies(tasks), conflict);
});

test("self references, missing prerequisites, repeated links, malformed fields and duplicate IDs are rejected", () => {
  for (const tasks of [
    [task("a", "To Do", ["a"])], [task("a", "To Do", ["missing"])],
    [task("a"), task("b", "To Do", ["a", "a"])], [task("a"), task("a")],
    [{ ...task("a"), dependsOnTaskIds: "b" }], [{ ...task("a"), dependsOnTaskIds: [42] }],
    [{ ...task("a"), dependsOnTaskIds: null }], [{ ...task("a"), status: 42 }], [null]
  ]) {
    assert.throws(() => backend.assertTaskDependencies(tasks as any[]), conflict);
  }
});

test("two-task and longer circular chains are rejected even when all tasks are waiting", () => {
  for (const tasks of [
    [task("a", "To Do", ["b"]), task("b", "To Do", ["a"])],
    [task("a", "To Do", ["c"]), task("b", "To Do", ["a"]), task("c", "To Do", ["b"])]
  ]) assert.match(frontend.getTaskDependencyError(tasks)!, /circular chain/);
});

test("deleting a prerequisite requires removing its incoming links first", () => {
  const original = [task("a", "Completed"), task("b", "To Do", ["a"])];
  assert.throws(() => backend.assertTaskDependencies([original[1]], original), conflict);
  assert.doesNotThrow(() => backend.assertTaskDependencies([{ ...original[1], dependsOnTaskIds: [] }], original));
});

test("reopening a prerequisite requires returning working dependents to To Do first", () => {
  for (const status of ["In Progress", "Completed"]) {
    const original = [task("a", "Completed"), task("b", status, ["a"])];
    const reopened = [task("a"), original[1]];
    assert.throws(() => backend.assertTaskDependencies(reopened, original), conflict);
    assert.doesNotThrow(() => backend.assertTaskDependencies([reopened[0], { ...original[1], status: "To Do" }], original));
  }
});

test("a full event save cannot complete an unfinished chain all at once", () => {
  const original = [task("a"), task("b", "To Do", ["a"]), task("c", "To Do", ["b"])];
  assert.throws(() => backend.assertTaskDependencies(original.map((item) => ({ ...item, status: "Completed" })), original), conflict);
  const afterFirst = [{ ...original[0], status: "Completed" }, original[1], original[2]];
  assert.doesNotThrow(() => backend.assertTaskDependencies(afterFirst, original));
  const afterSecond = [afterFirst[0], { ...original[1], status: "Completed" }, original[2]];
  assert.doesNotThrow(() => backend.assertTaskDependencies(afterSecond, afterFirst));
});

test("the member status endpoint checks prerequisites and protects active dependents when reopening", () => {
  const tasks = [task("a"), task("b", "To Do", ["a"])];
  assert.throws(() => applyTaskStatusUpdate(tasks[1], { status: "Completed" }, { tasks }), conflict);
  assert.throws(() => applyTaskStatusUpdate(tasks[1], { status: "In Progress" }, { tasks }), conflict);
  tasks[0].status = "Done";
  const started = applyTaskStatusUpdate(tasks[1], { status: "In Progress" }, { tasks });
  assert.equal(started.status, "In Progress");
  assert.throws(() => applyTaskStatusUpdate(tasks[0], { status: "To Do" }, { tasks: [tasks[0], started] }), conflict);
});

test("blocked control state updates as prerequisites finish without changing dependent status", () => {
  const tasks = [task("a"), task("b", "To Do", ["a"])];
  let derived = frontend.withTaskDependencyState(tasks);
  assert.equal(frontend.isBlockedTaskStatus(derived[1], "Completed"), true);
  assert.equal(frontend.isBlockedTaskStatus(derived[1], "To Do"), false);
  tasks[0].status = "Completed";
  derived = frontend.withTaskDependencyState(tasks);
  assert.equal(frontend.isBlockedTaskStatus(derived[1], "In Progress"), false);
  assert.equal(derived[1].status, "To Do");
});

test("AI suggestions map to stable task IDs, ignoring forward, self, duplicate and invalid indexes", () => {
  const ids = ["budget", "materials", "venue"];
  assert.deepEqual(frontend.resolveSuggestedTaskDependencies(ids, [0, 1, 1, 2, 9, -1, 0.5, "0"], 2), ["budget", "materials"]);
  assert.deepEqual(frontend.resolveSuggestedTaskDependencies(ids, [0], 0), []);
  assert.deepEqual(frontend.resolveSuggestedTaskDependencies(ids, undefined, 1), []);
});

test("atomizer draft blockers resolve prerequisites from the existing event too", () => {
  const draft = [task("new", "To Do", ["existing"])];
  const existing = [task("existing", "Completed")];
  assert.equal(frontend.withTaskDependencyState(draft, [...existing, ...draft])[0].blockedBy, 0);
  existing[0].status = "To Do";
  assert.equal(frontend.withTaskDependencyState(draft, [...existing, ...draft])[0].blockedBy, 1);
});

test("frontend and backend agree on dependency validation and derived state", () => {
  const original = [task("a"), task("b", "To Do", ["a"])];
  const scenarios = [original, [task("a", "Done"), task("b", "In Progress", ["a"])],
    [task("a", "To Do", ["b"]), task("b", "To Do", ["a"])], [task("b", "To Do", ["missing"])]];
  for (const tasks of scenarios) {
    assert.equal(frontend.getTaskDependencyError(tasks, original), backend.getTaskDependencyError(tasks, original));
    assert.deepEqual(frontend.withTaskDependencyState(tasks), backend.withTaskDependencyState(tasks));
  }
});
