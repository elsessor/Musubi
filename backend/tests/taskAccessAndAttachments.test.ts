import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../src/utils/AppError.js";
import { applyTaskStatusUpdate, assertCanContributeTask, assertCanEditEvent, assertEventAccess, preserveTaskAttachments, type TaskActor } from "../src/utils/taskPermissions.js";
import { ATTACHMENT_CHUNK_BYTES, MAX_ATTACHMENT_BYTES, normalizeAttachmentContentType, splitAttachmentFile, validateAttachmentLink, validateAttachmentName } from "../src/utils/taskAttachments.js";
import { canUpdateTaskStatus, canUseTaskPriorityControl } from "../../frontend/src/utils/taskAssignment.js";

const member: TaskActor = { uid: "member", fullName: "Team Member", role: "Organization Member", organizationId: "org" };
const leader: TaskActor = { uid: "leader", fullName: "Team Leader", role: "Student Leader", organizationId: "org" };
const task = { id: "task", title: "Assigned work", description: "Saved instructions", assignedMemberUID: "member", assignedMemberName: "Team Member", status: "To Do", priority: "High", dueDate: "2026-10-08", attachments: [{ id: "existing", type: "link", url: "https://example.com/" }] };
const forbidden = (error: unknown) => error instanceof AppError && error.statusCode === 403;

test("status controls are read-only for other members, even with the same display name", () => {
  assert.equal(canUpdateTaskStatus(task, "member", "Team Member", "Organization Member"), true);
  assert.equal(canUpdateTaskStatus(task, "other-member", "Team Member", "Organization Member"), false);
  assert.equal(canUpdateTaskStatus({ ...task, assignedMemberUID: null }, "member", " team member ", "Organization Member"), true);
  assert.equal(canUpdateTaskStatus({ ...task, assignedMemberUID: null }, "other-member", "Other Member", "Organization Member"), false);
  assert.equal(canUpdateTaskStatus(task, null, "Team Member", "Organization Member"), false);
  assert.equal(canUpdateTaskStatus(task, "member", "Team Member", null), false);
  assert.equal(canUpdateTaskStatus(task, "leader", "Team Leader", "Student Leader"), true);
  assert.equal(canUpdateTaskStatus(task, "admin", "Admin", "Admin"), true);
});

test("priority controls require both an existing permission and the current user's assignment", () => {
  assert.equal(canUseTaskPriorityControl(task, "member", "Team Member", true), true);
  assert.equal(canUseTaskPriorityControl(task, "member", "Team Member", false), false);
  assert.equal(canUseTaskPriorityControl(task, "leader", "Team Leader", true), false);
  assert.equal(canUseTaskPriorityControl({ ...task, assignedMemberUID: "leader" }, "leader", "Team Leader", true), true);
});

test("priority control ownership uses UID first and supports exact legacy names", () => {
  assert.equal(canUseTaskPriorityControl(task, "someone-else", "Team Member", true), false);
  assert.equal(canUseTaskPriorityControl({ ...task, assignedMemberUID: null }, "member", " team member ", true), true);
  assert.equal(canUseTaskPriorityControl({ ...task, assignedMemberUID: null }, "member", "Team", true), false);
});

test("unsigned and unassigned users always see a read-only priority badge", () => {
  assert.equal(canUseTaskPriorityControl(task, null, "Team Member", true), false);
  assert.equal(canUseTaskPriorityControl({ assignedMemberUID: null, assignedMemberName: null, assignee: { initials: "UA", color: "bg-slate-400" } }, "member", "Team Member", true), false);
});

test("members contribute only to their own subtasks; UID overrides a duplicate name", () => {
  assert.doesNotThrow(() => assertCanContributeTask(member, "org", task));
  assert.throws(() => assertCanContributeTask(member, "org", { ...task, assignedMemberUID: "another-member" }), forbidden);
  assert.doesNotThrow(() => assertCanContributeTask(member, "org", { ...task, assignedMemberUID: null, assignedMemberName: " team member " }));
  assert.throws(() => assertCanContributeTask(member, "org", { ...task, assignedMemberUID: null, assignedMemberName: "" }), forbidden);
  assert.throws(() => assertCanContributeTask(member, "another-org", task), forbidden);
});

