import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";
import { AppError } from "../src/utils/AppError.js";
import { MembershipNotificationTracker, membershipNotificationAction } from "../../frontend/src/utils/membershipNotifications.js";

function load(file: string, mocks: Record<string, any>) {
  const code = ts.transpileModule(readFileSync(resolve(__dirname, file), "utf8"), { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS
  } }).outputText;
  const exports: any = {};
  new Function("exports", "require", code)(exports, (name: string) => {
    if (!(name in mocks)) throw Error(`Unexpected import: ${name}`);
    return mocks[name];
  });
  return exports;
}

function server(role = "Student Leader", organizationId: string | null = "club") {
  const profile = { role, organizationId, organizationName: "Campus Club" };
  const notices = new Map<string, any>(), requests = new Map<string, any>();
  let cancelDuringRepair = false;
  const records = (name: string) => name === "notifications" ? notices : name === "organization_join_requests" ? requests : new Map([["viewer", profile]]);
  const ref = (name: string, id: string): any => ({ id, name, get: async () => snapshot(name, id) });
  const snapshot = (name: string, id: string): any => {
    const value = records(name).get(id);
    return { id, ref: ref(name, id), exists: Boolean(value), data: () => value && { ...value } };
  };
  const query = (name: string, filters: any[] = []): any => ({
    where: (key: string, _op: string, value: any) => query(name, [...filters, [key, value]]), doc: (id: string) => ref(name, id),
    get: async () => ({ docs: [...records(name)].filter(([, value]) => filters.every(([key, expected]) => value[key] === expected)).map(([id]) => snapshot(name, id)) })
  });
  const api = load("../src/services/notifications.service.ts", {
    "../config/firebase.js": {
      firebaseAdmin: { firestore: { FieldValue: { serverTimestamp: () => new Date().toISOString(), arrayUnion: (uid: string) => ({ union: uid }) } } },
      firestore: { collection: (name: string) => query(name), runTransaction: async (callback: any) => {
        if (cancelDuringRepair) for (const value of requests.values()) value.status = "cancelled";
        const changes: any[] = [];
        const result = await callback({ get: (target: any) => target.get(), create: (target: any, value: any) => changes.push([target, value]), update: (target: any, value: any) => changes.push([target, value]) });
        for (const [target, value] of changes) {
          const before = records(target.name).get(target.id) || {};
          records(target.name).set(target.id, { ...before, ...value, ...(value.readBy?.union ? { readBy: [...new Set([...(before.readBy || []), value.readBy.union])] } : {}) });
        }
        return result;
      } }
    },
    "./auth.service.js": { getCurrentUser: async () => profile }, "../utils/AppError.js": { AppError }
  });
  return { api, notices, requests, cancelOnRepair: () => { cancelDuringRepair = true; } };
}

