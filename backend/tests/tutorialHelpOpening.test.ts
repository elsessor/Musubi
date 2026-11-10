import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

test("manual Help opens before remote progress is loaded without starting an automatic popup", () => {
  let cursor = 0;
  const state: any[] = [];
  const jsx = (type: any, props: any) => ({ type, props });
  const react = {
    createContext: () => ({ Provider: "HelpProvider" }),
    useState: (initial: any) => {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], (value: any) => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
    },
    useRef: (value: any) => ({ current: value }), useEffect: () => {},
    useMemo: (callback: any) => callback()
  };
  const auth = { loading: false, firebaseUser: { uid: "member" },
    profile: { uid: "member", role: "Organization Member", organizationId: "org" } };
  const mocks: Record<string, any> = {
    react, "react/jsx-runtime": { jsx, jsxs: jsx },
    "next/navigation": { usePathname: () => "/dashboard", useRouter: () => ({}) },
    "@/store/authStore": { useAuthStore: (selector: any) => selector(auth) },
    "@/config/tutorial": { tutorialKey: () => "member:role", getTourSteps: () => [] },
    "@/config/tutorialPages": { getPageTourForRoute: () => undefined, PAGE_TOUR_IDS: [] },
    "./HelpCenter": { HelpCenter: "HelpCenter" },
    "./TutorialPreviewContext": { TutorialPreviewContext: { Provider: "TutorialPreviewProvider" } }
  };
  const source = readFileSync(resolve(__dirname, "../../frontend/src/components/onboarding/TutorialProvider.tsx"), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX
  } }).outputText;
  const exports: any = {};
  new Function("exports", "require", code)(exports, (name: string) => mocks[name] || {});
  const render = () => { cursor = 0; return exports.TutorialProvider({ children: "app" }); };
  let tree = render();
  assert.ok(!tree.props.children.some((child: any) => child?.type === "HelpCenter"));
  tree.props.value();
  tree = render();
  assert.ok(tree.props.children.some((child: any) => child?.type === "HelpCenter"));
});