test("leaders keep task editing and attachment access within their organization", () => {
  assert.doesNotThrow(() => assertCanEditEvent(leader, "org"));
  assert.doesNotThrow(() => assertCanContributeTask(leader, "org", task));
  assert.throws(() => assertCanEditEvent(leader, "another-org"), forbidden);
  assert.throws(() => assertCanContributeTask(leader, "another-org", task), forbidden);
  assert.doesNotThrow(() => assertCanEditEvent({ ...leader, role: "Admin" }, "another-org"));
});

test("members cannot call full event editing endpoints, even on their own tasks", () => {
  assert.throws(() => assertCanEditEvent(member, "org"), forbidden);
  assert.doesNotThrow(() => assertEventAccess(member, "org"));
});

test("status updates reject priority, title, description, deadline, assignment and review changes", () => {
  for (const changes of [
    { priority: "Critical" }, { title: "Changed title" }, { description: "Changed instructions" },
    { dueDate: "2026-12-01" }, { assignedMemberUID: "other" }, { performanceReview: { rating: 5 } },
    { priorityChangeRequest: { requestedPriority: "Critical" } }, { attachments: [] }
  ]) assert.throws(() => applyTaskStatusUpdate(task, { status: "Completed", ...changes }, {}), forbidden);
  const updated = applyTaskStatusUpdate(task, { status: "In Review" }, {});
  assert.deepEqual(updated, { ...task, status: "In Review" });
  assert.equal(updated.attachments, task.attachments);
});

test("status updates allow configured custom statuses and reject invented or blank statuses", () => {
  assert.equal(applyTaskStatusUpdate(task, { status: "Blocked" }, { customStatuses: [{ name: "Blocked" }] }).status, "Blocked");
  assert.throws(() => applyTaskStatusUpdate(task, { status: "Invented" }, {}), /valid task status/);
  assert.throws(() => applyTaskStatusUpdate(task, { status: "" }, {}), /valid task status/);
  assert.throws(() => applyTaskStatusUpdate(task, null, {}), /valid task status/);
});

test("stale or forged task snapshots cannot replace saved attachments", () => {
  const uploads = [...task.attachments, { id: "recent-upload", type: "file", size: 123 }];
  const updated = preserveTaskAttachments([{ ...task, attachments: [] }, { id: "new-task", attachments: [{ id: "forged" }] }], [{ ...task, attachments: uploads }]);
  assert.deepEqual(updated[0].attachments, uploads);
  assert.deepEqual(updated[1].attachments, []);
});

test("binary files round-trip across multiple Firestore chunks without corruption", () => {
  const original = Buffer.alloc(ATTACHMENT_CHUNK_BYTES * 2 + 17, 0xa7);
  original.write("photo/file content", 0);
  const chunks = splitAttachmentFile(original);
  assert.equal(chunks.length, 3);
  assert.ok(chunks.every((chunk) => chunk.length <= ATTACHMENT_CHUNK_BYTES));
  assert.deepEqual(Buffer.concat(chunks), original);
  assert.deepEqual(Buffer.concat(splitAttachmentFile(Buffer.alloc(MAX_ATTACHMENT_BYTES, 0xab))), Buffer.alloc(MAX_ATTACHMENT_BYTES, 0xab));
});

test("uploads reject empty or oversized files and unsafe attachment names", () => {
  assert.throws(() => splitAttachmentFile(Buffer.alloc(0)), /Empty files/);
  assert.throws(() => splitAttachmentFile(Buffer.alloc(MAX_ATTACHMENT_BYTES + 1)), (error) => error instanceof AppError && error.statusCode === 413);
  assert.equal(validateAttachmentName("  Event photos.jpg  "), "Event photos.jpg");
  assert.equal(validateAttachmentName("Résumé.pdf"), "Résumé.pdf");
  for (const name of ["", "x".repeat(256), "bad\r\nheader"]) assert.throws(() => validateAttachmentName(name));
});

test("links accept http/https and reject executable or malformed URLs", () => {
  assert.equal(validateAttachmentLink("https://example.com/photos"), "https://example.com/photos");
  assert.equal(validateAttachmentLink("http://example.com"), "http://example.com/");
  for (const url of ["javascript:alert(1)", "data:text/html,test", "file:///C:/file", "invalid", "https://example.com/" + "x".repeat(2048)]) assert.throws(() => validateAttachmentLink(url));
  assert.equal(normalizeAttachmentContentType("image/jpeg"), "image/jpeg");
  assert.equal(normalizeAttachmentContentType("application/pdf\r\ninjected"), "application/octet-stream");
});
