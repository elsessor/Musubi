import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTourSteps, isTutorialStatus, TOUR_IDS } from "../../frontend/src/config/tutorial.js";
import { getWorkflowTours } from "../../frontend/src/config/tutorialWorkflows.js";
import { canInteractWithTourTarget, findTourHighlightTargets, findTourSidebarTarget, findTourTarget, getTourHighlightRect, openTutorialControl } from "../../frontend/src/components/onboarding/tourTargets.js";
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
  assert.deepEqual(member.map((tour) => tour.id).sort(), ["announcements", "event-browse", "membership", "notifications", "preferences", "task-progress", "google-calendar"].sort());
  const forbidden = new Set(["announcement-create", "announcement-submit", "member-remove", "join-requests", "event-custom-status"]);
  assert.ok(member.every((tour) => tour.steps.every((step) => !forbidden.has(step.target) && step.route.startsWith("/dashboard/"))));
  assert.deepEqual(getTourSteps("Organization Member", "request-review"), []);
  assert.deepEqual(getTourSteps("Student Leader", "user-manage"), []);
  assert.ok(getWorkflowTours("Admin").every((tour) => tour.route.startsWith("/admin/")));
});

test("event and task introductions explain custom statuses without creating or changing work", (t) => {
  for (const role of ["Student Leader", "Organization Member"] as const) for (const preview of [false, true]) {
    for (const [guide, prefix] of [["page-events", "event"], ["page-event-details", "task"]] as const) {
      const step = getTourSteps(role, guide, preview).find((item) => item.id === `${prefix}-custom-status-guide`)!;
      assert.ok(step);
      assert.equal(step.target, role === "Student Leader" ? "custom-status-dialog" : `${prefix}-status-filter`);
      assert.match(step.description, /label.*Waiting for Approval/);
      assert.equal(step.interaction, undefined);
      assert.equal(step.openOnNext, undefined);
      if (role === "Student Leader") {
        assert.deepEqual(step.reveal, [`${prefix}-filter-panel`, `${prefix}-custom-status`]);
        assert.equal(step.closeOnLeave, "custom-status-close");
        assert.equal(step.details?.length, 5);
        const reference = step.details!.map((detail) => detail.description).join(" ");
        assert.match(reference, /priority.*position.*immediately.*without undoing/);
      } else assert.equal(step.details, undefined);
    }
  }
  let opened = false;
  const element = { getBoundingClientRect: () => ({ width: 100, height: 40, right: 140, left: 40 }), matches: () => false };
  const opener = { ...element, click: () => { opened = true; } }, closer = { ...element, click: () => { opened = false; } };
  const values = { window: { innerWidth: 375 }, document: { querySelectorAll: (selector: string) => selector.includes('custom-status-dialog') ? opened ? [element] : [] : selector.includes('custom-status-close') ? opened ? [closer] : [] : selector.includes('custom-status') ? [opener] : [] }, getComputedStyle: () => ({ visibility: "visible" }) };
  for (const [key, value] of Object.entries(values)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : Reflect.deleteProperty(globalThis, key));
  }
  for (const guide of ["page-events", "page-event-details"] as const) {
    const step = getTourSteps("Student Leader", guide).find((item) => item.id.endsWith("custom-status-guide"))!;
    assert.deepEqual(findTourHighlightTargets(step), []);
    assert.deepEqual(openTutorialControl(step.reveal!.at(-1)!), { opened: true, close: "custom-status-close" });
    assert.deepEqual(findTourHighlightTargets(step), [element]);
    assert.deepEqual(openTutorialControl(step.target), { opened: false });
    for (const action of ["status-add", "status-delete", "status-save"]) assert.deepEqual(openTutorialControl(action), { opened: false });
    openTutorialControl(step.closeOnLeave!);
    assert.equal(opened, false);
  }
});

test("only safe opening and navigation steps can run automatically", () => {
  const safe = new Set(["create-event", "event-cancel", "events-tab", "event-filter-panel", "event-filter-done", "event-card", "task-card", "add-task", "new-task-cancel", "task-close", "ai-tab", "ai-edit-task", "ai-review-cancel", "committees-tab", "committee-create", "committee-cancel", "members-tab", "announcements-tab", "announcement-create", "announcement-cancel", "request-reject", "request-cancel", "admin-org-add", "admin-org-cancel", "admin-member-edit", "admin-member-edit-cancel", "notifications-all"]);
  for (const role of roles) for (const tour of getWorkflowTours(role)) for (const step of tour.steps) {
    if (step.openOnNext) assert.ok(safe.has(step.openOnNext), `Unsafe automatic step: ${step.target}`);
    assert.ok((step.reveal ?? []).every((target) => safe.has(target)));
    if (/submit|approve|confirm|publish|generate|auto-assign|remove|read-all/.test(step.target)) assert.equal(step.openOnNext, undefined, step.target);
  }
});

