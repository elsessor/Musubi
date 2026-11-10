import assert from "node:assert/strict";
import test from "node:test";
import { getHelpCategories, searchHelp } from "../../frontend/src/config/helpCenter.js";
import { getTourSteps } from "../../frontend/src/config/tutorial.js";
import { getPageTours } from "../../frontend/src/config/tutorialPages.js";
import { getWorkflowTours } from "../../frontend/src/config/tutorialWorkflows.js";
import { getDashboardNavItems } from "../../frontend/src/utils/routes.js";
import { findTourHighlightTargets, openTutorialControl } from "../../frontend/src/components/onboarding/tourTargets.js";
import { describeControl } from "../../frontend/src/components/onboarding/controlGuide.js";

const roles = ["Admin", "Student Leader", "Organization Member"] as const;

test("Help categories retain every permitted page, workflow, and detailed control guide", () => {
  for (const role of roles) {
    const categories = getHelpCategories(role);
    assert.deepEqual(categories.map((category) => category.route), [...getDashboardNavItems(role).map((page) => page.href), "/dashboard/profile"]);
    const guides = categories.flatMap((category) => category.guides);
    for (const workflow of getWorkflowTours(role)) {
      const guide = guides.find((item) => item.tour === workflow.id)!;
      assert.ok(guide, `${role}: ${workflow.id}`);
      assert.equal(guide.title, workflow.title);
      assert.equal(guide.description, workflow.description);
      assert.equal(guide.route, workflow.route);
      assert.equal(guide.stepCount, getTourSteps(role, workflow.id).length);
    }
    for (const page of getPageTours(role).filter((tour) => tour.id !== "page-event-details")) {
      assert.ok(guides.some((guide) => guide.tour === page.id), `${role}: ${page.id}`);
    }
    for (const category of categories) {
      assert.equal(new Set(category.guides.map((guide) => guide.id)).size, category.guides.length);
      assert.ok(category.guides.some((guide) => !guide.tour && guide.route === category.route));
      for (const guide of category.guides) if (guide.tour) assert.ok(getTourSteps(role, guide.tour).length);
    }
  }
  const events = getHelpCategories("Student Leader").find((category) => category.id === "events")!;
  assert.deepEqual(events.guides.filter((guide) => guide.tour && !guide.tour.startsWith("page-")).map((guide) => guide.id), ["event-create", "event-browse", "task-create", "task-progress", "ai-delegation", "ai-review"]);
  assert.equal(events.guides.at(-1)?.title, "Detailed control guide");
});

test("members and admins do not receive guides or categories outside their permissions", () => {
  const member = getHelpCategories("Organization Member");
  assert.deepEqual(member.map((category) => category.title), ["Dashboard", "Events & Tasks", "Organization", "Notifications", "Settings", "Profile"]);
  for (const id of ["event-create", "task-create", "ai-delegation", "ai-review", "user-manage", "request-review"]) assert.ok(member.every((category) => !category.guides.some((guide) => guide.id === id)));
  assert.deepEqual(getHelpCategories("Student Leader").map((category) => category.title), ["Dashboard", "Events & Tasks", "Organization", "Analytics", "Audit Logs", "Notifications", "Settings", "Profile"]);
  assert.ok(getHelpCategories("Admin").every((category) => category.route.startsWith("/admin") || category.id === "profile"));
});

test("search matches category names, guide titles, and existing descriptions without changing definitions", () => {
  for (const role of roles) {
    const categories = getHelpCategories(role);
    const previous = JSON.stringify(categories);
    for (const category of categories) {
      assert.ok(searchHelp(categories, category.title.toUpperCase()).some((result) => result.category.id === category.id && !result.guide));
      for (const guide of category.guides) assert.ok(searchHelp(categories, `  ${guide.title.toUpperCase()}  `).some((result) => result.guide?.id === guide.id));
    }
    assert.deepEqual(searchHelp(categories, "    "), []);
    assert.deepEqual(searchHelp(categories, "no-such-feature-9281"), []);
    assert.equal(JSON.stringify(categories), previous);
  }
  const results = searchHelp(getHelpCategories("Student Leader"), "resources");
  assert.ok(results.some((result) => result.guide?.id === "ai-delegation"));
  assert.ok(searchHelp(getHelpCategories("Student Leader"), "EVENTS assignee").some((result) => result.guide?.id === "task-create"));
});

