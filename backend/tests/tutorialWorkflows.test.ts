import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTourSteps, isTutorialStatus, TOUR_IDS } from "../../frontend/src/config/tutorial.js";
import { getWorkflowTours } from "../../frontend/src/config/tutorialWorkflows.js";
import { canInteractWithTourTarget, findTourTarget, openTutorialControl } from "../../frontend/src/components/onboarding/tourTargets.js";
import { controlDetails, describeControl } from "../../frontend/src/components/onboarding/controlGuide.js";
import { tutorialStatusSchema } from "../src/utils/tutorialStatus.js";

const roles = ["Admin", "Student Leader", "Organization Member"] as const;
const sourceRoot = fileURLToPath(new URL("../../frontend/src/", import.meta.url));
const sources = readdirSync(sourceRoot, { recursive: true }).filter((file) => typeof file === "string" && file.endsWith(".tsx")).map((file) => readFileSync(`${sourceRoot}/${file}`, "utf8")).join("\n");

test("every workflow uses real routes and stable targets in actual components", () => {
  for (const role of roles) for (const tour of getWorkflowTours(role)) {
    assert.ok(tour.steps.length >= 3 || (role === "Organization Member" && tour.id === "announcements"));
    assert.ok(existsSync(`${sourceRoot}/app${tour.route}/page.tsx`), tour.route);
    assert.equal(new Set(tour.steps.map((step) => step.id)).size, tour.steps.length);
    for (const step of tour.steps) {
      assert.equal(step.route, tour.route);
      assert.match(sources, new RegExp(`(?:data-tour|tourId)="${step.target}"`), `${tour.id}: ${step.target}`);
    }
  }
});

test("workflow IDs are consistent between browser storage and strict API validation", () => {
  for (const tour of TOUR_IDS) {
    const progress = { version: 1, status: "in_progress", step: 0, tour, updatedAt: "2026-11-07T00:00:00Z" };
    assert.ok(isTutorialStatus(progress), tour);
    const { updatedAt: _, ...payload } = progress;
    assert.ok(tutorialStatusSchema.safeParse({ ...payload, role: "Admin" }).success, tour);
  }
});

test("members never receive leader or admin workflows or management-only steps", () => {
  const member = getWorkflowTours("Organization Member");
  assert.deepEqual(member.map((tour) => tour.id).sort(), ["announcements", "event-browse", "membership", "notifications", "preferences", "task-progress"].sort());
  const forbidden = new Set(["announcement-create", "announcement-submit", "member-remove", "join-requests", "event-custom-status"]);
  assert.ok(member.every((tour) => tour.steps.every((step) => !forbidden.has(step.target) && step.route.startsWith("/dashboard/"))));
  assert.deepEqual(getTourSteps("Organization Member", "request-review"), []);
  assert.deepEqual(getTourSteps("Student Leader", "user-manage"), []);
  assert.ok(getWorkflowTours("Admin").every((tour) => tour.route.startsWith("/admin/")));
});

test("only safe opening and navigation steps can run automatically", () => {
  const safe = new Set(["create-event", "event-cancel", "events-tab", "event-filter-panel", "event-filter-done", "event-card", "task-card", "add-task", "new-task-cancel", "task-close", "ai-tab", "ai-edit-task", "ai-review-cancel", "committees-tab", "committee-create", "committee-cancel", "members-tab", "announcements-tab", "announcement-create", "announcement-cancel", "request-reject", "request-cancel", "admin-org-add", "admin-org-cancel", "admin-member-edit", "admin-member-edit-cancel", "notifications-all"]);
  for (const role of roles) for (const tour of getWorkflowTours(role)) for (const step of tour.steps) {
    if (step.openOnNext) assert.ok(safe.has(step.openOnNext), `Unsafe automatic step: ${step.target}`);
    assert.ok((step.reveal ?? []).every((target) => safe.has(target)));
    if (/submit|approve|confirm|publish|generate|auto-assign|remove|read-all/.test(step.target)) assert.equal(step.openOnNext, undefined, step.target);
  }
});

