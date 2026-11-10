import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import * as targets from "../../frontend/src/components/onboarding/tourTargets.js";
import * as cleanup from "../../frontend/src/components/onboarding/tourCleanup.js";

function missingTarget(t: TestContext, index: number, automatic: boolean) {
  let now = 0;
  const intervals: (() => void)[] = [], effects: (() => unknown)[] = [], advances: number[] = [], exits: boolean[] = [];
  t.mock.method(Date, "now", () => now);
  const globals = {
    document: { body: {}, activeElement: null, querySelector: (selector: string) => selector === '[data-tour="workspace"]' ? { getAttribute: () => "true" } : null, querySelectorAll: () => [], addEventListener: () => {}, removeEventListener: () => {} },
    window: { innerWidth: 375, innerHeight: 700, setInterval: (callback: () => void) => { intervals.push(callback); return intervals.length; }, clearInterval: () => {}, setTimeout: () => 1, clearTimeout: () => {}, addEventListener: () => {}, removeEventListener: () => {} },
    MutationObserver: class { observe() {} disconnect() {} }, ResizeObserver: class { observe() {} disconnect() {} }
  };
  const restores: (() => void)[] = [], teardowns: (() => void)[] = [];
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    restores.push(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  const react = { useCallback: (callback: unknown) => callback, useId: () => "missing-target", useRef: (current: unknown) => ({ current }), useState: (value: unknown) => [value, () => {}], useEffect: (effect: () => unknown) => effects.push(effect), useLayoutEffect: (effect: () => unknown) => effects.push(effect) };
  const mocks: Record<string, unknown> = { react, "next/navigation": { usePathname: () => "/dashboard", useRouter: () => ({ push: () => assert.fail("No navigation is required") }) }, "./tourTargets": targets, "./tourCleanup": cleanup };
  const components = new Proxy({}, { get: (_target, name) => String(name) });
  const exports: any = {};
  const code = ts.transpileModule(readFileSync(resolve(__dirname, "../../frontend/src/components/onboarding/GuidedTour.tsx"), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function("exports", "require", code)(exports, (name: string) => mocks[name] || components);
  exports.GuidedTour({ steps: [0, 1].map((step) => ({ id: String(step), title: "Unavailable", description: "Unavailable", route: "/dashboard", target: "missing" })), index, skipUnavailable: automatic, onStep: (step: number) => advances.push(step), onExit: (complete: boolean) => exits.push(complete) });
  for (const effect of effects) {
    const teardown = effect();
    if (typeof teardown === "function") teardowns.push(() => teardown());
  }
  t.after(() => { for (const teardown of teardowns.reverse()) teardown(); for (const restore of restores.reverse()) restore(); });
  return { advances, exits, timeout() { now = 4000; for (const tick of intervals) tick(); } };
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
