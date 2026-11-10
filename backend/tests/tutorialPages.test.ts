import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { User } from "firebase/auth";
import { getTourSteps, isTutorialStatus, nextTutorialStatus, type TutorialStatus } from "../../frontend/src/config/tutorial.js";
import { getPageTourForRoute, getPageTours, PAGE_TOUR_IDS, shouldShowPageTour } from "../../frontend/src/config/tutorialPages.js";
import { loadTutorial, localTutorial, saveTutorial } from "../../frontend/src/services/tutorial.service.js";
import { tutorialStatusSchema } from "../src/utils/tutorialStatus.js";

const roles = ["Admin", "Student Leader", "Organization Member"] as const;
const user = (uid: string) => ({ uid, getIdToken: async () => "test-token" }) as User;
const progress = (overrides: Partial<TutorialStatus> = {}): TutorialStatus => ({ version: 1, tour: "page-dashboard", status: "in_progress", step: 0, seenPages: ["page-dashboard"], updatedAt: "2026-11-07T12:00:00.000Z", ...overrides });
const response = (tutorial: unknown) => new Response(JSON.stringify({ role: "Organization Member", tutorial }), { status: 200 });

test("new accounts can start a dashboard introduction directly and get a separate Organization introduction", () => {
  for (const role of roles) {
    const home = role === "Admin" ? "/admin" : "/dashboard";
    const dashboard = getPageTourForRoute(role, home)!;
    assert.equal(dashboard.id, "page-dashboard");
    assert.ok(shouldShowPageTour(null, dashboard.id));
    assert.equal(dashboard.steps[0].id, "dashboard-overview");
    assert.ok(dashboard.steps.every((step) => step.route === home));
  }
  const organization = getPageTourForRoute("Organization Member", "/dashboard/organization")!;
  assert.ok(shouldShowPageTour(progress({ status: "completed" }), organization.id));
  assert.deepEqual(organization.steps.map((step) => step.target), ["overview-tab", "members-tab", "committees-tab", "announcements-tab"]);
});

test("page introductions stay on existing role-appropriate routes and never submit business actions", () => {
  for (const role of roles) for (const tour of getPageTours(role)) {
    assert.ok(existsSync(fileURLToPath(new URL(`../../frontend/src/app${tour.route}/page.tsx`, import.meta.url))), tour.route);
    assert.ok(tour.steps.length > 0 && tour.steps.length <= 4);
    assert.deepEqual(getTourSteps(role, tour.id), tour.steps);
    assert.equal(new Set(tour.steps.map((step) => step.id)).size, tour.steps.length);
    assert.ok(tour.steps.every((step) => step.route === tour.route && !step.openOnNext && !step.interaction && step.description));
  }
  assert.equal(getPageTourForRoute("Organization Member", "/admin"), undefined);
  assert.equal(getPageTourForRoute("Organization Member", "/dashboard/analytics"), undefined);
  assert.equal(getPageTourForRoute("Student Leader", "/admin/members"), undefined);
  assert.equal(getPageTourForRoute("Admin", "/dashboard/events"), undefined);
  assert.deepEqual(getTourSteps("Organization Member", "page-members"), []);
  assert.equal(getPageTourForRoute("Student Leader", "/dashboard/events/event-id"), undefined);
});

test("seen pages stay acknowledged after completion, dismissal, and a manual walkthrough replay", () => {
  for (const status of ["in_progress", "completed", "dismissed"] as const) {
    const previous = progress({ status });
    assert.equal(shouldShowPageTour(previous, "page-dashboard"), false);
    assert.equal(shouldShowPageTour(previous, "page-organization"), true);
    const replay = nextTutorialStatus(previous, "in_progress", 0, "features");
    assert.equal(shouldShowPageTour(replay, "page-dashboard"), false);
    assert.deepEqual(previous.seenPages, ["page-dashboard"]);
  }
  assert.equal(shouldShowPageTour(progress({ seenPages: ["page-dashboard", "page-organization"] }), "page-organization"), false);
});

test("legacy progress remains valid and both validators reject malformed page history", () => {
  assert.ok(isTutorialStatus(progress({ seenPages: undefined })));
  for (const id of PAGE_TOUR_IDS) {
    const state = progress({ tour: id, seenPages: [id] });
    assert.ok(isTutorialStatus(state));
    const { updatedAt: _, ...payload } = state;
    assert.ok(tutorialStatusSchema.safeParse({ ...payload, role: "Organization Member" }).success);
  }
  for (const seenPages of ["page-dashboard", ["unknown-page"], [null], Array(12).fill("page-dashboard")]) {
    const state = { ...progress(), seenPages };
    assert.equal(isTutorialStatus(state), false);
    const { updatedAt: _, ...payload } = state;
    assert.equal(tutorialStatusSchema.safeParse({ ...payload, role: "Organization Member" }).success, false);
  }
});

test("first-visit history survives an outage and stays isolated by account and role", async (t) => {
  const account = user("page-history-offline");
  t.mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  await saveTutorial(account, "Organization Member", progress());
  const loaded = await loadTutorial(account, "Organization Member");
  assert.equal(loaded.localOnly, true);
  assert.equal(shouldShowPageTour(loaded.status, "page-dashboard"), false);
  assert.equal(shouldShowPageTour(loaded.status, "page-organization"), true);
  assert.equal(localTutorial(account.uid, "Student Leader"), null);
  assert.equal(localTutorial("another-new-account", "Organization Member"), null);
});

test("page history is sent to the account API and combined with newer remote progress", async (t) => {
  const account = user("page-history-merge");
  t.mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  await saveTutorial(account, "Organization Member", progress());
  t.mock.restoreAll();
  const remote = progress({ tour: "page-organization", status: "completed", step: 3, seenPages: ["page-organization"], updatedAt: "2026-11-08T12:00:00.000Z" });
  t.mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    if (init.method === "GET") return response(remote);
    const body = JSON.parse(init.body as string);
    assert.deepEqual(body.seenPages.sort(), ["page-dashboard", "page-organization"]);
    assert.equal(body.tour, "page-organization");
    assert.equal(body.status, "completed");
    assert.equal(body.uid, undefined);
    return response({ ...body, updatedAt: remote.updatedAt });
  });
  const loaded = await loadTutorial(account, "Organization Member");
  assert.equal(loaded.localOnly, false);
  assert.equal(loaded.status?.status, "completed");
  assert.equal(shouldShowPageTour(loaded.status, "page-dashboard"), false);
  assert.equal(shouldShowPageTour(loaded.status, "page-organization"), false);
});

test("merged first-visit history remains available when its API sync fails", async (t) => {
  const account = user("page-history-merge-outage");
  t.mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  await saveTutorial(account, "Organization Member", progress());
  t.mock.restoreAll();
  t.mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    if (init.method === "PUT") throw new Error("sync unavailable");
    return response(progress({ seenPages: ["page-organization"], updatedAt: "2026-11-08T12:00:00.000Z" }));
  });
  const loaded = await loadTutorial(account, "Organization Member");
  assert.equal(loaded.localOnly, true);
  assert.equal(shouldShowPageTour(loaded.status, "page-dashboard"), false);
  assert.equal(shouldShowPageTour(loaded.status, "page-organization"), false);
});
