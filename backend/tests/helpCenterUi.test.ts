import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import * as catalog from "../../frontend/src/config/helpCenter.js";
import * as tutorial from "../../frontend/src/config/tutorial.js";

type Node = { type: any; props: Record<string, any> };
function nodes(value: any): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object") return [];
  if (typeof value.type === "function") return nodes(value.type(value.props));
  return [value, ...nodes(value.props?.children)];
}
function text(value: any): string {
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(" ");
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value?.type === "function") return text(value.type(value.props));
  return value?.props ? text(value.props.children) : "";
}

// Render the real Help Center and exercise its selection/search callbacks.
function center(overrides: Record<string, any> = {}) {
  const state: any[] = [];
  let cursor = 0;
  const calls: any[][] = [];
  const react = {
    useState: (initial: any) => {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
      return [state[index], (next: any) => { state[index] = typeof next === "function" ? next(state[index]) : next; }];
    }, useMemo: (value: () => unknown) => value(), useRef: () => ({ current: null }), useEffect: () => {}, useId: () => "help-search"
  };
  const components = new Proxy({}, { get: (_target, name) => String(name) });
  const runtime = { jsx: (type: any, props: any) => ({ type, props }), jsxs: (type: any, props: any) => ({ type, props }) };
  const mocks: Record<string, unknown> = { react, "react/jsx-runtime": runtime, "@/config/helpCenter": catalog, "@/config/tutorial": tutorial };
  const file = resolve(__dirname, "../../frontend/src/components/onboarding/HelpCenter.tsx");
  const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports: any = {};
  new Function("exports", "require", code)(exports, (name: string) => mocks[name] || components);
  const props = { role: "Student Leader", preview: false, eventOpen: false, localOnly: false,
    onStart: (...args: unknown[]) => calls.push(["start", ...args]), onInspect: (route: string) => calls.push(["inspect", route]),
    onClose: () => calls.push(["close"]), onGetStarted: () => calls.push(["started"]), onSidebar: () => calls.push(["sidebar"]), onRestart: () => calls.push(["restart"]), ...overrides };
  const render = () => { cursor = 0; return exports.HelpCenter(props) as Node; };
  const find = (tree: Node, predicate: (node: Node) => boolean) => {
    const match = nodes(tree).find(predicate);
    assert.ok(match, "Expected Help Center control is available");
    return match;
  };
  return { render, find, calls,
    click(tree: Node, label: string) { find(tree, (node) => node.type === "button" && text(node).startsWith(label)).props.onClick(); },
    back(tree: Node) { find(tree, (node) => node.type === "button" && node.props["aria-label"]?.startsWith("Back to")).props.onClick(); },
    search(tree: Node, query: string) { find(tree, (node) => node.type === "input" && node.props.type === "search").props.onChange({ target: { value: query } }); },
    menu(tree: Node, label: string) { find(tree, (node) => node.type === "DropdownMenuItem" && text(node) === label).props.onSelect(); }
  };
}

test("Help home discloses categories before guides; browsing and Back do not launch tours", () => {
  const app = center();
  let tree = app.render();
  assert.match(text(tree), /Help Center/);
  assert.doesNotMatch(text(tree), /Create an event/);
  assert.ok(nodes(tree).some((node) => node.type === "input" && node.props.placeholder === "Search help topics..."));
  app.click(tree, "Events & Tasks"); tree = app.render();
  assert.match(text(tree), /Create an event/);
  assert.doesNotMatch(text(tree), /Browse Help Topics/);
  app.click(tree, "Create an event"); tree = app.render();
  assert.match(text(tree), /Interactive walkthrough/);
  assert.doesNotMatch(text(tree), /estimated|minutes/);
  assert.deepEqual(app.calls, []);
  app.click(tree, "Start walkthrough");
  assert.deepEqual(app.calls, [["start", "event-create"]]);
  app.back(tree); tree = app.render();
  assert.match(text(tree), /Browse, filter, and monitor events/);
  app.back(tree); tree = app.render();
  assert.match(text(tree), /Browse Help Topics/);
});

