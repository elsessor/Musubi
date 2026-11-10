import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import * as tutorial from "../../frontend/src/config/tutorial.js";
import * as pages from "../../frontend/src/config/tutorialPages.js";
import * as workflows from "../../frontend/src/config/tutorialWorkflows.js";
import * as routes from "../../frontend/src/utils/routes.js";
import * as onboarding from "../../frontend/src/config/onboardingProgress.js";
import * as sidebar from "../../frontend/src/config/tutorialSidebar.js";
import * as targets from "../../frontend/src/components/onboarding/tourTargets.js";

type Node = { type: string; props: Record<string, any> };
function find(node: any, predicate: (node: Node) => boolean): Node | undefined {
  if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean);
  if (!node || typeof node !== "object") return undefined;
  return predicate(node) ? node : find(node.props?.children, predicate);
}

// Exercise the actual provider's state and effects without browser or Firebase services.
function provider(t: TestContext, role: "Admin" | "Student Leader" | "Organization Member" = "Student Leader", options: {
  pathname?: string; organizationId?: string | null; onboardingCompleted?: boolean; saved?: tutorial.TutorialStatus | null; loading?: boolean;
} = {}) {
  let eventId: string | null = null, memberProfileId: string | null = null, cursor = 0, dirty = false;
  let pathname = options.pathname ?? "/dashboard/events";
  let blocking = false, ready = true;
  let hiddenTargets: string[] = [];
  let tree: Node;
  const slots: any[] = [];
  let effects: (() => void)[] = [];
  const observers = new Set<() => void>();
  const writes: tutorial.TutorialStatus[] = [];
  const profile = { uid: "event-guide-user", fullName: "Alex Santos", role, organizationId: options.organizationId === undefined ? "org" : options.organizationId, onboardingCompleted: options.onboardingCompleted ?? true };
  const auth = { profile, firebaseUser: { uid: profile.uid }, loading: options.loading ?? false };
  const saved: tutorial.TutorialStatus | null = options.saved === undefined ? { version: 1, status: "completed", step: 1, tour: "page-events", seenPages: ["page-events"], updatedAt: "2026-11-10T00:00:00Z" } : options.saved;
  const useAuthStore = Object.assign((selector: (state: typeof auth) => unknown) => selector(auth), { getState: () => auth });
  const same = (a: unknown[] | undefined, b: unknown[] | undefined) => Boolean(a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index])));
  const react = {
    createContext: () => ({ Provider: "HelpProvider" }), useContext: () => () => {},
    useState(initial: any) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], (update: any) => {
        const next = typeof update === "function" ? update(slots[index]) : update;
        if (!Object.is(next, slots[index])) { slots[index] = next; dirty = true; }
      }];
    },
    useRef(initial: any) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useMemo(value: () => unknown, dependencies: unknown[]) {
      const index = cursor++;
      if (!same(slots[index]?.dependencies, dependencies)) slots[index] = { dependencies, value: value() };
      return slots[index].value;
    },
    useEffect(effect: () => unknown, dependencies?: unknown[]) {
      const index = cursor++;
      if (same(slots[index]?.dependencies, dependencies)) return;
      const previous = slots[index];
      slots[index] = { dependencies };
      effects.push(() => { previous?.cleanup?.(); slots[index].cleanup = effect(); });
    }
  };
  const workspace = {
    getAttribute: (name: string) => name === "data-tutorial-role" ? role : String(ready),
    querySelector: (selector: string) => selector.includes('member-profile-page') ? memberProfileId ? { getAttribute: () => memberProfileId } : null : eventId ? { getAttribute: () => eventId } : null
  };
  const values = {
    window: { innerWidth: 375, innerHeight: 700 },
    getComputedStyle: () => ({ visibility: "visible" }),
    document: { body: {}, querySelector: (selector: string) => selector === '[data-tour="workspace"]' ? workspace : selector.includes('[role="dialog"]') && blocking ? {} : null,
      querySelectorAll: (selector: string) => hiddenTargets.some((target) => selector === `[data-tour="${target}"]`) ? [] : [{ getBoundingClientRect: () => ({ width: 150, height: 40, right: 200, left: 50 }) }] },
    MutationObserver: class {
      constructor(private callback: () => void) {}
      observe() { observers.add(this.callback); }
      disconnect() { observers.delete(this.callback); }
    }
  };
  for (const [key, value] of Object.entries(values)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : Reflect.deleteProperty(globalThis, key));
  }
  const components = new Proxy({}, { get: (_target, name) => String(name) });
  const mocks: Record<string, unknown> = {
    react, "react/jsx-runtime": { jsx: (type: any, props: any) => ({ type, props }), jsxs: (type: any, props: any) => ({ type, props }) },
    "next/navigation": { usePathname: () => pathname, useRouter: () => ({ push: () => assert.fail("An introduction must not navigate away without a selected action") }) },
    "@/store/authStore": { useAuthStore }, "@/config/tutorial": tutorial, "@/config/tutorialPages": pages,
    "@/config/tutorialWorkflows": workflows, "@/utils/routes": routes,
    "@/config/onboardingProgress": onboarding, "@/config/tutorialSidebar": sidebar, "./tourTargets": targets,
    "@/services/tutorial.service": {
      loadTutorial: async () => ({ status: saved, localOnly: false }),
      saveTutorial: async (_user: unknown, _role: unknown, status: tutorial.TutorialStatus) => { writes.push(status); return true; }
    }
  };
  const filename = resolve(__dirname, "../../frontend/src/components/onboarding/TutorialProvider.tsx");
  const code = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports: Record<string, (props: unknown) => Node> = {};
  new Function("exports", "require", code)(exports, (name: string) => mocks[name] || components);
  return {
    writes,
    setHiddenTargets(targets: string[]) { hiddenTargets = targets; for (const observer of observers) observer(); },
    setLoading(value: boolean) { auth.loading = value; },
    setBlocking(value: boolean) { blocking = value; for (const observer of observers) observer(); },
    setReady(value: boolean) { ready = value; for (const observer of observers) observer(); },
    setRoute(route: string) { pathname = route; },
    setEvent(id: string | null) { eventId = id; for (const observer of observers) observer(); },
    setMemberProfile(id: string | null) { memberProfileId = id; for (const observer of observers) observer(); },
    async settle() {
      for (let attempts = 0; attempts < 20; attempts++) {
        dirty = false; cursor = 0; effects = [];
        tree = exports.TutorialProvider({ children: "application" });
        for (const effect of effects) effect();
        await Promise.resolve();
        if (!dirty) return tree;
      }
      assert.fail("Provider state did not settle");
    }
  };
}