test("short workflow guides preserve every instruction and safe opening sequence", () => {
  for (const role of roles) for (const tour of getWorkflowTours(role)) {
    const steps = getTourSteps(role, tour.id);
    assert.deepEqual(steps.flatMap((step) => step.details ?? [{ title: step.title, description: step.description }]),
      tour.steps.map(({ title, description }) => ({ title, description })), `${role}: ${tour.id} lost instructions`);
    assert.deepEqual(steps.filter((step) => step.openOnNext).map((step) => step.openOnNext),
      tour.steps.filter((step) => step.openOnNext).map((step) => step.openOnNext));
    assert.ok(steps.length <= tour.steps.length);
    for (const step of steps.filter((step) => step.details)) {
      assert.equal(step.openOnNext, undefined);
      assert.deepEqual(step.reveal, tour.steps.find((original) => original.id === step.id)?.reveal);
      const start = tour.steps.findIndex((original) => original.id === step.id);
      assert.deepEqual(step.highlightTargets, tour.steps.slice(start, start + step.details!.length).map((original) => original.target));
    }
  }
  assert.ok(getTourSteps("Student Leader", "task-create").length <= 5);
  assert.ok(getTourSteps("Student Leader", "event-create").length <= 4);
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

test("full walkthrough highlights page content consistently across roles and screen sizes", (t) => {
  const element = () => ({ getBoundingClientRect: () => ({ width: 100, height: 40, right: 140, left: 40 }) });
  const workspace = element(), sidebar = element(), control = element();
  const viewport = { innerWidth: 375 };
  const values = {
    window: viewport,
    document: { querySelectorAll: (selector: string) => selector === '[data-tour="workspace"]' ? [workspace] : selector.includes('nav-') ? [sidebar] : [control] },
    getComputedStyle: () => ({ visibility: "visible" })
  };
  for (const [key, value] of Object.entries(values)) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : Reflect.deleteProperty(globalThis, key));
  }
  for (const width of [375, 768, 1440]) {
    viewport.innerWidth = width;
    for (const role of roles) {
      for (const step of getTourSteps(role, "features")) {
        assert.deepEqual(findTourHighlightTargets(step), [step.id === "finish" ? control : workspace], `${role}: ${step.id} at ${width}px`);
        if (step.id === "finish") {
          assert.equal(step.target, "help");
          assert.equal(step.selector, undefined);
          assert.equal(step.sidebarTarget, undefined);
        }
        assert.equal(step.openOnNext, undefined);
      }
      assert.equal(findTourTarget(getTourSteps(role, "quick")[0]), workspace);
    }
    // Detailed workflows retain control-level highlights.
    const create = getTourSteps("Student Leader", "event-create")[0];
    assert.deepEqual(findTourHighlightTargets(create), [control]);
  }
  const events = getTourSteps("Student Leader", "features").find((step) => step.id === "events")!;
  assert.equal(events.prepare, "events", "Returning from the AI overview restores the event list");
});

