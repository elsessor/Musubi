import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

type Node = { type: string; props: Record<string, any> };
const nodes = (value: any): Node[] => Array.isArray(value) ? value.flatMap(nodes) : value && typeof value === "object" ? [value, ...nodes(value.props?.children)] : [];
const text = (value: any): string => Array.isArray(value) ? value.map(text).join("") : typeof value === "string" ? value : value?.props ? text(value.props.children) : "";
const components = new Proxy({}, { get: (_target, name) => String(name) });
const jsx = (type: string, props: any) => ({ type, props });
const exports: any = {};
const source = readFileSync(resolve(__dirname, "../../frontend/src/components/onboarding/WelcomeOnboarding.tsx"), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
new Function("exports", "require", code)(exports, (name: string) => name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : components);

test("welcome greets users by first name and both independent exploration and dialog dismissal use opt-out", () => {
  const calls: string[] = [];
  const tree = exports.WelcomeOnboarding({ name: "  Alex Maria Santos  ", admin: false, onStart: () => calls.push("start"), onDismiss: () => calls.push("dismiss") });
  const all = nodes(tree);
  const heading = all.find((node) => node.type === "DialogTitle")!;
  assert.equal(text(heading), "Welcome to Musubi, Alex!");
  assert.match(text(tree), /Help Center/);
  all.find((node) => node.type === "button" && text(node).startsWith("Let's Get Started"))!.props.onClick();
  all.find((node) => node.type === "button" && text(node) === "Explore on My Own")!.props.onClick();
  all.find((node) => node.type === "Dialog")!.props.onOpenChange(false);
  assert.deepEqual(calls, ["start", "dismiss", "dismiss"]);
});

test("welcome handles empty names and describes the actual administrative workspace", () => {
  const tree = exports.WelcomeOnboarding({ name: " ", admin: true, onStart: () => {}, onDismiss: () => {} });
  assert.equal(text(nodes(tree).find((node) => node.type === "DialogTitle")), "Welcome to Musubi!");
  assert.match(text(tree), /organizations, accounts, and platform activity/);
});