test("the event workspace guide is offered only when an event is selected", () => {
  for (const role of roles) {
    assert.ok(getHelpCategories(role).every((category) => !category.guides.some((guide) => guide.id === "page-event-details")));
    const guides = getHelpCategories(role, false, true).flatMap((category) => category.guides);
    assert.equal(guides.some((guide) => guide.id === "page-event-details"), role !== "Admin");
  }
});

test("unaffiliated accounts retain all their guides with preview-specific page descriptions", () => {
  const categories = getHelpCategories("Student Leader", true);
  const joined = getHelpCategories("Student Leader");
  assert.deepEqual(categories.map((category) => category.guides.map((guide) => guide.id)), joined.map((category) => category.guides.map((guide) => guide.id)));
  assert.match(categories.find((category) => category.id === "organization")!.description, /preview|Preview/);
  assert.match(categories.find((category) => category.id === "dashboard")!.description, /membership is approved/);
});

test("Google Calendar instructions are discoverable for every role and before organization membership", () => {
  for (const role of roles) for (const preview of [false, true]) {
    const route = role === "Admin" ? "/admin/settings" : "/dashboard/settings";
    const results = searchHelp(getHelpCategories(role, preview), "google calendar");
    assert.ok(results.some((result) => result.category.id === "settings" && result.guide?.tour === "google-calendar"));
    const steps = getTourSteps(role, "google-calendar", preview);
    assert.equal(steps.length, 3);
    assert.ok(steps.every((step) => step.route === route && !step.interaction && !step.openOnNext && !step.prepare));
    assert.deepEqual(getTourSteps(role, "page-settings", preview).slice(1).map(({ id, description, highlightTargets }) => ({ id, description, highlightTargets })), steps.map(({ id, description, highlightTargets }) => ({ id, description, highlightTargets })));
    assert.match(steps[0].description, /permissions.*Connected.*email/);
    assert.match(steps[1].description, preview && role !== "Admin" ? /before joining an organization/ : /Sync All Events.*Archived.*Open Calendar/);
    assert.match(steps[2].description, /existing Google Calendar entries remain.*permission error/);
  }
  const calendar = getTourSteps("Organization Member", "page-events").find((step) => step.demoView?.mode === "calendar")!;
  assert.match(calendar.description, /Settings.*Show Google Calendar.*Open a Google entry/);
});

test("calendar guides keep visible highlights in both connection states and never authorize or sync", (t) => {
  let connected = false, clicks = 0;
  const element = () => ({ getBoundingClientRect: () => ({ width: 200, height: 40, left: 10, right: 210 }), click: () => { clicks++; }, matches: () => false });
  const card = element(), actions = element(), account = element(), connect = element(), sync = element(), open = element(), disconnect = element();
  const values = {
    window: { innerWidth: 375 },
    getComputedStyle: () => ({ visibility: "visible" }),
    document: { querySelectorAll: (selector: string) => {
      const controls: Record<string, object> = { "settings-calendar": card, "settings-calendar-actions": actions,
        ...(connected ? { "settings-calendar-account": account, "settings-calendar-sync": sync, "settings-calendar-open": open, "settings-calendar-disconnect": disconnect } : { "settings-calendar-connect": connect }) };
      const target = selector.match(/data-tour="([^"]+)"/)?.[1];
      return target && controls[target] ? [controls[target]] : [];
    } }
  };
  for (const [key, value] of Object.entries(values)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : Reflect.deleteProperty(globalThis, key));
  }
  for (const state of [false, true]) {
    connected = state;
    const steps = getTourSteps("Organization Member", "google-calendar");
    assert.deepEqual(findTourHighlightTargets(steps[0]), connected ? [card, account] : [card, connect]);
    assert.deepEqual(findTourHighlightTargets(steps[1]), connected ? [actions, sync, open] : [actions]);
    assert.deepEqual(findTourHighlightTargets(steps[2]), connected ? [actions, disconnect] : [actions]);
    for (const target of ["settings-calendar-connect", "settings-calendar-sync", "settings-calendar-open", "settings-calendar-disconnect"]) assert.deepEqual(openTutorialControl(target), { opened: false });
  }
  assert.equal(clicks, 0);
  assert.match(describeControl("Show Google Calendar", "input", "checkbox", null), /does not disconnect/);
  assert.match(describeControl("Sync All Events", "button", "button", null), /Archived items are excluded/);
});
