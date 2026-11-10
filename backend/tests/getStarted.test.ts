import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

type Node = { type: string; props: Record<string, any> };
function nodes(value: any): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object") return [];
  return [value, ...nodes(value.props?.children)];
}
function text(value: any): string {
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(" ");
  if (typeof value === "string" || typeof value === "number") return String(value);
  return value?.props ? text(value.props.children) : "";
}

function guide(role: string, hasOrganization: boolean, restarting = false) {
  let section = "welcome";
  const calls: string[] = [];
  const components = new Proxy({}, { get: (_target, name) => String(name) });
  const runtime = { jsx: (type: string, props: any) => ({ type, props }), jsxs: (type: string, props: any) => ({ type, props }) };
  const code = ts.transpileModule(readFileSync(resolve(__dirname, "../../frontend/src/components/onboarding/GetStarted.tsx"), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  const exports: any = {};
  new Function("exports", "require", code)(exports, (name: string) => name === "react" ? { useState: () => [section, (next: string) => { section = next; }] } : name === "react/jsx-runtime" ? runtime : components);
  const action = (name: string) => () => calls.push(name);
  const props = { role, hasOrganization, onClose: action("close"), onContinue: restarting ? action("continue") : undefined, onWalkthrough: action("walkthrough"), onPageGuide: action("page"), onHelp: action("help"), onOrganization: action("organization") };
  return {
    calls, render: () => exports.GetStarted(props),
    click(tree: Node, label: string) {
      const button = nodes(tree).find((node) => node.type === "button" && text(node).endsWith(label));
      assert.ok(button, `Missing action: ${label}`);
      button.props.onClick();
    }
  };
}

test("Get Started offers all sections and connects walkthrough, page guide, Help, and closing actions", () => {
  const app = guide("Organization Member", false);
  let tree = app.render();
  assert.match(text(tree), /Welcome to Musubi/);
  assert.match(text(tree), /before joining/);
  app.click(tree, "Start walkthrough");
  app.click(tree, "Your access"); tree = app.render();
  assert.match(text(tree), /pending join request does not grant membership/);
  assert.match(text(tree), /Claiming tasks, submitting work/);
  app.click(tree, "Open Organization");
  app.click(tree, "Work flow"); tree = app.render();
  assert.match(text(tree), /wait for the leader's approval/);
  app.click(tree, "Page tours"); tree = app.render();
  app.click(tree, "Replay this page guide");
  app.click(tree, "Help / User Guide");
  app.click(tree, "I understand");
  assert.deepEqual(app.calls, ["walkthrough", "organization", "page", "help", "close"]);
});

test("restart acknowledgement continues onboarding while dismissing the dialog only closes it", () => {
  const app = guide("Student Leader", false, true);
  const tree = app.render();
  app.click(tree, "I understand");
  nodes(tree).find((node) => node.type === "Dialog")!.props.onOpenChange(false);
  assert.deepEqual(app.calls, ["continue", "close"]);
});

test("access instructions distinguish pending leaders, joined members, and administrators", () => {
  for (const [role, joined, expected] of [
    ["Student Leader", false, /AI planning.*require active membership/],
    ["Organization Member", true, /claim eligible tasks/],
    ["Admin", false, /Review organization applications/]
  ] as const) {
    const app = guide(role, joined);
    app.click(app.render(), "Your access");
    const tree = app.render();
    assert.match(text(tree), expected);
    const joining = nodes(tree).some((node) => node.type === "button" && text(node) === "Open Organization");
    assert.equal(joining, role === "Student Leader" && !joined);
    if (role === "Admin") assert.doesNotMatch(text(tree), /Organization membership is not active/);
  }
});