test("Help is centralized and New Event expands into its real modal controls", () => {
  assert.equal(sources.includes("FeatureTutorialButton"), false);
  assert.equal(sources.includes("Explain this form"), false);
  const details = controlDetails("Student Leader", "/dashboard/events", "create-event");
  for (const target of ["event-title", "event-description", "event-committee", "event-start", "event-end", "event-submit", "event-cancel"]) assert.ok(details.some((step) => step.target === target), target);
  assert.ok(details.every((step) => step.reveal?.includes("create-event")));
  const opener = getWorkflowTours("Student Leader").find((tour) => tour.id === "event-create")!.steps[0];
  assert.equal(opener.openOnNext, "create-event");
  assert.deepEqual(controlDetails("Organization Member", "/dashboard/events", "create-event"), []);
});

test("automatic UI opening rejects submissions and does not toggle an already open modal", (t) => {
  let clicks = 0;
  let open = false;
  let disabled = false;
  const element = { getBoundingClientRect: () => ({ width: 120, height: 40, left: 10, right: 130 }), matches: () => disabled, click: () => { clicks++; open = true; } };
  const values = { window: { innerWidth: 1280 }, document: { querySelectorAll: (selector: string) => selector.includes('create-event') || (open && selector.includes('event-title')) ? [element] : [] }, getComputedStyle: () => ({ visibility: "visible" }) };
  for (const [key, value] of Object.entries(values)) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : Reflect.deleteProperty(globalThis, key));
  }
  assert.deepEqual(openTutorialControl("event-submit"), { opened: false });
  assert.deepEqual(openTutorialControl("request-approve"), { opened: false });
  assert.deepEqual(openTutorialControl("create-event"), { opened: true, close: "event-cancel" });
  assert.deepEqual(openTutorialControl("create-event"), { opened: false });
  assert.equal(clicks, 1);
  open = false; disabled = true;
  assert.deepEqual(openTutorialControl("create-event"), { opened: false });
  assert.equal(clicks, 1);
});

test("visible target lookup handles duplicate responsive controls and hidden controls", (t) => {
  const hidden = { getBoundingClientRect: () => ({ width: 0, height: 0, right: 0, left: 0 }) };
  const visible = { getBoundingClientRect: () => ({ width: 100, height: 40, right: 140, left: 40 }) };
  const doc = { querySelectorAll: () => [hidden, visible] };
  const values = { window: { innerWidth: 375 }, document: doc, getComputedStyle: () => ({ visibility: "visible" }) };
  for (const [key, value] of Object.entries(values)) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : Reflect.deleteProperty(globalThis, key));
  }
  const step = { id: "create", target: "create-event", title: "Create", description: "Open", route: "/dashboard/events" };
  assert.equal(findTourTarget(step), visible);
  doc.querySelectorAll = () => [];
  assert.equal(findTourTarget(step), null);
});

test("missing, disabled, and explanatory targets cannot receive tutorial interactions", () => {
  const step = { id: "open", target: "create-event", title: "Open", description: "Open", route: "/dashboard/events", interaction: "click" as const };
  assert.equal(canInteractWithTourTarget(null, step), false);
  const disabled = { matches: () => true } as unknown as HTMLElement;
  const enabled = { matches: () => false } as unknown as HTMLElement;
  assert.equal(canInteractWithTourTarget(disabled, step), false);
  assert.equal(canInteractWithTourTarget(enabled, step), true);
  assert.equal(canInteractWithTourTarget(enabled, { ...step, interaction: undefined }), false);
});

test("control reference explains searches, filters, fields, views, and consequential actions", () => {
  assert.match(describeControl("Search tasks", "input", "text", null), /narrow the records/);
  assert.match(describeControl("All Committees", "select", "", null), /filter/);
  assert.match(describeControl("Task title", "input", "text", null), /Required fields/);
  assert.match(describeControl("Calendar view", "button", "button", null), /displayed/);
  assert.match(describeControl("Approve", "button", "button", null), /without activating/);
  assert.match(describeControl("Work attachment", "input", "file", null), /never uploads/);
});