test("full walkthrough identifies the matching sidebar tab and uses the menu button on phones", (t) => {
  const expectedTabs: Record<string, string> = {
    "/admin": "nav-dashboard", "/dashboard": "nav-dashboard",
    "/admin/org-requests": "nav-org-requests", "/admin/organizations": "nav-organizations", "/admin/members": "nav-members",
    "/admin/audit-logs": "nav-audit-logs", "/admin/settings": "nav-settings",
    "/dashboard/events": "nav-events", "/dashboard/organization": "nav-organization", "/dashboard/analytics": "nav-analytics",
    "/dashboard/notifications": "nav-notifications", "/dashboard/settings": "nav-settings"
  };
  const viewport = { innerWidth: 375 };
  let collapsed = false, menuHidden = false;
  const workspace = { getBoundingClientRect: () => ({ width: 100, height: 40, right: 140, left: 40 }) };
  const help = { getBoundingClientRect: () => ({ width: 44, height: 44, right: viewport.innerWidth - 12, left: viewport.innerWidth - 56 }) };
  const menu = { getBoundingClientRect: () => ({ width: 44, height: 44, right: 56, left: 12 }) };
  const links = new Map(Object.values(expectedTabs).map((id) => [id, {
    getBoundingClientRect: () => ({ width: collapsed ? 44 : 200, height: 44, left: viewport.innerWidth < 768 ? -240 : 12, right: viewport.innerWidth < 768 ? -40 : collapsed ? 56 : 212 })
  }]));
  const values = {
    window: viewport,
    document: { querySelectorAll: (selector: string) => {
      if (selector === '[data-tour="workspace"]') return [workspace];
      if (selector === '[data-tour="help"]') return [help];
      if (selector === 'button[aria-label="Open navigation"]') return viewport.innerWidth < 768 && !menuHidden ? [menu] : [];
      const id = selector.match(/^\[data-tour="([^"]+)"\]$/)?.[1];
      return id && links.has(id) ? [links.get(id)] : [];
    } },
    getComputedStyle: () => ({ visibility: "visible" })
  };
  for (const [key, value] of Object.entries(values)) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : Reflect.deleteProperty(globalThis, key));
  }
  for (const width of [375, 768, 1440]) {
    viewport.innerWidth = width;
    for (const role of roles) for (const step of getTourSteps(role, "features")) {
      if (step.id === "finish") {
        assert.equal(findTourSidebarTarget(step), null);
        assert.deepEqual(findTourHighlightTargets(step), [help], "The final step highlights Help on phones and desktops");
        continue;
      }
      assert.equal(step.sidebarTarget, expectedTabs[step.route], `${role}: ${step.id}`);
      assert.equal(findTourSidebarTarget(step), width < 768 ? menu : links.get(expectedTabs[step.route]));
      assert.deepEqual(findTourHighlightTargets(step), [workspace], "The sidebar must not expand the page highlight bounds");
    }
  }
  collapsed = true;
  const events = getTourSteps("Student Leader", "features").find((step) => step.id === "events")!;
  assert.equal(findTourSidebarTarget(events), links.get("nav-events"));
  viewport.innerWidth = 375; menuHidden = true;
  assert.equal(findTourSidebarTarget(events), null);
  assert.deepEqual(findTourHighlightTargets(events), [workspace]);
  assert.equal(findTourSidebarTarget(getTourSteps("Student Leader", "event-create")[0]), null);
});

test("event introduction highlights mobile Filters alongside the view selector and desktop filter controls", (t) => {
  const viewport = { innerWidth: 375, innerHeight: 700 };
  const box = (left: number, right: number) => ({ left, right, top: 100, bottom: 144, width: right - left, height: 44 });
  const hidden = { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 };
  const filterButton = { getBoundingClientRect: () => viewport.innerWidth < 640 ? box(4, 78) : hidden };
  const committee = { getBoundingClientRect: () => viewport.innerWidth >= 640 ? box(4, 150) : hidden };
  const status = { getBoundingClientRect: () => viewport.innerWidth >= 640 ? box(160, 300) : hidden };
  const view = { getBoundingClientRect: () => box(90, 280) };
  const elements = new Map([["event-filter-panel", filterButton], ["event-committee-filter", committee], ["event-status-filter", status], ["event-view", view]]);
  const values = {
    window: viewport,
    document: { querySelectorAll: (selector: string) => {
      const id = selector.match(/^\[data-tour="([^"]+)"\]$/)?.[1];
      return id && elements.has(id) ? [elements.get(id)] : [];
    } },
    getComputedStyle: () => ({ visibility: "visible" })
  };
  for (const [key, value] of Object.entries(values)) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : Reflect.deleteProperty(globalThis, key));
  }
  for (const role of ["Student Leader", "Organization Member"] as const) {
    const step = getTourSteps(role, "page-events").find((step) => step.id === "events-views")!;
    viewport.innerWidth = 375;
    const targets = findTourHighlightTargets(step);
    assert.deepEqual(targets, [filterButton, view]);
    const bounds = getTourHighlightRect(targets)!;
    assert.ok(bounds.x <= 4 && bounds.x + bounds.width >= 280);
    assert.ok(bounds.x + bounds.width < 292, "New Event must remain outside the highlight");
    viewport.innerWidth = 1440;
    assert.deepEqual(findTourHighlightTargets(step), [committee, status, view]);
  }
});