test("selecting an event opens a separate guide without changing the URL or interrupting its steps", async (t) => {
  const app = provider(t);
  assert.equal(find(await app.settle(), (node) => node.type === "GuidedTour"), undefined);
  app.setEvent("selected-event");
  let guide = find(await app.settle(), (node) => node.type === "GuidedTour")!;
  assert.equal(guide.props.steps[0].id, "event-details-summary");
  assert.equal(guide.props.index, 0);
  guide.props.onStep(1);
  guide = find(await app.settle(), (node) => node.type === "GuidedTour")!;
  assert.equal(guide.props.index, 1);
  assert.equal(guide.props.steps.length, 9);
  assert.ok(guide.props.steps.every((step: tutorial.TourStep) => !step.prepare && !step.openOnNext));
  assert.equal(app.writes.at(-1)?.tour, "page-event-details");
  assert.deepEqual(app.writes.at(-1)?.seenPages, ["page-events"]);
  assert.equal(app.writes.at(-1)?.onboarding?.modules?.["page-event-details"]?.status, "in_progress");
});

test("leaving an event pauses its introduction; explicitly dismissing it prevents repeat introductions", async (t) => {
  const app = provider(t, "Organization Member");
  await app.settle(); app.setEvent("selected-event");
  assert.ok(find(await app.settle(), (node) => node.type === "GuidedTour"));
  app.setEvent(null);
  assert.equal(find(await app.settle(), (node) => node.type === "GuidedTour"), undefined);
  app.setEvent("another-event");
  const resumed = find(await app.settle(), (node) => node.type === "GuidedTour")!;
  assert.ok(resumed);
  resumed.props.onExit(false);
  await app.settle();
  app.setEvent(null); await app.settle(); app.setEvent("third-event");
  assert.equal(find(await app.settle(), (node) => node.type === "GuidedTour"), undefined);
});

