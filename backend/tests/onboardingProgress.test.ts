import assert from "node:assert/strict";
import test from "node:test";
import { isOnboardingProgress, isFinished, mergeOnboarding, onboardingProgress, updateSection, type OnboardingProgress } from "../../frontend/src/config/onboardingProgress.js";
import { getSidebarTourSteps } from "../../frontend/src/config/tutorialSidebar.js";
import { getDashboardNavItems } from "../../frontend/src/utils/routes.js";
import { isTutorialStatus, nextTutorialStatus, type TutorialStatus } from "../../frontend/src/config/tutorial.js";
import { loadTutorial, localTutorial, saveTutorial } from "../../frontend/src/services/tutorial.service.js";
import { mergeOnboarding as mergeServer, normalizeLegacyOnboarding, onboardingSchema } from "../src/utils/onboardingProgress.js";
import { tutorialStatusSchema } from "../src/utils/tutorialStatus.js";
import { closeUntouchedTutorialControls, rememberTutorialEdit } from "../../frontend/src/components/onboarding/tourCleanup.js";
import { findTourTarget, openTutorialControl } from "../../frontend/src/components/onboarding/tourTargets.js";

const stamp = "2026-11-10T00:00:00.000Z";
const state = (overrides: Partial<TutorialStatus> = {}): TutorialStatus => ({ version: 1, tour: "sidebar", status: "in_progress", step: 0, updatedAt: stamp, ...overrides });
const section = (status: "in_progress" | "completed" | "dismissed", step = 0, updatedAt = stamp) => ({ status, step, updatedAt });

test("welcome eligibility distinguishes new and unfinished accounts from legacy acknowledgements", () => {
  assert.deepEqual(onboardingProgress(null), { version: 1 });
  assert.deepEqual(onboardingProgress(state({ tour: "quick" })), { version: 1 });
  const legacy = onboardingProgress(state({ tour: "page-events", seenPages: ["page-dashboard", "page-events"], step: 1 }));
  assert.equal(legacy.preference?.mode, "guided");
  assert.ok(isFinished(legacy.welcome));
  assert.ok(isFinished(legacy.sidebar));
  assert.equal(legacy.modules?.["page-dashboard"]?.status, "in_progress");
  assert.equal(legacy.modules?.["page-events"]?.status, "in_progress");
  assert.equal(legacy.modules?.["page-events"]?.step, 1);
  assert.equal(onboardingProgress(state({ status: "dismissed" })).preference?.mode, "guided", "Dismissing an old guide did not opt out of all guides");
});

test("legacy inferred opt-outs are repaired consistently while explicit opt-outs remain independent", () => {
  const old: OnboardingProgress = { version: 1, preference: { mode: "independent", updatedAt: stamp }, welcome: section("dismissed"), sidebar: section("dismissed"), modules: { "page-dashboard": section("dismissed"), "page-event-details": section("dismissed") } };
  const fixed = onboardingProgress(state({ tour: "page-dashboard", onboarding: old }));
  assert.equal(fixed.preference?.mode, "guided");
  assert.equal(fixed.preference?.source, "legacy");
  assert.equal(fixed.modules?.["page-dashboard"]?.status, "dismissed");
  assert.equal(fixed.modules?.["page-event-details"]?.status, "in_progress");
  assert.deepEqual(normalizeLegacyOnboarding(old, "page-dashboard"), fixed);
  const explicit: OnboardingProgress = { ...old, preference: { mode: "independent", source: "user", updatedAt: stamp } };
  assert.equal(onboardingProgress(state({ onboarding: explicit })).preference?.mode, "independent");
  assert.deepEqual(normalizeLegacyOnboarding(explicit, "page-dashboard"), explicit);
});