test("group highlights include every available field when another field is missing or hidden", (t) => {
  const hidden = { getBoundingClientRect: () => ({ width: 0, height: 0, right: 0, left: 0 }) };
  const description = { getBoundingClientRect: () => ({ width: 100, height: 40, right: 140, left: 40 }) };
  const deadline = { getBoundingClientRect: () => ({ width: 100, height: 40, right: 280, left: 180 }) };
  const values = { window: { innerWidth: 375 }, document: { querySelectorAll: (selector: string) => selector.includes('event-description') ? [hidden, description] : selector.includes('event-end') ? [deadline] : [] }, getComputedStyle: () => ({ visibility: "visible" }) };
  for (const [key, value] of Object.entries(values)) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : Reflect.deleteProperty(globalThis, key));
  }
  const step = { id: "group", target: "event-title", title: "Event", description: "Details", route: "/dashboard/events", highlightTargets: ["event-title", "event-description", "event-end"] };
  assert.deepEqual(findTourHighlightTargets(step), [description, deadline]);
  assert.deepEqual(findTourHighlightTargets({ ...step, target: "event-end", highlightTargets: undefined }), [deadline]);
});

test("group highlight bounds enclose the fields and stay inside mobile viewports and scrolling forms", (t) => {
  const viewport = { innerWidth: 800, innerHeight: 600 };
  const values = { window: viewport, getComputedStyle: () => ({ overflowX: "visible", overflowY: "auto" }) };
  for (const [key, value] of Object.entries(values)) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : Reflect.deleteProperty(globalThis, key));
  }
  const first = { parentElement: null as unknown, getBoundingClientRect: () => ({ left: 20, top: 100, right: 480, bottom: 140 }) };
  const last = { parentElement: null as unknown, getBoundingClientRect: () => ({ left: 20, top: 200, right: 480, bottom: 260 }) };
  const fields = [first, last] as unknown as HTMLElement[];
  assert.deepEqual(getTourHighlightRect(fields), { x: 15, y: 95, width: 470, height: 170 });
  viewport.innerWidth = 320; viewport.innerHeight = 240;
  assert.deepEqual(getTourHighlightRect(fields), { x: 15, y: 95, width: 301, height: 141 });
  const scrollArea = { parentElement: null, clientLeft: 0, clientTop: 0, clientWidth: 490, clientHeight: 100, getBoundingClientRect: () => ({ left: 10, top: 120, right: 500, bottom: 220 }) };
  first.parentElement = scrollArea; last.parentElement = scrollArea;
  assert.deepEqual(getTourHighlightRect(fields), { x: 15, y: 120, width: 301, height: 100 });
  assert.equal(getTourHighlightRect([]), null);
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

test("fixed status dialogs are highlighted beyond the dashboard's scrolling content bounds", (t) => {
  const main = { parentElement: null, clientLeft: 0, clientTop: 0, clientWidth: 1100, clientHeight: 800, getBoundingClientRect: () => ({ left: 248, top: 70, right: 1348, bottom: 870 }) };
  const backdrop = { parentElement: main, getBoundingClientRect: () => ({ left: 0, top: 0, right: 1904, bottom: 952 }) };
  const dialog = { parentElement: backdrop, getBoundingClientRect: () => ({ left: 16, top: 32, right: 464, bottom: 900 }) };
  const values = { window: { innerWidth: 1904, innerHeight: 952 }, getComputedStyle: (element: unknown) => element === backdrop ? { position: "fixed", overflowX: "visible", overflowY: "visible" } : { position: "static", overflowX: "auto", overflowY: "auto" } };
  for (const [key, value] of Object.entries(values)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : Reflect.deleteProperty(globalThis, key));
  }
  assert.deepEqual(getTourHighlightRect([dialog as unknown as HTMLElement]), { x: 11, y: 27, width: 458, height: 878 });
});

test("control reference explains searches, filters, fields, views, and consequential actions", () => {
  assert.match(describeControl("Search tasks", "input", "text", null), /narrow the records/);
  assert.match(describeControl("All Committees", "select", "", null), /filter/);
  assert.match(describeControl("Task title", "input", "text", null), /Required fields/);
  assert.match(describeControl("Calendar view", "button", "button", null), /displayed/);
  assert.match(describeControl("Approve", "button", "button", null), /without activating/);
  assert.match(describeControl("Work attachment", "input", "file", null), /never uploads/);
});