test("an acknowledged event introduction can be replayed through Help for the current event", async (t) => {
  const app = provider(t);
  await app.settle(); app.setEvent("selected-event");
  let tree = await app.settle();
  find(tree, (node) => node.type === "GuidedTour")!.props.onExit(true);
  tree = await app.settle();
  assert.equal(find(tree, (node) => node.type === "GuidedTour"), undefined);
  tree.props.value();
  tree = await app.settle();
  const help = find(tree, (node) => node.type === "HelpCenter")!;
  help.props.onStart(help.props.currentPageTour);
  const replay = find(await app.settle(), (node) => node.type === "GuidedTour")!;
  assert.equal(replay.props.steps[0].id, "event-details-summary");
  assert.equal(replay.props.index, 0);
});

test("a new account receives a personalized welcome and an opt-in sidebar tour without navigating pages", async (t) => {
  const app = provider(t, "Organization Member", { pathname: "/dashboard", organizationId: null, onboardingCompleted: false, saved: null });
  let tree = await app.settle();
  const welcome = find(tree, (node) => node.type === "WelcomeOnboarding")!;
  assert.ok(welcome);
  assert.equal(welcome.props.name, "Alex Santos");
  assert.equal(find(tree, (node) => node.type === "GuidedTour"), undefined);
  assert.equal(app.writes.length, 1);
  assert.equal(app.writes[0].seenPages, undefined); // Welcome must not suppress the page introduction.
  welcome.props.onStart();
  tree = await app.settle();
  const guide = find(tree, (node) => node.type === "GuidedTour")!;
  assert.equal(guide.props.steps[0].id, "sidebar-dashboard");
  assert.ok(guide.props.steps.every((step: tutorial.TourStep) => step.route === "/dashboard"));
  assert.equal(app.writes.at(-1)?.onboarding?.preference?.mode, "guided");
  guide.props.onExit(true);
  tree = await app.settle();
  assert.equal(find(tree, (node) => node.type === "WelcomeOnboarding" || node.type === "GuidedTour"), undefined);
  tree.props.value("started");
  assert.ok(find(await app.settle(), (node) => node.type === "GetStarted"));
});

test("unaffiliated accounts can start the full walkthrough and receive a separate Organization preview guide", async (t) => {
  const app = provider(t, "Student Leader", { pathname: "/dashboard", organizationId: "  " });
  let tree = await app.settle();
  find(tree, (node) => node.type === "GuidedTour")!.props.onExit(true);
  tree = await app.settle(); tree.props.value("started"); tree = await app.settle();
  find(tree, (node) => node.type === "GetStarted")!.props.onWalkthrough();
  tree = await app.settle();
  const walkthrough = find(tree, (node) => node.type === "GuidedTour")!;
  assert.equal(app.writes.at(-1)?.tour, "features");
  assert.match(walkthrough.props.steps.find((step: tutorial.TourStep) => step.id === "events").description, /Placeholder|placeholder/);
  walkthrough.props.onExit(false);
  await app.settle();
  app.setRoute("/dashboard/organization");
  const organization = find(await app.settle(), (node) => node.type === "GuidedTour")!;
  assert.equal(organization.props.steps[0].id, "organization-overview");
  assert.match(organization.props.steps[0].description, /preview|Preview/);
  assert.deepEqual(app.writes.at(-1)?.seenPages, ["page-events", "page-dashboard"]);
  assert.equal(app.writes.at(-1)?.onboarding?.modules?.["page-organization"]?.status, "in_progress");
});

