import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";
import * as membershipNotifications from "../../frontend/src/utils/membershipNotifications.js";

function load(relative: string, mocks: Record<string, any>) {
  const code = ts.transpileModule(readFileSync(resolve(__dirname, relative), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  const exports: any = {};
  new Function("exports", "require", code)(exports, (name: string) => {
    if (!(name in mocks)) throw Error(`Unexpected dependency: ${name}`);
    return mocks[name];
  });
  return exports;
}

test("join notices survive the frontend feed, remain separate for new requests, and respect recipients and readBy", () => {
  const callbacks: ((value: any) => void)[] = [];
  let unsubscribed = 0;
  const service = load("../../frontend/src/services/notifications.service.ts", {
    "firebase/firestore": {
      collection: (_db: any, name: string) => name, where: () => ({}), query: (...parts: any[]) => parts,
      onSnapshot: (_query: any, callback: any) => { callbacks.push(callback); return () => unsubscribed++; }
    },
    "../firebase/config": { getFirebaseDb: () => ({}) },
    "./announcements.service": { subscribeAnnouncementsFirestore: (_org: any, _role: any, callback: any) => { callback([]); return () => unsubscribed++; } },
    "./auth.service": {},
    "@/store/authStore": { useAuthStore: { getState: () => ({ profile: { role: "Student Leader" } }) } }
  });
  let feed: any[] = [];
  const stop = service.subscribeNotificationsFirestore({ uid: "leader-one" }, "org", (items: any[]) => { feed = items; });
  const notice = { orgId: "org", recipientUID: "leader-one", title: "New organization join request", description: "Member requested to join Club.", type: "organization", read: false, readBy: [], createdAt: new Date().toISOString() };
  callbacks[0]({ docs: [
    { id: "first", data: () => ({ ...notice, joinRequestId: "request-one" }) },
    { id: "second", data: () => ({ ...notice, joinRequestId: "request-two", readBy: ["leader-one"] }) },
    { id: "other-leader", data: () => ({ ...notice, recipientUID: "leader-two", joinRequestId: "request-one" }) }
  ] });
  assert.equal(feed.length, 2);
  assert.equal(feed.find(n => n.id === "first").joinRequestId, "request-one");
  assert.equal(feed.find(n => n.id === "first").unread, true);
  assert.equal(feed.find(n => n.id === "second").unread, false);
  stop();
  assert.equal(unsubscribed, 3);
});

test("suppressed audit notifications still record the audit without broadcasting a duplicate", () => {
  const writes: any[] = [];
  const audit = load("../src/utils/auditLog.ts", {
    "../config/firebase.js": {
      firestore: { collection: (name: string) => ({ add: async (data: any) => { writes.push({ name, data }); } }) },
      firebaseAdmin: { firestore: { FieldValue: { serverTimestamp: () => "server-time" } } }
    },
    "./cache.js": { appCache: { deletePrefix: () => {} } }
  });
  const data = { action: "Submitted join request to organization", actionCategory: "Organization", orgId: "org", actorName: "Member" };
  audit.writeAuditLog(data, { notify: false });
  assert.deepEqual(writes.map(w => w.name), ["audit_logs"]);
  audit.writeAuditLog({ ...data, action: "Updated organization details" });
  assert.deepEqual(writes.map(w => w.name), ["audit_logs", "audit_logs", "notifications"]);
});

test("the bell opens the membership requests tab for leaders and marks the notice read", () => {
  for (const role of ["Student Leader", "Organization Member"]) {
    const actions: string[] = [];
    const nodes = new Proxy({}, { get: (_target, name) => String(name) });
    const panel = load("../../frontend/src/components/dashboard/NotificationPanel.tsx", {
      react: { useEffect: () => {}, useRef: () => ({ current: null }), useState: () => ["all", () => {}] },
      "react/jsx-runtime": { jsx: (type: any, props: any) => ({ type, props }), jsxs: (type: any, props: any) => ({ type, props }) },
      "next/link": { default: "Link", __esModule: true },
      "next/navigation": { useRouter: () => ({ push: (url: string) => actions.push(url) }) },
      "lucide-react": nodes,
      "@/store/authStore": { useAuthStore: (select: any) => select({ profile: { role } }) }
      , "@/utils/membershipNotifications": membershipNotifications
    });
    const tree = panel.NotificationPanel({ notifications: [{ id: "notice", title: "New organization join request", description: "Member requested to join Club.", type: "organization", joinRequestId: "request/one", unread: true }],
      onRead: (id: string) => actions.push(`read:${id}`), onClose: () => actions.push("close"), onReadAll: () => {} });
    const flatten = (node: any): any[] => Array.isArray(node) ? node.flatMap(flatten) : node && typeof node === "object" ? [node, ...flatten(node.props?.children)] : [];
    flatten(tree).find(n => n.props["aria-label"]?.startsWith("New organization join request")).props.onClick();
    assert.deepEqual(actions, role === "Student Leader" ? ["read:notice", "close", "/dashboard/organization?tab=members&request=request%2Fone"] : ["read:notice"]);
  }
});
