import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";
import { AppError } from "../src/utils/AppError.js";
import { assertTaskDependencies, withTaskDependencyState } from "../src/utils/taskDependencies.js";
import { applyTaskStatusUpdate, assertCanContributeTask, assertCanEditEvent, assertEventAccess, isTaskLeader, preserveTaskAttachments, recordTaskArchives } from "../src/utils/taskPermissions.js";
import { recordTaskPerformance } from "../src/utils/taskPerformance.js";
import { getDateRangeError } from "../src/utils/dateRange.js";
import { getEventMemberCount } from "../src/utils/eventMembers.js";

// Execute the real service functions with an in-memory transactional Firestore.
// External auth, logging and Firebase setup are excluded so no live data is touched.
function loadFunctions(file: string, names: string[], context: Record<string, unknown>) {
  const filename = resolve(__dirname, "../src/services", file);
  const source = ts.createSourceFile(filename, readFileSync(filename, "utf8"), ts.ScriptTarget.Latest, true);
  const functions = source.statements.filter((node) => ts.isFunctionDeclaration(node) && names.includes(node.name?.text || "")).map((node) => node.getText(source)).join("\n");
  assert.equal(source.statements.filter((node) => ts.isFunctionDeclaration(node) && names.includes(node.name?.text || "")).length, names.length);
  const code = ts.transpileModule(functions, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  new Function("exports", ...Object.keys(context), code)(exports, ...Object.values(context));
  return exports;
}

const initialTasks = () => [
  { id: "budget", title: "Approve budget", status: "To Do", assignedMemberUID: "member" },
  { id: "materials", title: "Purchase materials", status: "To Do", assignedMemberUID: "member", dependsOnTaskIds: ["budget"] },
  { id: "venue", title: "Set up venue", status: "To Do", assignedMemberUID: "member", dependsOnTaskIds: ["materials"] }
];

function harness(tasks = initialTasks(), role = "Student Leader", beforeRead?: Record<string, any>, fields: Record<string, any> = {}) {
  let event: Record<string, any> = { id: "event", orgId: "org", title: "Campus event", status: "Active", tasks, startDate: "2070-10-01", endDate: "2070-10-31", ...fields };
  const writes: Record<string, any>[] = [];
  const snapshot = (data: Record<string, any>) => ({ exists: true, data: () => structuredClone(data) });
  const reference = { get: async () => snapshot(beforeRead || event) };
  const firestore = {
    collection: () => ({ doc: () => reference, add: async (data: Record<string, any>) => { writes.push(data); event = data; return { id: "new-event" }; } }),
    runTransaction: async (action: (transaction: any) => Promise<any>) => {
      let staged: Record<string, any> | undefined;
      const result = await action({ get: async () => snapshot(event), update: (_ref: unknown, data: Record<string, any>) => { staged = data; } });
      if (staged) { writes.push(staged); event = { ...event, ...staged }; }
      return result;
    }
  };
  const context = { firestore, firebaseAdmin: { firestore: { FieldValue: { serverTimestamp: () => "server-time" } } },
    getCurrentUser: async (uid: string) => ({ uid, fullName: "Task actor", role, organizationId: "org" }),
    AppError, assertTaskDependencies, withTaskDependencyState, applyTaskStatusUpdate, assertCanContributeTask,
    assertCanEditEvent, assertEventAccess, isTaskLeader, preserveTaskAttachments, recordTaskArchives, recordTaskPerformance, getDateRangeError, getEventMemberCount,
    writeAuditLog: () => {}, appCache: { deletePrefix: () => {} }
  };
  const auth = loadFunctions("auth.service.ts", ["createEventForUser", "updateEventForUser"], context);
  const status = loadFunctions("task.service.ts", ["getTask", "eventReference", "logTaskAction", "updateTaskStatusForUser"], context);
  return { ...auth, ...status, writes, event: () => structuredClone(event) };
}

test("event create and update reject equal task timestamps with a 400 error and no database writes", async () => {
  for (const dueDate of ["Oct 8, 2070 at 09:00 AM", "Oct 8, 2070 at 08:59 AM"]) {
    const app = harness();
    const tasks = initialTasks().map((task) => ({ ...task, startDate: "Oct 8, 2070 at 09:00 AM", dueDate }));
    const invalidSchedule = (error: any) => error instanceof AppError && error.statusCode === 400 && /deadline must be later than/.test(error.message);
    await assert.rejects(app.createEventForUser("leader", { title: "New event", orgId: "org", tasks, startDate: "2070-10-01", endDate: "2070-10-31" }), invalidSchedule);
    await assert.rejects(app.updateEventForUser("leader", "event", { tasks }), invalidSchedule);
    assert.equal(app.writes.length, 0);
    await app.updateEventForUser("leader", "event", { tasks: tasks.map((task) => ({ ...task, dueDate: "Oct 8, 2070 at 09:01 AM" })) });
    assert.equal(app.writes.length, 1);
    assert.equal(app.event().tasks[0].dueDate, "Oct 8, 2070 at 09:01 AM");
  }
});

test("leaders' full event saves and members' status requests reject blocked work without writing", async () => {
  const leader = harness();
  const tasks = initialTasks();
  tasks[1].status = "Completed";
  await assert.rejects(leader.updateEventForUser("leader", "event", { tasks }), /is blocked/);
  assert.equal(leader.writes.length, 0);
  const member = harness(initialTasks(), "Organization Member");
  for (const status of ["In Progress", "Completed"]) await assert.rejects(member.updateTaskStatusForUser("member", "event", "materials", { status }), /is blocked/);
  assert.equal(member.writes.length, 0);
});

test("completing prerequisites sequentially unlocks dependents and persists links and completion timestamps", async () => {
  const app = harness(initialTasks(), "Organization Member");
  await app.updateTaskStatusForUser("member", "event", "budget", { status: "Completed" });
  assert.equal(app.event().tasks[1].blockedBy, 0);
  assert.equal(app.event().tasks[1].status, "To Do");
  assert.equal(app.event().tasks[2].blockedBy, 1);
  await app.updateTaskStatusForUser("member", "event", "materials", { status: "In Progress" });
  const completed = await app.updateTaskStatusForUser("member", "event", "materials", { status: "Completed" });
  assert.ok(completed.task.completedAt);
  assert.deepEqual(completed.task.dependsOnTaskIds, ["budget"]);
  assert.equal(app.event().tasks[2].blockedBy, 0);
  await app.updateTaskStatusForUser("member", "event", "venue", { status: "Completed" });
  assert.equal(app.event().progress, 100);
});

test("full event saves preserve prerequisites omitted by older clients", async () => {
  const app = harness();
  const withoutLinks = initialTasks().map(({ dependsOnTaskIds: _ignored, ...task }) => task);
  await app.updateEventForUser("leader", "event", { tasks: withoutLinks });
  assert.deepEqual(app.event().tasks[1].dependsOnTaskIds, ["budget"]);
  withoutLinks[1].status = "Completed";
  await assert.rejects(app.updateEventForUser("leader", "event", { tasks: withoutLinks }), /is blocked/);
  assert.equal(app.writes.length, 1);
});

test("dependency validation uses the latest transaction snapshot, including a reopened prerequisite", async () => {
  const latest = initialTasks();
  const stale = { orgId: "org", tasks: latest.map((task) => task.id === "budget" ? { ...task, status: "Completed" } : task) };
  const app = harness(latest, "Student Leader", stale);
  const submitted = structuredClone(stale.tasks);
  submitted[1].status = "In Progress";
  await assert.rejects(app.updateEventForUser("leader", "event", { tasks: submitted }), /is blocked/);
  assert.equal(app.writes.length, 0);
});

test("event creation rejects invalid chains and saves valid draft prerequisites", async () => {
  const app = harness();
  const tasks = initialTasks();
  tasks[0].dependsOnTaskIds = ["venue"];
  await assert.rejects(app.createEventForUser("leader", { title: "New event", orgId: "org", tasks, startDate: "2070-10-01", endDate: "2070-10-31" }), /circular chain/);
  assert.equal(app.writes.length, 0);
  await app.createEventForUser("leader", { title: "New event", orgId: "org", tasks: initialTasks(), startDate: "2070-10-01", endDate: "2070-10-31" });
  assert.deepEqual(app.event().tasks[1].dependsOnTaskIds, ["budget"]);
  assert.equal(app.event().tasks[1].blockedBy, 1);
});

test("leaders cannot delete prerequisites or reopen them while dependent work is active", async () => {
  const tasks = initialTasks();
  tasks[0].status = "Completed";
  tasks[1].status = "In Progress";
  const app = harness(tasks);
  await assert.rejects(app.updateEventForUser("leader", "event", { tasks: tasks.slice(1) }), /prerequisite is missing/);
  await assert.rejects(app.updateTaskStatusForUser("leader", "event", "budget", { status: "To Do" }), /is blocked/);
  assert.equal(app.writes.length, 0);
});

test("members cannot modify prerequisites through either write endpoint", async () => {
  const app = harness(initialTasks(), "Organization Member");
  await assert.rejects(app.updateEventForUser("member", "event", { tasks: initialTasks() }), /Members can only update/);
  await assert.rejects(app.updateTaskStatusForUser("member", "event", "materials", { status: "To Do", dependsOnTaskIds: [] }), /only allows updating/);
  assert.equal(app.writes.length, 0);
});

test("event loading retains prerequisite IDs and recomputes stale blocked counts", () => {
  const service = loadFunctions("../../../frontend/src/services/events.service.ts", ["normalizeEvent"], { getEventMemberCount, withTaskDependencyState });
  const tasks = initialTasks();
  tasks[0].status = "Completed";
  const normalized = service.normalizeEvent("event", { tasks });
  assert.deepEqual(normalized.tasks[1].dependsOnTaskIds, ["budget"]);
  assert.equal(normalized.tasks[1].blockedBy, 0);
  assert.equal(normalized.tasks[2].blockedBy, 1);
});

test("event writes cannot fall back to direct database writes when authentication expires", async () => {
  let directWrites = 0;
  const services = loadFunctions("../../../frontend/src/services/events.service.ts", ["createEventFirestore", "updateEventFirestore"], {
    getValidToken: async () => "", getDateRangeError, getTaskDependencyError: () => null, getEventMemberCount,
    getFirebaseDb: () => ({}), addDoc: async () => { directWrites++; }, updateDoc: async () => { directWrites++; },
    API_BASE_URL: "http://unused.invalid"
  });
  await assert.rejects(services.createEventFirestore(null, "org", { title: "New", startDate: "2070-10-01", endDate: "2070-10-31", tasks: initialTasks() }), /Sign in again/);
  await assert.rejects(services.updateEventFirestore(null, "event", { tasks: initialTasks() }), /Sign in again/);
  assert.equal(directWrites, 0);
});

test("archiving and restoring retain completion, reviews, attachments and dependency links", async () => {
  const tasks = initialTasks().map((task) => ({ ...task, status: "Completed", completedAt: "2070-10-07T10:00:00Z",
    attachments: [{ id: "proof", type: "link", url: "https://example.com/proof" }],
    performanceReview: { rating: 4, feedback: "Well done", reviewerUID: "leader", reviewedAt: "2070-10-08T10:00:00Z" } }));
  const app = harness(tasks);
  await app.updateEventForUser("leader", "event", { tasks: tasks.map((task) => task.id === "budget" ? { ...task, archivedAt: "client-time", archivedByUID: "forged" } : task) });
  const archived = app.event().tasks[0];
  assert.ok(Number.isFinite(Date.parse(archived.archivedAt)));
  assert.equal(archived.archivedByUID, "leader");
  assert.equal(archived.status, "Completed");
  assert.equal(archived.completedAt, tasks[0].completedAt);
  assert.deepEqual(archived.attachments, tasks[0].attachments);
  assert.deepEqual(archived.performanceReview, tasks[0].performanceReview);
  assert.equal(app.event().tasks[1].blockedBy, 0);
  // Older clients that omit an archived record must not erase it or its history.
  await app.updateEventForUser("leader", "event", { tasks: app.event().tasks.slice(1) });
  assert.equal(app.event().tasks.length, 3);
  assert.deepEqual(app.event().tasks.find((task: any) => task.id === "budget").performanceReview, tasks[0].performanceReview);
  await app.updateEventForUser("leader", "event", { tasks: app.event().tasks.map((task: any) => ({ ...task, archivedAt: null })) });
  const restored = app.event().tasks.find((task: any) => task.id === "budget");
  assert.equal(restored.archivedAt, null);
  assert.equal(restored.archivedByUID, null);
  assert.equal(restored.status, "Completed");
  assert.deepEqual(restored.attachments, tasks[0].attachments);
});

test("unfinished prerequisites cannot be archived before active dependents, and restore rechecks the chain", async () => {
  const app = harness();
  await assert.rejects(app.updateEventForUser("leader", "event", { tasks: initialTasks().map((task) => ({ ...task, archivedAt: task.id === "budget" ? "archive" : null })) }), /archived prerequisite/);
  assert.equal(app.writes.length, 0);
  await app.updateEventForUser("leader", "event", { tasks: initialTasks().map((task) => ({ ...task, archivedAt: "archive" })) });
  assert.equal(app.event().tasks.length, 3);
  assert.equal(app.event().progress, 0);
  await assert.rejects(app.updateEventForUser("leader", "event", { tasks: app.event().tasks.map((task: any) => task.id === "materials" ? { ...task, archivedAt: null } : task) }), /archived prerequisite/);
  assert.equal(app.writes.length, 1);
});

test("archived subtasks reject member changes and forged restore attempts", async () => {
  const tasks = initialTasks().map((task) => ({ ...task, archivedAt: "2070-10-08T10:00:00Z" }));
  const member = harness(tasks, "Organization Member");
  await assert.rejects(member.updateTaskStatusForUser("member", "event", "budget", { status: "Completed" }), /Restore this archived subtask/);
  await assert.rejects(member.updateEventForUser("member", "event", { tasks: tasks.map((task) => ({ ...task, archivedAt: null })) }), /Members can only update/);
  assert.equal(member.writes.length, 0);
});

test("event archive and restore keep all subtasks and the prior event status", async () => {
  const app = harness(initialTasks(), "Student Leader", undefined, { status: "Planning" });
  await app.updateEventForUser("leader", "event", { status: "Archived", archivedAt: "forged", statusBeforeArchive: "Completed" });
  assert.equal(app.event().status, "Archived");
  assert.equal(app.event().statusBeforeArchive, "Planning");
  assert.equal(app.event().archivedByUID, "leader");
  assert.ok(Number.isFinite(Date.parse(app.event().archivedAt)));
  assert.deepEqual(app.event().tasks, initialTasks());
  await assert.rejects(app.updateTaskStatusForUser("leader", "event", "budget", { status: "Completed" }), /Restore this archived event/);
  await assert.rejects(app.updateEventForUser("leader", "event", { tasks: initialTasks() }), /Restore this archived event/);
  await app.updateEventForUser("leader", "event", { status: app.event().statusBeforeArchive });
  assert.equal(app.event().status, "Planning");
  assert.equal(app.event().archivedAt, null);
  assert.deepEqual(app.event().tasks, initialTasks());
});

test("archived event attachments remain downloadable to authorized organization members", async () => {
  const bytes = Buffer.from("Archived submission proof");
  const attachment = { id: "proof", type: "file", name: "proof.txt", size: bytes.length };
  const event = { orgId: "org", status: "Archived", tasks: [{ id: "task", archivedAt: "2070-10-08T10:00:00Z", attachments: [attachment] }] };
  const file = { get: async () => ({ data: () => ({ eventId: "event", taskId: "task", size: bytes.length, chunkCount: 1 }) }),
    collection: () => ({ orderBy: () => ({ get: async () => ({ size: 1, docs: [{ data: () => ({ bytes }) }] }) }) }) };
  const services = loadFunctions("task.service.ts", ["getTask", "eventReference", "downloadTaskFileForUser"], {
    getCurrentUser: async () => ({ uid: "member", role: "Organization Member", organizationId: "org", fullName: "Member" }),
    firestore: { collection: (name: string) => ({ doc: () => name === "taskFiles" ? file : { get: async () => ({ exists: true, data: () => event }) } }) },
    firebaseAdmin: { firestore: { FieldPath: { documentId: () => "id" } } }, assertEventAccess, AppError
  });
  const downloaded = await services.downloadTaskFileForUser("member", "event", "task", "proof");
  assert.deepEqual(downloaded.bytes, bytes);
  assert.equal(downloaded.attachment.name, "proof.txt");
});

test("malformed task records get a validation error before archive normalization", async () => {
  const app = harness();
  await assert.rejects(app.createEventForUser("leader", { title: "New", tasks: [null] }), (error: any) => error.statusCode === 400);
  assert.equal(app.writes.length, 0);
});