test("existing accounts keep their page introductions and can reopen Get Started without resetting progress", async (t) => {
  const app = provider(t, "Organization Member", { organizationId: null, pathname: "/dashboard/organization" });
  let tree = await app.settle();
  assert.equal(find(tree, (node) => node.type === "GetStarted"), undefined);
  const guide = find(tree, (node) => node.type === "GuidedTour")!;
  assert.equal(guide.props.steps[0].id, "organization-overview");
  guide.props.onExit(true);
  tree = await app.settle();
  const previous = app.writes.at(-1);
  tree.props.value();
  tree = await app.settle();
  find(tree, (node) => node.type === "HelpCenter")!.props.onGetStarted();
  const welcome = find(await app.settle(), (node) => node.type === "GetStarted")!;
  welcome.props.onClose();
  await app.settle();
  assert.equal(app.writes.at(-1), previous);
});

test("contextual Help opens guide details before invoking the existing walkthrough", async (t) => {
  const app = provider(t);
  let tree = await app.settle();
  tree.props.value("guide", "ai-delegation");
  tree = await app.settle();
  const help = find(tree, (node) => node.type === "HelpCenter")!;
  assert.equal(help.props.initialTour, "ai-delegation");
  assert.equal(find(tree, (node) => node.type === "GuidedTour"), undefined);
  assert.equal(app.writes.length, 0);
  help.props.onStart("ai-delegation");
  const guide = find(await app.settle(), (node) => node.type === "GuidedTour")!;
  assert.deepEqual(guide.props.steps, tutorial.getTourSteps("Student Leader", "ai-delegation"));
  assert.equal(app.writes.at(-1)?.tour, "ai-delegation");
});

test("a member cannot open a leader-only guide through contextual Help", async (t) => {
  const app = provider(t, "Organization Member");
  const tree = await app.settle();
  tree.props.value("guide", "ai-delegation");
  const next = await app.settle();
  assert.equal(find(next, (node) => node.type === "HelpCenter" || node.type === "GuidedTour"), undefined);
  assert.equal(app.writes.length, 0);
});

test("Explore on My Own suppresses all automatic module tours across navigation and reload", async (t) => {
  const app = provider(t, "Organization Member", { pathname: "/dashboard", saved: null });
  find(await app.settle(), (node) => node.type === "WelcomeOnboarding")!.props.onDismiss();
  let tree = await app.settle();
  assert.equal(find(tree, (node) => node.type === "GuidedTour" || node.type === "WelcomeOnboarding"), undefined);
  assert.equal(app.writes.at(-1)?.onboarding?.preference?.mode, "independent");
  assert.equal(app.writes.at(-1)?.onboarding?.welcome?.status, "dismissed");
  assert.equal(app.writes.at(-1)?.seenPages, undefined);
  for (const route of ["/dashboard/events", "/dashboard/organization", "/dashboard/profile"]) {
    app.setRoute(route); tree = await app.settle();
    assert.equal(find(tree, (node) => node.type === "GuidedTour" || node.type === "WelcomeOnboarding"), undefined);
  }
  const refreshed = provider(t, "Organization Member", { pathname: "/dashboard", saved: app.writes.at(-1) });
  tree = await refreshed.settle();
  assert.equal(find(tree, (node) => node.type === "GuidedTour" || node.type === "WelcomeOnboarding"), undefined);
  tree.props.value(); tree = await refreshed.settle();
  find(tree, (node) => node.type === "HelpCenter")!.props.onStart("page-dashboard");
  assert.ok(find(await refreshed.settle(), (node) => node.type === "GuidedTour"));
});