test("search opens a matching guide directly and preserves its query on Back", () => {
  const app = center();
  app.search(app.render(), "RESOURCES");
  let tree = app.render();
  assert.match(text(tree), /Use AI Task Atomizer/);
  assert.doesNotMatch(text(tree), /Browse Help Topics/);
  app.click(tree, "Use AI Task Atomizer"); tree = app.render();
  assert.match(text(tree), /Describe an event and its resources/);
  app.back(tree); tree = app.render();
  assert.equal(app.find(tree, (node) => node.type === "input").props.value, "RESOURCES");
  app.search(tree, "no-such-topic"); tree = app.render();
  assert.match(text(tree), /No matching topics/);
  assert.match(text(tree), /Try a feature or task name/);
  app.click(tree, "Browse all topics"); tree = app.render();
  assert.match(text(tree), /Browse Help Topics/);
  assert.deepEqual(app.calls, []);
});

test("detailed controls use the existing inspector only after launching the guide", () => {
  const app = center();
  app.click(app.render(), "Organization");
  app.click(app.render(), "Detailed control guide");
  let tree = app.render();
  assert.deepEqual(app.calls, []);
  assert.match(text(tree), /Interactive control guide/);
  app.click(tree, "Start walkthrough");
  assert.deepEqual(app.calls, [["inspect", "/dashboard/organization"]]);
  app.back(tree); tree = app.render();
  assert.match(text(tree), /Create and manage committees/);
});

test("Full Walkthrough is above Quick Tour and resets onboarding while other Help actions retain their behavior", () => {
  const app = center({ currentPageTour: "page-events", resumeTour: "event-browse" });
  let tree = app.render();
  const buttons = nodes(tree).filter((node) => node.type === "button");
  assert.equal(buttons.filter((node) => text(node) === "Full Walkthrough").length, 1);
  assert.doesNotMatch(text(tree), /Restart onboarding/);
  assert.equal(buttons.filter((node) => text(node) === "Get Started").length, 1);
  assert.equal(nodes(tree).some((node) => node.type === "DropdownMenuItem" && text(node) === "Get Started"), false);
  assert.ok(buttons.findIndex((node) => text(node) === "Full Walkthrough") < buttons.findIndex((node) => text(node) === "Start Quick Tour"));
  app.click(tree, "Full Walkthrough");
  app.click(tree, "Start Quick Tour");
  app.click(tree, "Get Started");
  app.menu(tree, "Replay sidebar introduction");
  app.menu(tree, "Replay this page guide");
  app.menu(tree, "Reopen last guide");
  app.menu(tree, "Read the user guide"); tree = app.render();
  assert.match(text(tree), /Your Dashboard/);
  assert.doesNotMatch(text(tree), /Start Quick Tour/);
  app.back(tree); tree = app.render();
  app.find(tree, (node) => node.type === "Dialog").props.onOpenChange(false);
  assert.deepEqual(app.calls, [["restart"], ["start", "quick"], ["started"], ["sidebar"], ["start", "page-events"], ["start", "event-browse", true], ["close"]]);
});

test("contextual help opens the permitted guide details and launches the same walkthrough", () => {
  const app = center({ initialTour: "ai-delegation", preview: true });
  let tree = app.render();
  assert.match(text(tree), /Use AI Task Atomizer/);
  assert.match(text(tree), /membership approval/);
  assert.deepEqual(app.calls, []);
  app.click(tree, "Show me how");
  assert.deepEqual(app.calls, [["start", "ai-delegation"]]);
  app.back(tree); tree = app.render();
  assert.match(text(tree), /Browse, filter, and monitor events/);
  const denied = center({ role: "Organization Member", initialTour: "ai-delegation" });
  assert.match(text(denied.render()), /Browse Help Topics/);
  assert.doesNotMatch(text(denied.render()), /Use AI Task Atomizer/);
});
