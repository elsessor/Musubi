import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";
import { AppError } from "../src/utils/AppError.js";
import { getTaskClaimError } from "../src/utils/taskClaims.js";
import { getTaskClaimError as frontendClaimError } from "../../frontend/src/utils/taskClaims.js";
import { getEventMemberCount } from "../src/utils/eventMembers.js";
import { withTaskDependencyState } from "../src/utils/taskDependencies.js";
import { applyTaskStatusUpdate, assertCanContributeTask, isTaskLeader } from "../src/utils/taskPermissions.js";
import { recordTaskPerformance } from "../src/utils/taskPerformance.js";

// Type-only lookup: tests execute extracted functions with mocks, never Firebase.
type TaskTestServices = Pick<typeof import("../src/services/task.service.js"), "claimTaskForUser" | "updateTaskStatusForUser">;

const member = { uid: "member", fullName: "Member One", role: "Organization Member", organizationId: "org" };
const task = (fields: Record<string, any> = {}) => ({ id: "task", title: "Arrange chairs", status: "To Do", priority: "Medium",
  assignedMemberUID: null, assignedMemberName: null, assignee: { name: "", initials: "", color: "bg-slate-400" }, ...fields });

test("self-assignment policies agree on eligible work and deny assigned, restricted, terminal and cross-organization work", () => {
  const event = { orgId: "org", status: "Planning" };
  const denied: Array<Parameters<typeof getTaskClaimError>> = [
    [task(), { ...member, uid: "" }, event],
    [task(), { ...member, role: "Admin" }, event],
    [task(), { ...member, role: "Student Leader" }, event],
    [task(), { ...member, organizationId: "other" }, event],
    [task(), { ...member, organizationId: null }, event],
    [task(), member, { ...event, orgId: null }],
    ...["Archived", "Completed", "Cancelled", "Canceled"].map((status): Parameters<typeof getTaskClaimError> => [task(), member, { ...event, status }]),
    [task(), member, { ...event, archivedAt: "2070-10-01" }],
    ...["In Progress", "In Review", "Completed", "Pending", "Backlog"].map((status): Parameters<typeof getTaskClaimError> => [task({ status }), member, event]),
    [task({ archivedAt: "2070-10-01" }), member, event],
    [task({ isLeaderOnly: true }), member, event],
    [task({ priority: "Critical" }), member, event],
    [task({ assignedMemberUID: "other" }), member, event],
    [task({ assignedMemberName: "Legacy member" }), member, event],
    [task({ assigneeName: "Legacy member" }), member, event],
    [task({ assignedMemberName: "Unassigned", assignee: { name: "Already assigned" } }), member, event]
  ];
  for (const [item, actor, parent] of denied) {
    assert.ok(getTaskClaimError(item, actor, parent));
    assert.equal(frontendClaimError(item, actor, parent), getTaskClaimError(item, actor, parent));
  }
  for (const name of ["", "Unassigned", "No assignee", "not assigned", "—"]) {
    const item = task({ assignedMemberName: name, assignee: { name } });
    assert.equal(getTaskClaimError(item, member, event), null);
    assert.equal(frontendClaimError(item, member, event), null);
  }
  assert.equal(getTaskClaimError(task({ dependsOnTaskIds: ["unfinished"], blockedBy: 1 }), member, event), null);
});

// Execute actual service functions without credentials, live Firestore or email.
function harness(fields: Record<string, any> = {}, actorFields: Record<string, any> = {}) {
  let event = { orgId: "org", title: "Campus event", status: "Active", progress: 0, memberCount: 0, tasks: [task()], ...fields };
  let revision = 0;
  const users: Record<string, any> = { member: { ...member, ...actorFields }, other: { ...member, uid: "other", fullName: "Member Two" } };
  const writes: Record<string, any>[] = [], logs: Record<string, any>[] = [];
  let retries = 0;
  const firestore = {
    collection: (kind: string) => ({ doc: (id: string) => ({ kind, id }) }),
    runTransaction: async (action: (transaction: any) => Promise<any>) => {
      for (let attempt = 0; attempt < 5; attempt++) {
        const version = revision;
        let pending: Record<string, any> | undefined;
        const result = await action({
          get: async (ref: { kind: string; id: string }) => {
            const data = ref.kind === "users" ? users[ref.id] : event;
            return { exists: Boolean(data), data: () => structuredClone(data) };
          },
          update: (_ref: unknown, data: Record<string, any>) => { pending = data; }
        });
        // A competing commit forces a fresh snapshot, as Firestore does.
        if (version !== revision) { retries++; continue; }
        if (pending) { event = { ...event, ...pending }; writes.push(pending); revision++; }
        return result;
      }
      throw new Error("Too much contention");
    }
  };
  const filename = resolve(__dirname, "../src/services/task.service.ts");
  const ast = ts.createSourceFile(filename, readFileSync(filename, "utf8"), ts.ScriptTarget.Latest, true);
  const names = ["getTask", "eventReference", "logTaskAction", "claimTaskForUser", "updateTaskStatusForUser"];
  const source = ast.statements.filter(n => ts.isFunctionDeclaration(n) && names.includes(n.name?.text || "")).map(n => n.getText(ast)).join("\n");
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { firestore, AppError, getTaskClaimError, getEventMemberCount, withTaskDependencyState,
    applyTaskStatusUpdate, assertCanContributeTask, isTaskLeader, recordTaskPerformance,
    getCurrentUser: async (uid: string) => ({ uid, ...users[uid] }),
    firebaseAdmin: { firestore: { FieldValue: { serverTimestamp: () => "server-time" } } },
    writeAuditLog: (data: Record<string, any>) => { logs.push(data); }, appCache: { deletePrefix: () => {} } };
  const services = {} as TaskTestServices;
  new Function("exports", ...Object.keys(context), code)(services, ...Object.values(context));
  return { ...services, writes, logs, users, event: () => structuredClone(event), retries: () => retries };
}