test("an interrupted module resumes its saved step after reload; a completed guide keeps completion during replay", async (t) => {
  const app = provider(t);
  await app.settle(); app.setEvent("event");
  find(await app.settle(), (node) => node.type === "GuidedTour")!.props.onStep(1);
  await app.settle();
  const refreshed = provider(t, "Student Leader", { saved: app.writes.at(-1) });
  await refreshed.settle(); refreshed.setEvent("event");
  let tree = await refreshed.settle();
  const guide = find(tree, (node) => node.type === "GuidedTour")!;
  assert.equal(guide.props.index, 1);
  guide.props.onExit(true); tree = await refreshed.settle();
  tree.props.value(); tree = await refreshed.settle();
  find(tree, (node) => node.type === "HelpCenter")!.props.onStart("page-event-details");
  tree = await refreshed.settle();
  assert.equal(refreshed.writes.at(-1)?.onboarding?.modules?.["page-event-details"]?.status, "completed");
  find(tree, (node) => node.type === "GuidedTour")!.props.onExit(false);
  await refreshed.settle();
  assert.equal(refreshed.writes.at(-1)?.onboarding?.modules?.["page-event-details"]?.status, "completed");
});

test("sidebar progress resumes without welcome and Help Center can replay or restart onboarding", async (t) => {
  const progress: tutorial.TutorialStatus = { version: 1, status: "in_progress", step: 2, tour: "sidebar", updatedAt: "2026-11-10T00:00:00Z", onboarding: { version: 1, preference: { mode: "guided", updatedAt: "2026-11-10T00:00:00Z" }, welcome: { status: "completed", step: 0, updatedAt: "2026-11-10T00:00:00Z" }, sidebar: { status: "in_progress", step: 2, updatedAt: "2026-11-10T00:00:00Z" } } };
  const app = provider(t, "Student Leader", { pathname: "/dashboard/organization", saved: progress });
  let tree = await app.settle();
  let guide = find(tree, (node) => node.type === "GuidedTour")!;
  assert.equal(guide.props.index, 2);
  assert.ok(guide.props.steps.every((step: tutorial.TourStep) => step.route === "/dashboard/organization"));
  assert.equal(find(tree, (node) => node.type === "WelcomeOnboarding"), undefined);
  guide.props.onExit(true); tree = await app.settle(); tree.props.value(); tree = await app.settle();
  find(tree, (node) => node.type === "HelpCenter")!.props.onSidebar();
  tree = await app.settle(); guide = find(tree, (node) => node.type === "GuidedTour")!;
  assert.equal(guide.props.index, 0);
  assert.equal(app.writes.at(-1)?.onboarding?.sidebar?.status, "completed");
  guide.props.onExit(false); tree = await app.settle(); tree.props.value(); tree = await app.settle();
  find(tree, (node) => node.type === "HelpCenter")!.props.onRestart();
  tree = await app.settle();
  const started = find(tree, (node) => node.type === "GetStarted")!;
  assert.ok(started);
  assert.equal(started.props.role, "Student Leader");
  assert.equal(started.props.hasOrganization, true);
  assert.equal(find(tree, (node) => node.type === "WelcomeOnboarding" || node.type === "GuidedTour"), undefined);
  started.props.onWalkthrough();
  tree = await app.settle();
  const welcome = find(tree, (node) => node.type === "WelcomeOnboarding")!;
  assert.ok(welcome);
  assert.equal(find(tree, (node) => node.type === "GuidedTour" || node.type === "GetStarted"), undefined);
  welcome.props.onStart();
  tree = await app.settle();
  guide = find(tree, (node) => node.type === "GuidedTour")!;
  assert.equal(guide.props.index, 0);
  assert.deepEqual(guide.props.steps, sidebar.getSidebarTourSteps("Student Leader", "/dashboard/organization"));
  assert.equal(app.writes.at(-1)?.onboarding?.preference?.mode, "guided");
  guide.props.onExit(false);
  assert.equal(find(await app.settle(), (node) => node.type === "WelcomeOnboarding" || node.type === "GuidedTour"), undefined);
});

