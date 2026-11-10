import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import * as targets from "../../frontend/src/components/onboarding/tourTargets.js";
import * as cleanup from "../../frontend/src/components/onboarding/tourCleanup.js";
import * as viewDemo from "../../frontend/src/components/onboarding/tourViewDemo.js";
import { getTourSteps, type TourStep } from "../../frontend/src/config/tutorial.js";

function missingTarget(t: TestContext, index: number, automatic: boolean, scenario?: { steps: TourStep[]; width: number; query: (selector: string) => any; queryAll: (selector: string) => any[] }) {
  let now = 0;
  const intervals: (() => void)[] = [], effects: (() => unknown)[] = [], advances: number[] = [], exits: boolean[] = [];
  const states: unknown[] = [];
  t.mock.method(Date, "now", () => now);
  const globals = {
    document: { body: {}, activeElement: null, querySelector: (selector: string) => selector === '[data-tour="workspace"]' ? { getAttribute: () => "true" } : scenario?.query(selector) ?? null, querySelectorAll: (selector: string) => scenario?.queryAll(selector) ?? [], addEventListener: () => {}, removeEventListener: () => {} },
    window: { innerWidth: scenario?.width ?? 375, innerHeight: 700, setInterval: (callback: () => void) => { intervals.push(callback); return intervals.length; }, clearInterval: () => {}, setTimeout: () => 1, clearTimeout: () => {}, addEventListener: () => {}, removeEventListener: () => {} },
    getComputedStyle: () => ({ visibility: "visible", overflowX: "visible", overflowY: "visible" }),
    MutationObserver: class { observe() {} disconnect() {} }, ResizeObserver: class { observe() {} disconnect() {} }
  };
  const restores: (() => void)[] = [], teardowns: (() => void)[] = [];
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    restores.push(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  const react = { useCallback: (callback: unknown) => callback, useId: () => "missing-target", useRef: (current: unknown) => ({ current }), useState: (value: unknown) => { const index = states.push(value) - 1; return [value, (next: unknown) => { states[index] = next; }]; }, useEffect: (effect: () => unknown) => effects.push(effect), useLayoutEffect: (effect: () => unknown) => effects.push(effect) };
  const mocks: Record<string, unknown> = { react, "next/navigation": { usePathname: () => scenario?.steps[0].route ?? "/dashboard", useRouter: () => ({ push: () => assert.fail("No navigation is required") }) }, "./tourTargets": targets, "./tourCleanup": cleanup, "./tourViewDemo": viewDemo };
  const components = new Proxy({}, { get: (_target, name) => String(name) });
  const exports: any = {};
  const code = ts.transpileModule(readFileSync(resolve(__dirname, "../../frontend/src/components/onboarding/GuidedTour.tsx"), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function("exports", "require", code)(exports, (name: string) => mocks[name] || components);
  exports.GuidedTour({ steps: scenario?.steps ?? [0, 1].map((step) => ({ id: String(step), title: "Unavailable", description: "Unavailable", route: "/dashboard", target: "missing" })), index, skipUnavailable: automatic, onStep: (step: number) => advances.push(step), onExit: (complete: boolean) => exits.push(complete) });
  for (const effect of effects) {
    const teardown = effect();
    if (typeof teardown === "function") teardowns.push(() => teardown());
  }
  let disposed = false;
  const dispose = () => { if (disposed) return; disposed = true; for (const teardown of teardowns.reverse()) teardown(); for (const restore of restores.reverse()) restore(); };
  t.after(dispose);
  return { advances, exits, states, dispose, timeout() { now = 4000; for (const tick of intervals) tick(); } };
}

test("automatic guides advance past a disappeared target only once", (t) => {
  const guide = missingTarget(t, 0, true);
  guide.timeout(); guide.timeout();
  assert.deepEqual(guide.advances, [1]);
  assert.deepEqual(guide.exits, []);
});

test("an unavailable final automatic step exits cleanly instead of trapping the user", (t) => {
  const guide = missingTarget(t, 1, true);
  guide.timeout(); guide.timeout();
  assert.deepEqual(guide.advances, []);
  assert.deepEqual(guide.exits, [true]);
});

test("manual walkthroughs retain their explanatory missing-feature behavior", (t) => {
  const guide = missingTarget(t, 0, false);
  guide.timeout();
  assert.deepEqual(guide.advances, []);
  assert.deepEqual(guide.exits, []);
});

test("Organization guides switch tabs and highlight the matching panel separately on phones and desktops", async (t) => {
  for (const width of [375, 1440]) for (const role of ["Student Leader", "Organization Member"] as const) for (const preview of [false, true]) {
    await t.test(`${role}, ${width}px, preview=${preview}`, (t) => {
      let active = "announcements";
      const steps = getTourSteps(role, "page-organization", preview);
      for (const index of [0, 0, 1, 2, 3, 2, 0]) {
        const step = steps[index];
        const name = step.tabTarget!.replace("-tab", "");
        let tabVisible = width !== 375;
        const bounds = (left: number, top: number, rectWidth: number, height: number) => ({ left, right: left + rectWidth, top, bottom: top + height, width: rectWidth, height });
        const common = { parentElement: null, getAttribute: () => null, removeAttribute() {}, addEventListener() {}, removeEventListener() {}, matches: () => false };
        const tab = { ...common, getBoundingClientRect: () => bounds(tabVisible ? 20 : 800, 90, 120, 36), scrollIntoView: () => { tabVisible = true; }, click: () => { active = name; } };
        const panel = { ...common, getBoundingClientRect: () => bounds(20, 160, width - 40, 400), scrollIntoView() {} };
        const query = (selector: string) => selector === `[data-tour="${step.tabTarget}"]` ? tab : selector === `[data-tour="${step.target}"]` && active === name ? panel : null;
        const guide = missingTarget(t, 0, true, { steps: [step], width, query, queryAll: (selector) => { const element = query(selector); return element ? [element] : []; } });
        assert.equal(active, name, "Forward and Back select the requested tab");
        assert.equal(tabVisible, true, "The active tab scrolls fully into view even when its panel was already selected");
        assert.deepEqual(guide.states[0], targets.getTourHighlightRect([panel as unknown as HTMLElement]));
        assert.deepEqual(guide.states[1], targets.getTourHighlightRect([tab as unknown as HTMLElement]));
        assert.deepEqual(guide.advances, []);
        guide.dispose();
      }
    });
  }
});
