import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const account = (uid: string, organizationId: string | null = null, role = "Organization Member") => ({ loading: false, firebaseUser: { uid }, profile: { uid, organizationId, role } });
const request = { id: "request", organizationId: "club", organizationName: "Campus Arts Club" };

function harness(t: TestContext, initial = account("one")) {
  let auth = initial, cursor = 0, dirty = false, hidden = false;
  const slots: any[] = [], effects: (() => void)[] = [];
  const timers = new Set<() => void>(), focus = new Set<() => void>(), visibility = new Set<() => void>(), changed = new Set<() => void>();
  const calls: string[] = [];
  const cancelCalls: string[][] = [];
  let reply: (uid: string) => Promise<any> = async () => request;
  let cancelReply: () => Promise<void> = async () => { reply = async () => null; };
  const same = (a?: unknown[], b?: unknown[]) => Boolean(a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index])));
  const react = {
    useState(initial: any) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next: any) => { const value = typeof next === "function" ? next(slots[index]) : next; if (!Object.is(value, slots[index])) { slots[index] = value; dirty = true; } }];
    },
    useCallback(callback: any) { const index = cursor++; return slots[index] ??= callback; },
    useRef(initial: any) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useEffect(effect: () => any, dependencies: unknown[]) {
      const index = cursor++;
      if (same(slots[index]?.dependencies, dependencies)) return;
      const previous = slots[index]; slots[index] = { dependencies };
      effects.push(() => { previous?.cleanup?.(); slots[index].cleanup = effect(); });
    }
  };
  const globals = {
    document: { get hidden() { return hidden; }, addEventListener: (_name: string, callback: () => void) => visibility.add(callback), removeEventListener: (_name: string, callback: () => void) => visibility.delete(callback) },
    window: { setInterval: (callback: () => void) => { timers.add(callback); return callback; }, clearInterval: (callback: () => void) => timers.delete(callback), addEventListener: (name: string, callback: () => void) => (name === "focus" ? focus : changed).add(callback), removeEventListener: (name: string, callback: () => void) => (name === "focus" ? focus : changed).delete(callback) }
  };
  const restores: (() => void)[] = [];
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    restores.push(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  const mocks: Record<string, any> = { react, "@/store/authStore": { useAuthStore: (select: (value: any) => any) => select(auth) }, "@/services/auth.service": {
    ORGANIZATION_JOIN_STATUS_CHANGED: "musubi:organization-join-status-changed",
    getMyOrganizationJoinRequest: async (user: { uid: string }) => { calls.push(user.uid); return reply(user.uid); },
    cancelOrganizationJoinRequest: async (user: { uid: string }, id: string) => { cancelCalls.push([user.uid, id]); await cancelReply(); for (const listener of changed) listener(); }
  } };
  const code = ts.transpileModule(readFileSync(resolve(__dirname, "../../frontend/src/hooks/useOrganizationJoinStatus.ts"), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports: any = {};
  new Function("exports", "require", code)(exports, (name: string) => mocks[name]);
  const render = () => { cursor = 0; return exports.useOrganizationJoinStatus(); };
  const dispose = () => { for (const slot of slots) slot?.cleanup?.(); };
  t.after(() => { dispose(); for (const restore of restores.reverse()) restore(); });
  return {
    calls, cancelCalls, timers, focus, visibility, changed, render, dispose,
    update(value: typeof initial) { auth = value; },
    setReply(value: typeof reply) { reply = value; },
    setCancelReply(value: typeof cancelReply) { cancelReply = value; },
    setHidden(value: boolean) { hidden = value; },
    async settle() {
      let result;
      for (let iteration = 0; iteration < 20; iteration++) {
        dirty = false; result = render();
        for (const effect of effects.splice(0)) effect();
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
        if (!dirty) return result;
      }
      assert.fail("Join request state did not settle");
    }
  };
}

test("membership notices load pending requests and refresh when the app regains focus", async (t) => {
  const app = harness(t);
  assert.equal(app.render().loading, true);
  assert.deepEqual((await app.settle()).request, request);
  app.setReply(async () => null);
  for (const listener of app.focus) listener();
  const empty = await app.settle();
  assert.equal(empty.request, null);
  assert.equal(empty.error, "");
  app.setReply(async () => request);
  for (const timer of app.timers) timer();
  assert.deepEqual((await app.settle()).request, request);
});

test("request errors never become a false no-request state and retry recovers", async (t) => {
  const app = harness(t);
  app.setReply(async () => { throw Error("offline"); });
  const failed = await app.settle();
  assert.ok(failed.error);
  assert.equal(failed.request, null);
  app.setReply(async () => request);
  failed.refresh();
  assert.deepEqual((await app.settle()).request, request);
  app.setReply(async () => { throw Error("offline"); });
  for (const listener of app.focus) listener();
  const lastKnown = await app.settle();
  assert.deepEqual(lastKnown.request, request);
  assert.ok(lastKnown.error);
});

test("account switches discard late responses and joined accounts stop polling", async (t) => {
  const app = harness(t);
  let finish: (value: any) => void = () => {};
  app.setReply(async (uid) => uid === "one" ? new Promise(resolve => { finish = resolve; }) : null);
  assert.equal((await app.settle()).loading, true);
  app.update(account("two"));
  assert.equal(app.render().request, null);
  assert.equal((await app.settle()).request, null);
  finish(request);
  assert.equal((await app.settle()).request, null);
  app.update(account("two", "joined-club"));
  assert.equal((await app.settle()).loading, false);
  assert.equal(app.timers.size, 0);
  assert.equal(app.focus.size, 0);
  assert.equal(app.visibility.size, 0);
  assert.deepEqual(app.calls, ["one", "two"]);
});

test("administrators, loading authentication, mismatched accounts, and hidden tabs do not issue requests", async (t) => {
  const app = harness(t, account("admin", null, "Admin"));
  await app.settle();
  app.update({ ...account("one"), loading: true }); await app.settle();
  app.update({ ...account("one"), firebaseUser: { uid: "other" } }); await app.settle();
  assert.equal(app.calls.length, 0);
  app.setHidden(true); app.update(account("one")); await app.settle();
  assert.equal(app.calls.length, 0);
  app.setHidden(false);
  for (const listener of app.visibility) listener();
  assert.deepEqual((await app.settle()).request, request);
  assert.deepEqual(app.calls, ["one"]);
});

test("cancelling clears the pending request, prevents duplicate submissions, and refreshes other subscribers", async (t) => {
  const app = harness(t);
  const state = await app.settle();
  let finish: () => void = () => {};
  app.setCancelReply(() => new Promise(resolve => { finish = resolve; }));
  const pending = state.onCancel();
  await state.onCancel();
  assert.deepEqual(app.cancelCalls, [["one", "request"]]);
  assert.equal(app.render().cancelling, true);
  app.setReply(async () => null);
  finish(); await pending;
  const cancelled = await app.settle();
  assert.equal(cancelled.request, null);
  assert.equal(cancelled.cancelling, false);
  assert.equal(cancelled.error, "");
  app.setReply(async () => request);
  for (const listener of app.changed) listener();
  assert.deepEqual((await app.settle()).request, request);
});

test("failed cancellations keep the request and report the error; account switches cannot cancel another user's request", async (t) => {
  const app = harness(t);
  const pending = await app.settle();
  app.setCancelReply(async () => { throw Error("This request has already been reviewed."); });
  await pending.onCancel();
  assert.deepEqual(app.render().request, request);
  assert.match(app.render().error, /already been reviewed/);
  app.update(account("two"));
  await app.render().onCancel();
  assert.equal(app.cancelCalls.length, 1);
});