test("restart acknowledgement continues to the welcome choice while closing or reopening Get Started stays separate", async (t) => {
  const stamp = "2026-11-10T00:00:00Z";
  const app = provider(t, "Organization Member", { organizationId: null, saved: { version: 1, tour: "quick", status: "dismissed", step: 0, updatedAt: stamp, onboarding: { version: 1, preference: { mode: "independent", source: "user", updatedAt: stamp } } } });
  let tree = await app.settle();
  tree.props.value(); tree = await app.settle();
  find(tree, (node) => node.type === "HelpCenter")!.props.onRestart();
  tree = await app.settle();
  let started = find(tree, (node) => node.type === "GetStarted")!;
  assert.equal(started.props.hasOrganization, false);
  started.props.onClose();
  tree = await app.settle();
  assert.equal(find(tree, (node) => node.type === "WelcomeOnboarding" || node.type === "GuidedTour"), undefined);
  assert.equal(app.writes.length, 1);
  assert.equal(app.writes[0].acknowledged, false);
  assert.deepEqual(app.writes[0].seenPages, []);
  assert.ok(app.writes[0].onboarding?.restartedAt);
  tree.props.value(); tree = await app.settle();
  find(tree, (node) => node.type === "HelpCenter")!.props.onGetStarted();
  tree = await app.settle();
  started = find(tree, (node) => node.type === "GetStarted")!;
  assert.equal(started.props.onContinue, undefined);
  started.props.onClose(); tree = await app.settle();
  tree.props.value(); tree = await app.settle();
  find(tree, (node) => node.type === "HelpCenter")!.props.onRestart();
  tree = await app.settle();
  find(tree, (node) => node.type === "GetStarted")!.props.onContinue();
  tree = await app.settle();
  find(tree, (node) => node.type === "WelcomeOnboarding")!.props.onDismiss();
  tree = await app.settle();
  assert.equal(find(tree, (node) => node.type === "GuidedTour" || node.type === "WelcomeOnboarding"), undefined);
  assert.equal(app.writes.at(-1)?.onboarding?.preference?.mode, "independent");
});

test("restarting a completed account restores automatic page and event introductions and resumes the new attempt", async (t) => {
  const stamp = "2026-11-10T00:00:00Z";
  const complete = { status: "completed", step: 3, updatedAt: stamp } as const;
  const saved: tutorial.TutorialStatus = { version: 1, tour: "page-event-details", status: "completed", step: 8, acknowledged: true, updatedAt: stamp, seenPages: ["page-dashboard", "page-organization", "page-events", "page-event-details"], onboarding: { version: 1, preference: { mode: "guided", source: "user", updatedAt: stamp }, welcome: complete, sidebar: complete, modules: { "page-dashboard": complete, "page-organization": complete, "page-events": complete, "page-event-details": complete } } };
  const app = provider(t, "Student Leader", { pathname: "/dashboard", saved });
  let tree = await app.settle();
  assert.equal(find(tree, (node) => node.type === "GuidedTour"), undefined);
  tree.props.value(); tree = await app.settle();
  find(tree, (node) => node.type === "HelpCenter")!.props.onRestart();
  tree = await app.settle();
  const reset = app.writes.at(-1)!;
  assert.ok(reset.onboarding?.restartedAt);
  assert.deepEqual(reset.seenPages, []);
  assert.equal(reset.acknowledged, false);
  assert.equal(reset.onboarding?.modules, undefined);
  find(tree, (node) => node.type === "GetStarted")!.props.onContinue();
  tree = await app.settle();
  find(tree, (node) => node.type === "WelcomeOnboarding")!.props.onStart();
  tree = await app.settle();
  find(tree, (node) => node.type === "GuidedTour")!.props.onExit(true);
  tree = await app.settle();
  let guide = find(tree, (node) => node.type === "GuidedTour")!;
  assert.equal(guide.props.steps[0].id, "dashboard-overview");
  assert.equal(guide.props.index, 0);
  guide.props.onExit(true); await app.settle();
  app.setRoute("/dashboard/organization"); tree = await app.settle();
  guide = find(tree, (node) => node.type === "GuidedTour")!;
  assert.equal(guide.props.steps[0].id, "organization-overview");
  assert.equal(guide.props.index, 0);
  guide.props.onExit(true); await app.settle();
  app.setRoute("/dashboard/events"); tree = await app.settle();
  guide = find(tree, (node) => node.type === "GuidedTour")!;
  assert.equal(guide.props.steps[0].id, "events-overview");
  guide.props.onExit(true); await app.settle();
  app.setEvent("new-attempt-event"); tree = await app.settle();
  guide = find(tree, (node) => node.type === "GuidedTour")!;
  assert.equal(guide.props.steps[0].id, "event-details-summary");
  assert.equal(guide.props.index, 0);
  guide.props.onStep(2); await app.settle();
  const resumed = provider(t, "Student Leader", { saved: app.writes.at(-1)! });
  resumed.setEvent("new-attempt-event");
  tree = await resumed.settle();
  assert.equal(find(tree, (node) => node.type === "GuidedTour")!.props.index, 2);
  assert.equal(resumed.writes.at(-1)?.onboarding?.restartedAt, reset.onboarding?.restartedAt);
});