test("self-assignment uses authenticated member identity, keeps To Do and updates counts and one audit entry", async () => {
  const app = harness({ tasks: [task({ attachments: [{ id: "proof" }], nudges: [{ sent: false }], startDate: "2070-10-01", dueDate: "2070-10-02" })] });
  const result = await app.claimTaskForUser("member", "event", "task");
  assert.equal(result.task.assignedMemberUID, "member");
  assert.equal(result.task.assignedMemberName, "Member One");
  assert.equal(result.task.assignee.initials, "MO");
  assert.equal(result.task.status, "To Do");
  assert.deepEqual(result.task.attachments, [{ id: "proof" }]);
  assert.deepEqual(result.task.nudges, [{ sent: false }]);
  assert.equal(result.task.dueDate, "2070-10-02");
  assert.equal(app.event().progress, 0);
  assert.equal(app.event().memberCount, 1);
  assert.equal(app.logs.length, 1);
  assert.equal(app.logs[0].action, "Claimed unassigned subtask");
  assert.equal(app.logs[0].actorUID, "member");
  assert.equal(app.logs[0].orgId, "org");
  await assert.rejects(app.claimTaskForUser("other", "event", "task"), (e: AppError) => e.statusCode === 409);
  assert.equal(app.writes.length, 1);
  assert.equal(app.logs.length, 1);
});

test("two simultaneous self-assignments produce one winner after retry and never overwrite the first assignment", async () => {
  const app = harness();
  const results = await Promise.allSettled([app.claimTaskForUser("member", "event", "task"), app.claimTaskForUser("other", "event", "task")]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(results.filter(r => r.status === "rejected").length, 1);
  const loser = results.find(r => r.status === "rejected") as PromiseRejectedResult;
  assert.equal(loser.reason.statusCode, 409);
  const winner = results.find(r => r.status === "fulfilled") as PromiseFulfilledResult<any>;
  assert.equal(app.event().tasks[0].assignedMemberUID, winner.value.task.assignedMemberUID);
  assert.equal(app.retries(), 1);
  assert.equal(app.writes.length, 1);
  assert.equal(app.logs.length, 1);
});

test("server refuses stale membership, restricted work and inactive events without writes or logs", async () => {
  for (const [fields, actor] of [
    [{}, { organizationId: "other" }], [{}, { role: "Student Leader" }], [{}, { role: "Admin" }],
    [{ tasks: [task({ isLeaderOnly: true })] }, {}], [{ tasks: [task({ priority: "Critical" })] }, {}],
    [{ status: "Completed" }, {}], [{ status: "Cancelled" }, {}], [{ status: "Archived" }, {}],
    [{ tasks: [task({ archivedAt: "2070-10-01" })] }, {}], [{ tasks: [task({ status: "In Progress" })] }, {}]
  ]) {
    const app = harness(fields, actor);
    await assert.rejects(app.claimTaskForUser("member", "event", "task"), (e: AppError) => [403, 409].includes(e.statusCode));
    assert.equal(app.writes.length, 0);
    assert.equal(app.logs.length, 0);
  }
  const app = harness();
  app.users.member.organizationId = "moved-org";
  await assert.rejects(app.claimTaskForUser("member", "event", "task"), /Only members of this organization/);
  assert.equal(app.writes.length, 0);
  await assert.rejects(app.claimTaskForUser("other", "event", "missing"), (e: AppError) => e.statusCode === 404);
});

test("self-assigning blocked work preserves prerequisites and status; progress remains blocked until completion", async () => {
  const app = harness({ tasks: [task({ id: "prerequisite", assignedMemberUID: "member" }), task({ dependsOnTaskIds: ["prerequisite"] })] });
  const claimed = await app.claimTaskForUser("member", "event", "task");
  assert.deepEqual(claimed.task.dependsOnTaskIds, ["prerequisite"]);
  assert.equal(claimed.task.blockedBy, 1);
  assert.equal(claimed.task.status, "To Do");
  for (const status of ["In Progress", "Completed"]) await assert.rejects(app.updateTaskStatusForUser("member", "event", "task", { status }), /is blocked/);
  await app.updateTaskStatusForUser("member", "event", "prerequisite", { status: "Completed" });
  const started = await app.updateTaskStatusForUser("member", "event", "task", { status: "In Progress" });
  assert.equal(started.task.status, "In Progress");
  assert.equal(started.task.blockedBy, 0);
});