test("each section retains its own completed, dismissed, and in-progress states during replay", () => {
  let progress: OnboardingProgress = { version: 1 };
  progress = updateSection(progress, "welcome", "completed");
  progress = updateSection(progress, "sidebar", "dismissed", 2);
  progress = updateSection(progress, "page-dashboard", "completed", 3);
  progress = updateSection(progress, "page-events", "in_progress", 1);
  const original = structuredClone(progress);
  progress = updateSection(progress, "page-dashboard", "in_progress", 0);
  progress = updateSection(progress, "page-dashboard", "dismissed", 1);
  progress = updateSection(progress, "sidebar", "in_progress", 0);
  assert.deepEqual(progress, original);
  assert.equal(progress.modules?.["page-organization"], undefined); // Absent means not started.
  assert.deepEqual(nextTutorialStatus(state({ onboarding: progress }), "in_progress", 0, "features").onboarding, progress);
});

test("browser and API merge preserve concurrent module completions and the latest opt-out", () => {
  const left: OnboardingProgress = { version: 1, preference: { mode: "guided", updatedAt: stamp }, welcome: section("completed"), sidebar: section("completed", 6), modules: { "page-dashboard": section("completed", 3), "page-events": section("in_progress", 1) } };
  const right: OnboardingProgress = { version: 1, preference: { mode: "independent", updatedAt: "2026-11-11T00:00:00.000Z" }, sidebar: section("in_progress", 0), modules: { "page-dashboard": section("dismissed", 0), "page-events": section("completed", 2), "page-organization": section("dismissed", 1) } };
  for (const merge of [mergeOnboarding, mergeServer]) {
    const progress = merge(left, right)!;
    assert.equal(progress.preference?.mode, "independent");
    assert.equal(progress.sidebar?.status, "completed");
    assert.equal(progress.modules?.["page-dashboard"]?.status, "completed");
    assert.equal(progress.modules?.["page-events"]?.status, "completed");
    assert.equal(progress.modules?.["page-organization"]?.status, "dismissed");
    assert.deepEqual(merge(right, left), progress);
  }
  assert.deepEqual(mergeOnboarding(left, right), mergeServer(left, right));
});

test("browser and API validators accept progress and reject malformed or unbounded onboarding data", () => {
  const valid: OnboardingProgress = { version: 1, preference: { mode: "guided", updatedAt: stamp }, welcome: section("completed"), sidebar: section("in_progress", 2), modules: { "page-events": section("dismissed", 1) } };
  assert.ok(isOnboardingProgress(valid));
  assert.ok(onboardingSchema.safeParse(valid).success);
  assert.ok(isTutorialStatus(state({ onboarding: valid })));
  const { updatedAt: _, ...payload } = state({ onboarding: valid });
  assert.ok(tutorialStatusSchema.safeParse({ ...payload, role: "Organization Member" }).success);
  for (const invalid of [null, {}, { ...valid, version: 99 }, { ...valid, preference: { mode: "invalid", updatedAt: stamp } }, { ...valid, sidebar: section("in_progress", 501) }, { ...valid, sidebar: section("in_progress", -1) }, { ...valid, modules: { "not-a-module": section("completed") } }, { ...valid, welcome: { ...section("completed"), updatedAt: "invalid" } }, { ...valid, modules: [] }]) {
    assert.equal(isOnboardingProgress(invalid), false);
    assert.equal(onboardingSchema.safeParse(invalid).success, false);
    assert.equal(isTutorialStatus({ ...state(), onboarding: invalid }), false);
  }
});

test("sidebar introduction follows actual role navigation, stays on the current page, and never activates links", () => {
  for (const role of ["Admin", "Student Leader", "Organization Member"] as const) {
    const route = role === "Admin" ? "/admin/settings" : "/dashboard/organization";
    const steps = getSidebarTourSteps(role, route);
    assert.deepEqual(steps.slice(0, -2).map((step) => step.target), getDashboardNavItems(role).map((item) => `nav-${item.id}`));
    assert.ok(steps.every((step) => step.route === route && !step.interaction && !step.prepare));
    assert.ok(steps.every((step) => !step.openOnNext || step.openOnNext === "navigation-close"));
    assert.equal(steps.at(-2)?.target, "sidebar-profile");
    assert.equal(steps.at(-1)?.target, "help");
  }
});