test("automatic introductions wait for workspace readiness and blocking dialogs", async (t) => {
  const app = provider(t);
  await app.settle(); app.setBlocking(true); app.setEvent("event");
  assert.equal(find(await app.settle(), (node) => node.type === "GuidedTour"), undefined);
  app.setBlocking(false); app.setReady(false);
  assert.equal(find(await app.settle(), (node) => node.type === "GuidedTour"), undefined);
  app.setReady(true);
  assert.ok(find(await app.settle(), (node) => node.type === "GuidedTour"));
});

test("automatic tours wait for late targets and omit unavailable controls from their step count", async (t) => {
  const app = provider(t, "Student Leader", { pathname: "/dashboard" });
  app.setHiddenTargets(["dashboard-summary", "dashboard-work", "dashboard-updates", "help"]);
  assert.equal(find(await app.settle(), (node) => node.type === "GuidedTour"), undefined);
  app.setHiddenTargets(["dashboard-updates"]);
  const guide = find(await app.settle(), (node) => node.type === "GuidedTour")!;
  assert.equal(guide.props.steps.length, 3);
  assert.ok(guide.props.steps.every((step: tutorial.TourStep) => step.target !== "dashboard-updates"));
});

test("welcome waits until authentication and account progress have loaded", async (t) => {
  const app = provider(t, "Organization Member", { pathname: "/dashboard", saved: null, loading: true });
  assert.equal(find(await app.settle(), (node) => node.type === "WelcomeOnboarding"), undefined);
  assert.equal(app.writes.length, 0);
  app.setLoading(false);
  assert.ok(find(await app.settle(), (node) => node.type === "WelcomeOnboarding"));
});

test("visiting a member receives a separate profile guide with only permitted metric explanations", async (t) => {
  for (const role of ["Admin", "Student Leader", "Organization Member"] as const) await t.test(role, async (t) => {
    const stamp = "2026-11-10T00:00:00Z";
    const app = provider(t, role, { pathname: "/dashboard/organization/member-profile", saved: { version: 1, tour: "page-profile", status: "completed", step: 6, updatedAt: stamp, seenPages: ["page-profile"] } });
    app.setReady(false); app.setMemberProfile("member-one");
    assert.equal(find(await app.settle(), (node) => node.type === "GuidedTour"), undefined);
    app.setReady(true);
    let tree = await app.settle();
    let guide = find(tree, (node) => node.type === "GuidedTour")!;
    assert.equal(guide.props.index, 0);
    assert.equal(guide.props.steps.length, role === "Organization Member" ? 4 : 7);
    assert.equal(guide.props.steps[0].target, "profile-page");
    guide.props.onStep(1); await app.settle();
    app.setMemberProfile("member-two"); tree = await app.settle();
    guide = find(tree, (node) => node.type === "GuidedTour")!;
    assert.equal(guide.props.index, 1);
    guide.props.onExit(true); tree = await app.settle();
    assert.equal(app.writes.at(-1)?.onboarding?.modules?.["page-member-profile"]?.status, "completed");
    tree.props.value(); tree = await app.settle();
    const help = find(tree, (node) => node.type === "HelpCenter")!;
    assert.equal(help.props.memberProfileOpen, true);
    help.props.onStart("page-member-profile");
    assert.equal(find(await app.settle(), (node) => node.type === "GuidedTour")!.props.index, 0);
  });
});