test("API delivery includes personal outcomes without membership and never exposes another recipient's alerts", async () => {
  const app = server("Organization Member", null);
  app.notices.set("rejected", { orgId: "club", recipientUID: "viewer", title: "Declined", membershipEvent: "join-rejected", readBy: [], createdAt: "2026-11-18T01:00:00Z" });
  app.notices.set("other", { orgId: "club", recipientUID: "other" });
  app.notices.set("broadcast", { orgId: "club" });
  const result = await app.api.getNotificationsForUser("viewer");
  assert.deepEqual(result.map((item: any) => item.id), ["rejected"]);
  assert.equal(result[0].membershipEvent, "join-rejected");
  await app.api.markNotificationsRead("viewer", ["rejected"]);
  assert.deepEqual(app.notices.get("rejected").readBy, ["viewer"]);
  await assert.rejects(app.api.markNotificationsRead("viewer", ["other"]), /another user's notifications/);
  await assert.rejects(app.api.markNotificationsRead("viewer", ["broadcast"]), /another user's notifications/);
});

test("leader delivery repairs missing alerts for existing pending requests without duplicating or reviving cancelled requests", async () => {
  const app = server();
  app.requests.set("legacy", { organizationId: "club", status: "pending", requestedByUID: "applicant", name: "Student", submittedAt: "2026-11-18T01:00:00Z" });
  app.requests.set("outside", { organizationId: "other-club", status: "pending", requestedByUID: "another" });
  const result = await app.api.getNotificationsForUser("viewer");
  assert.equal(result.length, 1);
  assert.equal(result[0].joinRequestId, "legacy");
  assert.equal(result[0].recipientUID, "viewer");
  await app.api.markNotificationsRead("viewer", [result[0].id]);
  await app.api.getNotificationsForUser("viewer");
  assert.equal(app.notices.size, 1);
  assert.deepEqual(app.notices.get(result[0].id).readBy, ["viewer"]);
  const race = server();
  race.requests.set("withdrawn", { organizationId: "club", status: "pending", requestedByUID: "applicant" });
  race.cancelOnRepair();
  assert.deepEqual(await race.api.getNotificationsForUser("viewer"), []);
});

test("earlier accepted and declined requests receive a missing applicant alert exactly once", async () => {
  for (const status of ["accepted", "rejected"]) {
    const app = server("Organization Member", null);
    app.requests.set("reviewed", { organizationId: "club", requestedByUID: "viewer", status, reviewedAt: "2026-11-18T01:00:00Z" });
    const result = await app.api.getNotificationsForUser("viewer");
    assert.equal(result.length, 1);
    assert.equal(result[0].membershipEvent, status === "accepted" ? "join-accepted" : "join-rejected");
    await app.api.getNotificationsForUser("viewer");
    assert.equal(app.notices.size, 1);
  }
});

test("toasts cover live membership decisions once, defer hidden-tab alerts, and ignore historical or other-account notices", () => {
  const start = Date.parse("2026-11-18T01:00:00Z"), tracker = new MembershipNotificationTracker("viewer", start);
  const notice = { id: "accepted", title: "Accepted", description: "Welcome", type: "organization", time: "Just now", recipientUID: "viewer", unread: true, membershipEvent: "join-accepted", createdAt: new Date(start + 10).toISOString() } as const;
  assert.deepEqual(tracker.collect([{ ...notice, createdAt: new Date(start - 10).toISOString() }, { ...notice, id: "other", recipientUID: "another" }], true), []);
  assert.deepEqual(tracker.collect([notice], false), []);
  assert.deepEqual(tracker.collect([], true), [{ title: "Accepted", description: "Welcome", tone: "success" }]);
  assert.deepEqual(tracker.collect([notice], true), [], "Navigation and reconnects cannot replay the toast");
  assert.equal(tracker.collect([{ ...notice, id: "declined", membershipEvent: "join-rejected" }], true)[0].tone, "info");
  assert.equal(membershipNotificationAction(notice, "Student Leader")?.label, "View organization", "Leader applicants must not be directed to reviewing their own request");
});

test("client streams share one subscription, preserve personal alerts across organizations, and use API fallback after permission errors", async (t) => {
  const intervalDelays: number[] = [];
  const intervals = new Set<() => void>(), listeners = new Map<string, Set<() => void>>(), storage = new Map<string, string>();
  const globals: Record<string, any> = {
    window: { addEventListener: (name: string, fn: () => void) => { const set = listeners.get(name) ?? new Set(); set.add(fn); listeners.set(name, set); }, removeEventListener: (name: string, fn: () => void) => listeners.get(name)?.delete(fn),
      setTimeout: () => 1, clearTimeout: () => {}, setInterval: (fn: () => void, delay: number) => { intervalDelays.push(delay); intervals.add(fn); return fn; }, clearInterval: (fn: () => void) => intervals.delete(fn) },
    document: { hidden: false, addEventListener: () => {}, removeEventListener: () => {} },
    localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) }
  };
  const previous = Object.fromEntries(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true });
  t.after(() => { for (const key of Object.keys(globals)) if (previous[key]) Object.defineProperty(globalThis, key, previous[key]!); else Reflect.deleteProperty(globalThis, key); });
  let apiRecords: any[] = [], apiCalls = 0, stopped = 0;
  const snapshots: any[] = [];
  const service = load("../../frontend/src/services/notifications.service.ts", {
    "firebase/firestore": { collection: (_db: any, name: string) => name, where: (field: string, _op: string, value: any) => ({ field, value }), query: (...parts: any[]) => parts,
      onSnapshot: (query: any, data: any, error: any) => { snapshots.push({ query, data, error }); return () => stopped++; } },
    "../firebase/config": { getFirebaseDb: () => ({}) },
    "./announcements.service": { subscribeAnnouncementsFirestore: (_org: any, _role: any, onData: any) => { onData([]); return () => stopped++; } },
    "./auth.service": { getNotificationRecords: async () => { apiCalls++; return apiRecords; } },
    "@/store/authStore": { useAuthStore: { getState: () => ({ profile: { uid: "viewer", role: "Organization Member" } }) } }
  });
  storage.set("musubi_all_read_timestamp", String(Date.now() + 100000)); // An old account's shared marker must not hide this account's alert.
  let feed: any[] = [], mirror: any[] = [];
  const stop = service.subscribeNotificationsFirestore({ uid: "viewer" }, "new-club", (items: any[]) => { feed = items; });
  const stopMirror = service.subscribeNotificationsFirestore({ uid: "viewer" }, "new-club", (items: any[]) => { mirror = items; });
  assert.equal(snapshots.length, 2);
  assert.ok(snapshots[0].query.some((part: any) => part.field === "recipientUID" && part.value === "viewer"));
  const notice = { recipientUID: "viewer", orgId: "old-club", title: "Declined", description: "Try another club", type: "organization", membershipEvent: "join-rejected", read: false, createdAt: new Date().toISOString() };
  snapshots[0].data({ docs: [{ id: "personal", data: () => notice }] });
  assert.equal(feed[0].id, "personal");
  assert.equal(feed[0].unread, true);
  assert.deepEqual(feed, mirror);
  for (let i = 0; i < 8; i++) await Promise.resolve();
  const callsBeforeFocus = apiCalls;
  for (let i = 0; i < 10; i++) for (const callback of listeners.get("focus") || []) callback();
  for (let i = 0; i < 8; i++) await Promise.resolve();
  assert.equal(apiCalls, callsBeforeFocus, "Repeated tab focus must not re-read the notification history");
  apiRecords = [{ ...notice, id: "api-only", joinRequestId: "request" }];
  snapshots[0].error({ code: "permission-denied" });
  snapshots[1].error({ code: "permission-denied" });
  for (let i = 0; i < 8; i++) await Promise.resolve();
  for (const refresh of intervals) refresh();
  for (let i = 0; i < 8; i++) await Promise.resolve();
  assert.ok(feed.some(item => item.id === "api-only"));
  assert.ok(apiCalls >= 2);
  assert.deepEqual(intervalDelays, [60000], "Both listener errors share a single one-minute fallback");
  stopMirror(); assert.equal(stopped, 0);
  stop(); assert.equal(stopped, 3); assert.equal(intervals.size, 0);
});
