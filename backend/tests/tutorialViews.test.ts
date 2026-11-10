import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { TOUR_VIEW_MODES, getViewTourSteps, type TourViewMode, type TourViewScope } from "../../frontend/src/config/tutorialViews.js";
import { getTourSteps } from "../../frontend/src/config/tutorial.js";
import { attachTutorialViewDemo, createViewDemonstration, VIEW_DEMO_EVENT } from "../../frontend/src/components/onboarding/tourViewDemo.js";

class ViewRoot extends EventTarget {
  isConnected = true;
  selections: TourViewMode[] = [];
  constructor(public scope: TourViewScope, public mode: TourViewMode = "expanded") { super(); }
  getAttribute(name: string) { return name === "data-tour-view" ? this.mode : this.scope; }
  getBoundingClientRect() { return { width: 200, height: 100, left: 20, right: 220 }; }
  element() { return this as unknown as HTMLElement; }
}

function workspace(t: TestContext, width = 375) {
  const events = new ViewRoot("events"), tasks = new ViewRoot("tasks", "table");
  const values = { window: { innerWidth: width }, document: { querySelectorAll: (selector: string) => selector.includes('"events"') ? [events] : selector.includes('"tasks"') ? [tasks] : [] }, getComputedStyle: () => ({ visibility: "visible" }) };
  for (const [key, value] of Object.entries(values)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : Reflect.deleteProperty(globalThis, key));
  }
  for (const root of [events, tasks]) t.after(attachTutorialViewDemo(root.element(), (mode) => { root.mode = mode; root.selections.push(mode); }));
  return { events, tasks };
}

test("event and task introductions demonstrate all five real layouts for members, leaders, and previews", () => {
  for (const role of ["Student Leader", "Organization Member"] as const) for (const preview of [false, true]) {
    for (const [scope, guide] of [["events", "page-events"], ["tasks", "page-event-details"]] as const) {
      const steps = getTourSteps(role, guide, preview).filter((step) => step.demoView);
      assert.deepEqual(steps.map((step) => step.demoView?.mode), [...TOUR_VIEW_MODES]);
      assert.deepEqual(steps.map((step) => step.demoView?.scope), Array(5).fill(scope));
      assert.ok(steps.every((step) => !step.interaction && !step.openOnNext && !step.prepare && step.route === "/dashboard/events" && step.description));
    }
    assert.deepEqual(getTourSteps(role, "event-browse").filter((step) => step.demoView).map((step) => step.demoView?.mode), [...TOUR_VIEW_MODES]);
  }
  assert.deepEqual(getTourSteps("Admin", "page-event-details"), []);
  assert.equal(getViewTourSteps("tasks", "/dashboard/events").length, 5);
});

test("demonstrations switch only the requested workspace and restore the original layout", async (t) => {
  for (const width of [375, 1440]) await t.test(`${width}px`, (t) => {
    const { events, tasks } = workspace(t, width);
    const demonstration = createViewDemonstration();
    for (const mode of TOUR_VIEW_MODES) {
      assert.equal(demonstration.show({ scope: "events", mode }), events.element());
      assert.equal(events.mode, mode);
      assert.equal(tasks.mode, "table");
    }
    demonstration.restore();
    assert.equal(events.mode, "expanded");
    assert.deepEqual(events.selections, [...TOUR_VIEW_MODES, "expanded"]);
    for (const mode of TOUR_VIEW_MODES) demonstration.show({ scope: "tasks", mode });
    demonstration.restore();
    assert.equal(tasks.mode, "table");
    assert.deepEqual(tasks.selections, [...TOUR_VIEW_MODES, "table"]);
  });
});

test("Back, skipping, missing workspaces, and a later user selection are handled safely", (t) => {
  const { events } = workspace(t);
  const demonstration = createViewDemonstration();
  demonstration.show({ scope: "events", mode: "grid" });
  demonstration.show({ scope: "events", mode: "table" });
  demonstration.show({ scope: "events", mode: "grid" }); // Back.
  demonstration.restore(); // Skip/Finish/leaving the view sequence.
  assert.equal(events.mode, "expanded");
  demonstration.show({ scope: "events", mode: "calendar" });
  events.mode = "kanban"; // A later choice belongs to the user.
  demonstration.restore();
  assert.equal(events.mode, "kanban");
  demonstration.show({ scope: "events", mode: "grid" });
  events.isConnected = false;
  demonstration.restore();
  assert.equal(events.mode, "grid");
  assert.equal(demonstration.show({ scope: "missing", mode: "grid" } as any), null);
});

test("view handlers reject business actions and malformed requests and detach on cleanup", () => {
  const root = new ViewRoot("tasks");
  const stop = attachTutorialViewDemo(root.element(), (mode) => root.selections.push(mode));
  for (const detail of ["save", "publish", "Completed", "delete", { mode: "grid" }, null]) root.dispatchEvent(new CustomEvent(VIEW_DEMO_EVENT, { detail }));
  assert.deepEqual(root.selections, []);
  root.dispatchEvent(new CustomEvent(VIEW_DEMO_EVENT, { detail: "grid" }));
  assert.deepEqual(root.selections, ["grid"]);
  stop();
  root.dispatchEvent(new CustomEvent(VIEW_DEMO_EVENT, { detail: "calendar" }));
  assert.deepEqual(root.selections, ["grid"]);
});