test("legacy dismissed-guide history does not suppress an unintroduced event workspace", async (t) => {
  const stamp = "2026-11-10T00:00:00Z";
  const app = provider(t, "Student Leader", { saved: { version: 1, tour: "page-events", status: "dismissed", step: 1, seenPages: ["page-events", "page-event-details"], updatedAt: stamp, onboarding: { version: 1, preference: { mode: "independent", updatedAt: stamp }, welcome: { status: "dismissed", step: 0, updatedAt: stamp }, sidebar: { status: "dismissed", step: 0, updatedAt: stamp }, modules: { "page-events": { status: "dismissed", step: 1, updatedAt: stamp }, "page-event-details": { status: "dismissed", step: 0, updatedAt: stamp } } } } });
  await app.settle(); app.setEvent("clicked-event");
  const guide = find(await app.settle(), (node) => node.type === "GuidedTour")!;
  assert.equal(guide.props.steps[0].id, "event-details-summary");
  assert.equal(app.writes.at(-1)?.onboarding?.preference?.source, "legacy");
});

test("quiet mode after the sidebar does not permanently suppress the Dashboard introduction", async (t) => {
  const stamp = "2026-11-10T00:00:00Z";
  const app = provider(t, "Organization Member", { pathname: "/dashboard", saved: { version: 1, tour: "sidebar", status: "in_progress", step: 1, updatedAt: stamp, onboarding: { version: 1, preference: { mode: "guided", source: "user", updatedAt: stamp }, sidebar: { status: "in_progress", step: 1, updatedAt: stamp }, modules: { "page-events": { status: "completed", step: 1, updatedAt: stamp } } } } });
  find(await app.settle(), (node) => node.type === "GuidedTour")!.props.onExit(true);
  assert.equal(find(await app.settle(), (node) => node.type === "GuidedTour"), undefined);
  app.setRoute("/dashboard/events");
  assert.equal(find(await app.settle(), (node) => node.type === "GuidedTour"), undefined);
  app.setRoute("/dashboard");
  assert.equal(find(await app.settle(), (node) => node.type === "GuidedTour")!.props.steps[0].id, "dashboard-overview");
});

test("every permitted module supports automatic introductions without organization membership", async (t) => {
  const stamp = "2026-11-10T00:00:00Z";
  for (const role of ["Admin", "Student Leader", "Organization Member"] as const) for (const page of pages.getPageTours(role)) {
    await t.test(`${role}: ${page.id}`, async (t) => {
      const app = provider(t, role, { pathname: page.route, organizationId: null, onboardingCompleted: false, saved: { version: 1, tour: "features", status: "completed", step: 0, updatedAt: stamp, onboarding: { version: 1, preference: { mode: "guided", source: "user", updatedAt: stamp }, sidebar: { status: "completed", step: 0, updatedAt: stamp } } } });
      if (page.id === "page-event-details") app.setEvent("workspace-preview");
      const guide = find(await app.settle(), (node) => node.type === "GuidedTour")!;
      assert.ok(guide, "A page introduction starts before joining an organization");
      assert.equal(app.writes.at(-1)?.tour, page.id);
      assert.equal(guide.props.steps[0].id, page.steps[0].id);
      if (page.id === "page-event-details") assert.match(guide.props.steps[0].description, /preview|Preview/);
    });
  }
});
