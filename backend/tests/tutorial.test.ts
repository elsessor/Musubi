import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { User } from "firebase/auth";
import { getTourSteps, isTutorialStatus, nextTutorialStatus, shouldOfferTutorial, tutorialKey, type TutorialStatus } from "../../frontend/src/config/tutorial.js";
import { loadTutorial, localTutorial, saveTutorial } from "../../frontend/src/services/tutorial.service.js";
import { tutorialStatusSchema } from "../src/utils/tutorialStatus.js";

const roles = ["Admin", "Student Leader", "Organization Member"] as const;
const progress = (status: TutorialStatus["status"] = "completed", step = 0): TutorialStatus => ({ version: 1, status, step, tour: "quick", updatedAt: "2026-11-07T12:00:00.000Z" });
const user = (uid: string) => ({ uid, getIdToken: async () => "test-token" }) as User;
const response = (tutorial: unknown, role = "Organization Member") => new Response(JSON.stringify({ role, tutorial }), { status: 200 });

test("all tours use existing routes and isolate role permissions", () => {
  for (const role of roles) for (const kind of ["quick", "features"] as const) {
    const steps = getTourSteps(role, kind);
    assert.equal(steps[0].id, "dashboard");
    assert.equal(steps.at(-1)?.id, "finish");
    assert.equal(new Set(steps.map((s) => s.id)).size, steps.length);
    for (const step of steps) {
      const route = fileURLToPath(new URL(`../../frontend/src/app${step.route}/page.tsx`, import.meta.url));
      assert.ok(existsSync(route), step.route);
      assert.ok(step.title && step.description && step.target);
      assert.ok(role === "Admin" ? step.route.startsWith("/admin") : step.route.startsWith("/dashboard"));
    }
    if (role === "Organization Member") assert.ok(!steps.some((s) => ["delegation", "analytics", "members", "requests"].includes(s.id)));
    if (kind === "quick") assert.ok(steps.length <= 5);
    if (kind === "features") assert.ok(steps.length <= 8, `${role} walkthrough is too long`);
  }
});

test("progress keys isolate accounts, roles, and tutorial version", () => {
  const keys = roles.flatMap((role) => [tutorialKey("alice", role), tutorialKey("bob", role)]);
  assert.equal(new Set(keys).size, 6);
  assert.ok(keys.every((k) => k.endsWith(":v1")));
});

test("first-time and interrupted tours are offered; completion and dismissal survive interrupted replays", () => {
  assert.ok(shouldOfferTutorial(null));
  assert.ok(shouldOfferTutorial(progress("in_progress")));
  for (const terminal of ["completed", "dismissed"] as const) {
    const previous = progress(terminal, 4);
    assert.equal(shouldOfferTutorial(previous), false);
    const replay = nextTutorialStatus(previous, "in_progress", 0, "quick");
    assert.equal(replay.step, 0);
    assert.equal(shouldOfferTutorial(replay), false);
    assert.equal(shouldOfferTutorial(nextTutorialStatus(replay, "in_progress", 2, "quick")), false);
  }
});

test("status validation rejects malformed, obsolete, and excessive progress", () => {
  assert.ok(isTutorialStatus(progress()));
  for (const bad of [null, {}, { ...progress(), version: 0 }, { ...progress(), step: -1 }, { ...progress(), step: 0.5 }, { ...progress(), tour: "admin" }, { ...progress(), status: "done" }]) assert.equal(isTutorialStatus(bad), false);
  const valid = { version: 1, role: "Admin", tour: "quick", step: 2, status: "dismissed" };
  assert.ok(tutorialStatusSchema.safeParse(valid).success);
  for (const bad of [{ ...valid, uid: "other-user" }, { ...valid, role: "Owner" }, { ...valid, step: 501 }, { ...valid, version: 2 }, { ...valid, status: "done" }]) assert.equal(tutorialStatusSchema.safeParse(bad).success, false);
});

test("account completion loads from the API and is cached only for that user and role", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    assert.equal(new Headers(init.headers).get("Authorization"), "Bearer test-token");
    return response(progress());
  });
  const loaded = await loadTutorial(user("remote-complete"), "Organization Member");
  assert.equal(loaded.status?.status, "completed");
  assert.equal(loaded.localOnly, false);
  assert.equal(localTutorial("remote-complete", "Organization Member")?.status, "completed");
  assert.equal(localTutorial("remote-complete", "Admin"), null);
  assert.equal(localTutorial("someone-else", "Organization Member"), null);
});

test("outages preserve dismissal in session memory even when browser storage is unavailable", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  assert.equal(await saveTutorial(user("offline-user"), "Student Leader", progress("dismissed", 3)), false);
  const loaded = await loadTutorial(user("offline-user"), "Student Leader");
  assert.equal(loaded.localOnly, true);
  assert.equal(loaded.status?.status, "dismissed");
  assert.equal(loaded.status?.step, 3);
});

test("rapid progress, replay, and finish writes remain ordered and include the expected role", async (t) => {
  const writes: string[] = [];
  t.mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    assert.equal(body.role, "Organization Member");
    assert.equal(body.uid, undefined);
    writes.push(`${body.status}:${body.step}`);
    return response({ ...body, updatedAt: progress().updatedAt });
  });
  const account = user("rapid-user");
  await Promise.all([
    saveTutorial(account, "Organization Member", progress("in_progress", 2)),
    saveTutorial(account, "Organization Member", progress("in_progress", 0)),
    saveTutorial(account, "Organization Member", progress("completed", 4))
  ]);
  assert.deepEqual(writes, ["in_progress:2", "in_progress:0", "completed:4"]);
  assert.equal(localTutorial(account.uid, "Organization Member")?.status, "completed");
});

test("a newer offline dismissal is synchronized instead of overwritten by stale account data", async (t) => {
  const account = user("resync-user");
  t.mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  await saveTutorial(account, "Organization Member", progress("dismissed"));
  t.mock.restoreAll();
  const methods: string[] = [];
  t.mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    methods.push(init.method!);
    return init.method === "GET" ? response({ ...progress("in_progress"), updatedAt: "2026-11-06T12:00:00.000Z" }) : response(progress("dismissed"));
  });
  const loaded = await loadTutorial(account, "Organization Member");
  assert.deepEqual(methods, ["GET", "PUT"]);
  assert.equal(loaded.status?.status, "dismissed");
  assert.equal(loaded.localOnly, false);
});

test("role mismatches and invalid remote records are never accepted", async (t) => {
  t.mock.method(globalThis, "fetch", async () => response(progress(), "Admin"));
  assert.equal((await loadTutorial(user("mismatch"), "Organization Member")).status, null);
  t.mock.restoreAll();
  t.mock.method(globalThis, "fetch", async () => response({ status: "completed" }));
  assert.equal((await loadTutorial(user("malformed"), "Organization Member")).status, null);
});

test("a stalled sign-in token cannot prevent the local guide from loading", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const stalled = { uid: "stalled-guide-token", getIdToken: () => new Promise(() => {}) } as unknown as User;
  const loading = loadTutorial(stalled, "Organization Member");
  await Promise.resolve();
  await Promise.resolve();
  t.mock.timers.tick(8000);
  assert.deepEqual(await loading, { status: null, localOnly: true });
});
