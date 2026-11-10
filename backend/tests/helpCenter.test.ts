import assert from "node:assert/strict";
import test from "node:test";
import { getHelpCategories, searchHelp } from "../../frontend/src/config/helpCenter.js";
import { getTourSteps } from "../../frontend/src/config/tutorial.js";
import { getPageTours } from "../../frontend/src/config/tutorialPages.js";
import { getWorkflowTours } from "../../frontend/src/config/tutorialWorkflows.js";
import { getDashboardNavItems } from "../../frontend/src/utils/routes.js";

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
