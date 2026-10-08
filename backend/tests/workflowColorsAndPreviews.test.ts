import assert from "node:assert/strict";
import test from "node:test";
import { validateEventStatusSettings } from "../src/utils/workflowSettings.js";
import { getOrderedTaskStatuses, getStatusTheme, getTaskStatusDistribution, THEME_MAP } from "../../frontend/src/components/events/statusUtils.js";
import { getAssignedProfileTasks } from "../../frontend/src/utils/profileMetrics.js";
import { getAttachmentPreview, safeAttachmentUrl } from "../../frontend/src/utils/attachmentPreview.js";
import type { Event } from "../../frontend/src/components/events/types.js";

test("task menus match the event's status order even when its tasks are filtered", () => {
  const order = ["Backlogs", "asdf", "To Do", "In Progress", "In Review", "Completed"];
  assert.deepEqual(getOrderedTaskStatuses(order, [{ name: "Backlogs", color: "rose" }, { name: "asdf", color: "purple" }], ["To Do"]), order);
  assert.deepEqual(getOrderedTaskStatuses([...order].reverse(), [], ["Completed"]), [...order].reverse());
  assert.equal(order[0], "Backlogs");
});

test("status ordering retains missing statuses without duplicates or cross-event state", () => {
  assert.deepEqual(getOrderedTaskStatuses(["Completed", "Completed", ""], [{ name: "Approval", color: "cyan" }], ["Legacy"]),
    ["Completed", "To Do", "In Progress", "In Review", "Approval", "Legacy"]);
  assert.deepEqual(getOrderedTaskStatuses(), ["To Do", "In Progress", "In Review", "Completed"]);
});

test("saved status colors take precedence and remain scoped to their event", () => {
  assert.equal(getStatusTheme(" awaiting approval ", [{ name: "Awaiting Approval", color: "rose" }]), THEME_MAP.rose);
  assert.equal(getStatusTheme("Awaiting Approval", [{ name: "Awaiting Approval", color: "cyan" }]), THEME_MAP.cyan);
  assert.equal(getStatusTheme("In Progress", [{ name: "In Progress", color: "purple" }]), THEME_MAP.purple);
});

test("legacy status aliases and unknown labels keep consistent colors", () => {
  assert.equal(getStatusTheme("Done"), getStatusTheme("Completed"));
  assert.equal(getStatusTheme("Cancelled"), THEME_MAP.rose);
  assert.equal(getStatusTheme("CANCELED"), THEME_MAP.rose);
  assert.equal(getStatusTheme("  Waiting on permits "), getStatusTheme("WAITING ON PERMITS"));
});

test("analytics includes every custom status and distinguishes event-specific colors", () => {
  const groups = getTaskStatusDistribution([
    { title: "Exhibit", customStatuses: [{ name: "Approval", color: "purple" }], tasks: [{ status: "Approval" }, { status: "Approval" }, { status: "Completed" }] },
    { title: "Workshop", customStatuses: [{ name: "Approval", color: "cyan" }], tasks: [{ status: "Approval" }, { status: "Awaiting venue" }] }
  ]);
  assert.equal(groups.reduce((count, group) => count + group.count, 0), 5);
  const approvals = groups.filter((group) => group.status === "Approval");
  assert.deepEqual(approvals.map((group) => [group.count, group.theme.dot]), [[2, "bg-purple-500"], [1, "bg-cyan-500"]]);
});

test("profile assignments retain the source event's status configuration", () => {
  const events = [{ id: "e1", title: "Exhibit", customStatuses: [{ name: "Approval", color: "cyan" }], tasks: [{ id: "t1", status: "Approval", assignedMemberUID: "member" }] }] as Event[];
  const [task] = getAssignedProfileTasks(events, "member", "Member");
  assert.equal(getStatusTheme(task.status, task.customStatuses), THEME_MAP.cyan);
});

test("preview selects supported media and uses extensions only for unknown MIME types", () => {
  assert.deepEqual(getAttachmentPreview({ name: "PHOTO.JPG", contentType: "application/octet-stream" }), { kind: "image", contentType: "image/jpeg" });
  assert.equal(getAttachmentPreview({ name: "report.pdf", contentType: "application/pdf" }).kind, "pdf");
  assert.equal(getAttachmentPreview({ name: "notes.txt", contentType: "text/plain; charset=utf-8" }).kind, "text");
  assert.equal(getAttachmentPreview({ name: "clip.mp4" }).kind, "video");
  assert.equal(getAttachmentPreview({ name: "recording.wav" }).kind, "audio");
  assert.equal(getAttachmentPreview({ name: "document.docx" }).kind, "unsupported");
});

test("active HTML and SVG uploads never render as active preview documents", () => {
  assert.equal(getAttachmentPreview({ name: "photo.png", contentType: "text/html" }).kind, "text");
  assert.equal(getAttachmentPreview({ name: "photo.svg", contentType: "image/svg+xml" }).kind, "unsupported");
  assert.equal(safeAttachmentUrl("javascript:alert(1)"), null);
  assert.equal(safeAttachmentUrl("data:text/html,<script>"), null);
  assert.equal(safeAttachmentUrl("file:///private.txt"), null);
  assert.equal(safeAttachmentUrl("https://example.com/resources"), "https://example.com/resources");
});

test("persisted status settings validate colors, unique names, and display order", () => {
  const settings = validateEventStatusSettings({ customStatuses: [{ name: " Approval ", color: "cyan" }], statusOrder: ["Approval", "Active", "Active"] });
  assert.deepEqual(settings.customStatuses, [{ name: "Approval", color: "cyan" }]);
  assert.equal(settings.statusOrder[0], "Approval");
  assert.equal(settings.statusOrder.filter((status) => status === "Active").length, 1);
  assert.ok(settings.statusOrder.includes("Completed"));
  for (const input of [
    null,
    { customStatuses: [{ name: "Approval", color: "invalid-class" }], statusOrder: [] },
    { customStatuses: [{ name: "Approval", color: "cyan" }, { name: "approval", color: "rose" }], statusOrder: [] },
    { customStatuses: [], statusOrder: ["Unconfigured status"] }
  ]) assert.throws(() => validateEventStatusSettings(input));
});