test("mobile sidebar demonstration opens once, highlights a real tab, and closes safely", (t) => {
  let open = false;
  const clicks: string[] = [];
  const element = (target: string, visible = true) => ({ getBoundingClientRect: () => ({ width: visible ? 44 : 0, height: visible ? 44 : 0, left: 8, right: 52 }), matches: () => false, click: () => { clicks.push(target); open = target === "navigation-open"; } });
  const globals = {
    window: { innerWidth: 375 }, getComputedStyle: () => ({ visibility: "visible" }),
    document: { querySelectorAll: (selector: string) => selector.includes('navigation-open') ? [element("navigation-open")] : selector.includes('navigation-close') ? open ? [element("navigation-close")] : [] : selector.includes('nav-dashboard') ? [element("nav-dashboard", open)] : [] }
  };
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : Reflect.deleteProperty(globalThis, key));
  }
  const step = getSidebarTourSteps("Organization Member", "/dashboard")[0];
  assert.equal(findTourTarget(step), null);
  assert.deepEqual(openTutorialControl("navigation-open"), { opened: true, close: "navigation-close" });
  assert.ok(findTourTarget(step));
  assert.deepEqual(openTutorialControl("navigation-open"), { opened: false });
  closeUntouchedTutorialControls([{ target: "navigation-close", dirty: false }], openTutorialControl);
  assert.equal(open, false);
  assert.deepEqual(clicks, ["navigation-open", "navigation-close"]);
});

test("demonstration cleanup closes untouched panels and preserves panels with user edits", () => {
  const opened = [{ target: "event-cancel", dirty: false }, { target: "navigation-close", dirty: false }];
  const closed: string[] = [];
  closeUntouchedTutorialControls(opened, (target) => closed.push(target));
  assert.deepEqual(closed, ["navigation-close", "event-cancel"]);
  rememberTutorialEdit(opened, { isTrusted: false, target: {} } as Event, null);
  assert.ok(opened.every((control) => !control.dirty));
  rememberTutorialEdit(opened, { isTrusted: true, target: {} } as Event, { contains: () => true } as unknown as HTMLElement);
  assert.ok(opened.every((control) => !control.dirty));
  rememberTutorialEdit(opened, { isTrusted: true, target: {} } as Event, { contains: () => false } as unknown as HTMLElement);
  closed.length = 0;
  closeUntouchedTutorialControls(opened, (target) => closed.push(target));
  assert.deepEqual(closed, []);
});

test("account sync combines per-module progress from another device and keeps users and roles isolated", async (t) => {
  const user = { uid: "onboarding-device-test", getIdToken: async () => "token" } as Parameters<typeof saveTutorial>[0];
  const local = state({ onboarding: { version: 1, modules: { "page-events": section("completed", 2) } } });
  t.mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  await saveTutorial(user, "Organization Member", local);
  t.mock.restoreAll();
  const remote = state({ updatedAt: "2026-11-11T00:00:00.000Z", onboarding: { version: 1, preference: { mode: "independent", updatedAt: stamp }, modules: { "page-dashboard": section("completed", 3) } } });
  t.mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    const tutorial = init.method === "GET" ? remote : { ...JSON.parse(init.body as string), updatedAt: remote.updatedAt };
    if (init.method === "PUT") {
      assert.equal(tutorial.uid, undefined);
      assert.equal(tutorial.onboarding.modules["page-events"].status, "completed");
      assert.equal(tutorial.onboarding.modules["page-dashboard"].status, "completed");
    }
    return new Response(JSON.stringify({ role: "Organization Member", tutorial }), { status: 200 });
  });
  const result = await loadTutorial(user, "Organization Member");
  assert.equal(result.localOnly, false);
  assert.equal(result.status?.onboarding?.preference?.mode, "independent");
  assert.equal(result.status?.onboarding?.modules?.["page-events"]?.status, "completed");
  assert.equal(localTutorial(user.uid, "Student Leader"), null);
  assert.equal(localTutorial("another-account", "Organization Member"), null);
});
