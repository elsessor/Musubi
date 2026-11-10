import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

type Services = typeof import("../../frontend/src/services/announcements.service.js");
const account = (uid: string, organizationId: string | null = "org") => ({
  firebaseUser: { uid, getIdToken: async () => `test-token-${uid}` },
  profile: { uid, organizationId, role: "Organization Member", committeeId: "arts", fullName: uid },
  loading: false
});
const announcement = (id: string) => ({ id, organizationId: "org", title: id });
const flush = () => new Promise<void>(resolve => setImmediate(resolve));

// Execute the real client service with isolated authentication, HTTP and timers.
function harness(initial: Record<string, any> = account("one")) {
  let state = initial, now = 0;
  const listeners = new Set<(next: any, previous: any) => void>();
  const timers = new Map<number, () => void>();
  const requests: Array<{ url: string; headers: Record<string, string> }> = [];
  let reply: (request: typeof requests[number]) => Promise<any> = async () => response(200, [announcement("visible")]);
  const store = { getState: () => state, subscribe: (listener: (next: any, previous: any) => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  } };
  const source = readFileSync(resolve(__dirname, "../../frontend/src/services/announcements.service.ts"), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const services = {} as Services;
  new Function("exports", "require", "fetch", "setInterval", "clearInterval", "document", "window", "localStorage", "Date", code)(
    services, () => ({ useAuthStore: store }),
    async (url: string, init: any) => { const request = { url, headers: init.headers }; requests.push(request); return reply(request); },
    (callback: () => void) => { const id = timers.size + 1; timers.set(id, callback); return id; },
    (id: number) => timers.delete(id), { hidden: false }, {}, { removeItem: () => {} }, { now: () => now }
  );
  return { services, requests, listeners, timers,
    setReply: (next: typeof reply) => { reply = next; },
    update: (next: Record<string, any>) => { const previous = state; state = next; for (const listener of [...listeners]) listener(state, previous); },
    tick: async () => { now += 60000; for (const callback of [...timers.values()]) callback(); await flush(); }
  };
}
function response(status: number, announcements: any[] = []) {
  return { status, ok: status >= 200 && status < 300, json: async () => ({ announcements, message: "Access denied" }) };
}

test("announcements wait for authentication and a matching profile before issuing requests", async () => {
  const app = harness({ ...account("one"), loading: true });
  const data: any[][] = [];
  const unsubscribe = app.services.subscribeAnnouncementsFirestore("org", "Organization Member", rows => data.push(rows));
  await app.tick();
  assert.equal(app.requests.length, 0);
  app.update({ ...account("one"), profile: { ...account("two").profile } });
  await app.tick();
  assert.equal(app.requests.length, 0);
  app.update(account("one"));
  await flush();
  assert.equal(app.requests.length, 1);
  assert.match(app.requests[0].url, /orgId=org/);
  assert.equal(data.at(-1)?.[0].id, "visible");
  unsubscribe();
});

test("missing or foreign organizations never request fallback announcement data", async () => {
  for (const [state, orgId] of [
    [account("one", null), null], [account("one", null), "default-org"],
    [account("one"), "other-org"], [account("one"), " "],
    [{ firebaseUser: null, profile: null, loading: false }, "org"]
  ] as const) {
    const app = harness(state);
    const unsubscribe = app.services.subscribeAnnouncementsFirestore(orgId, "Organization Member", () => {});
    await app.tick();
    assert.deepEqual(await app.services.fetchAnnouncements(null, orgId), []);
    assert.equal(app.requests.length, 0);
    unsubscribe();
  }
});

test("403 stops polling for the rejected scope; a permission change allows a new request", async () => {
  const app = harness();
  app.setReply(async () => response(403));
  const data: any[][] = [];
  const unsubscribe = app.services.subscribeAnnouncementsFirestore("org", "Organization Member", rows => data.push(rows));
  await flush();
  assert.equal(app.requests.length, 1);
  for (let attempt = 0; attempt < 3; attempt++) await app.tick();
  app.update({ ...account("one"), profile: { ...account("one").profile, fullName: "Updated display name" } });
  await app.tick();
  assert.equal(app.requests.length, 1);
  assert.deepEqual(data.at(-1), []);
  app.setReply(async () => response(200, [announcement("new-committee")]));
  app.update({ ...account("one"), profile: { ...account("one").profile, committeeId: "finance" } });
  await flush();
  assert.equal(app.requests.length, 2);
  assert.equal(data.at(-1)?.[0].id, "new-committee");
  unsubscribe();
});

test("temporary server errors retry on the next polling interval", async () => {
  const app = harness();
  app.setReply(async () => response(500));
  const unsubscribe = app.services.subscribeAnnouncementsFirestore("org", "Organization Member", () => {});
  await flush();
  app.setReply(async () => response(200, [announcement("recovered")]));
  await app.tick();
  assert.equal(app.requests.length, 2);
  unsubscribe();
});

test("the organization page and notifications share requests and both stop after a 403", async () => {
  const app = harness();
  app.setReply(async () => response(403));
  const stopPage = app.services.subscribeAnnouncementsFirestore("org", "Organization Member", () => {});
  const stopNotifications = app.services.subscribeAnnouncementsFirestore("org", "Organization Member", () => {});
  await flush();
  assert.equal(app.requests.length, 1);
  await app.tick();
  await app.tick();
  assert.equal(app.requests.length, 1);
  stopPage();
  await app.tick();
  assert.equal(app.requests.length, 1);
  stopNotifications();
  assert.equal(app.listeners.size, 0);
  assert.equal(app.timers.size, 0);
});

test("account switches discard late responses and never reuse another account's cached announcements", async () => {
  const app = harness();
  let finishOld: (value: any) => void = () => {};
  app.setReply(async request => request.headers.Authorization.endsWith("one")
    ? new Promise(resolve => { finishOld = resolve; })
    : response(200, [announcement("account-two")]));
  const data: any[][] = [];
  const unsubscribe = app.services.subscribeAnnouncementsFirestore("org", "Organization Member", rows => data.push(rows));
  await flush();
  app.update(account("two"));
  assert.deepEqual(data.at(-1), []);
  await flush();
  assert.equal(data.at(-1)?.[0].id, "account-two");
  finishOld(response(200, [announcement("account-one-private")]));
  await flush();
  assert.equal(data.some(rows => rows.some(row => row.id === "account-one-private")), false);
  assert.equal((await app.services.fetchAnnouncements(null, "org"))[0].id, "account-two");
  assert.equal(app.requests.length, 2);
  app.update({ firebaseUser: null, profile: null, loading: false });
  assert.deepEqual(data.at(-1), []);
  await app.tick();
  assert.equal(app.requests.length, 2);
  unsubscribe();
});

test("changing organizations stops old-org requests; cleanup removes timers and ignores pending responses", async () => {
  const app = harness();
  const data: any[][] = [];
  const unsubscribe = app.services.subscribeAnnouncementsFirestore("org", "Organization Member", rows => data.push(rows));
  await flush();
  app.update(account("one", "new-org"));
  assert.deepEqual(data.at(-1), []);
  await app.tick();
  assert.equal(app.requests.length, 1);
  unsubscribe();
  assert.equal(app.listeners.size, 0);
  assert.equal(app.timers.size, 0);

  let finish: (value: any) => void = () => {};
  app.setReply(async () => new Promise(resolve => { finish = resolve; }));
  const stopNew = app.services.subscribeAnnouncementsFirestore("new-org", "Organization Member", rows => data.push(rows));
  await flush();
  stopNew();
  const count = data.length;
  finish(response(200, [announcement("late")]));
  await flush();
  assert.equal(data.length, count);
  assert.deepEqual(data.at(-1), []);
  assert.equal(app.listeners.size, 0);
  assert.equal(app.timers.size, 0);
});
