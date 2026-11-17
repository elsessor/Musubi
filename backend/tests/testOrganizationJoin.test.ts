import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";
import * as config from "../src/config/testAccounts.js";
import { AppError } from "../src/utils/AppError.js";

function harness(options: { role?: string; marked?: boolean; email?: string; organizationId?: string | null; targetId?: string; active?: boolean; pending?: boolean; orgMarked?: boolean } = {}) {
  const uid = config.TEST_ACCOUNTS[0].uid;
  let profile: Record<string, any> = { uid, email: options.email ?? config.TEST_ACCOUNTS[0].email,
    role: options.role ?? "Organization Member", fullName: "Test Account 1", position: "Secretary",
    organizationId: options.organizationId ?? null, onboardingCompleted: true, skills: ["Photography"],
    testAccountSuite: options.marked === false ? undefined : config.TEST_ACCOUNT_SUITE, testAccountUid: uid };
  const targetId = options.targetId ?? config.TEST_ORGANIZATION_ID;
  const organization = { name: config.TEST_ORGANIZATION_NAME, status: options.active === false ? "inactive" : "active",
    setupStatus: options.active === false ? "inactive" : "active", testAccountSuite: options.orgMarked === false ? undefined : config.TEST_ACCOUNT_SUITE };
  const requests = new Map<string, any>();
  if (options.pending) requests.set("legacy-pending", { organizationId: targetId, requestedByUID: uid, status: "pending", submittedAt: "old-date" });
  const writes: any[] = [], invalidated: string[] = [], logs: any[] = [];
  const ref = (collection: string, id: string): any => ({ id, path: `${collection}/${id}`,
    get: async () => snapshot(collection, id) });
  const snapshot = (collection: string, id: string): any => ({ id, ref: ref(collection, id),
    exists: collection !== "organization_join_requests" || requests.has(id),
    data: () => collection === "users" ? { ...profile } : collection === "organizations" ? { ...organization } : requests.get(id) });
  const query = (filters: [string, unknown][] = []): any => ({
    where: (field: string, _op: string, value: unknown) => query([...filters, [field, value]]),
    limit: () => query(filters),
    get: async () => {
      const docs = [...requests].filter(([, value]) => filters.every(([key, expected]) => value[key] === expected))
        .map(([id]) => snapshot("organization_join_requests", id));
      return { docs, empty: docs.length === 0 };
    }
  });
  const mutate = (reference: any, values: any) => {
    writes.push({ path: reference.path, values });
    if (reference.path.startsWith("users/")) profile = { ...profile, ...values };
    else requests.set(reference.id, { ...requests.get(reference.id), ...values });
  };
  const firestore = { collection: (collection: string) => ({ ...query(), doc: (id: string) => ref(collection, id),
    add: async (data: any) => { const reference = ref(collection, "new-pending"); mutate(reference, data); return reference; } }),
    runTransaction: async (operation: (transaction: any) => unknown) => {
      const staged: any[] = [];
      const result = await operation({ get: async (target: any) => target.get(),
        update: (target: any, data: any) => staged.push([target, data]), set: (target: any, data: any) => staged.push([target, data]) });
      for (const [target, data] of staged) mutate(target, data);
      return result;
    } };
  const firebaseAdmin = { firestore: { FieldValue: { serverTimestamp: () => "server-time" } } };
  const helperCode = ts.transpileModule(readFileSync(resolve(__dirname, "../src/services/testAccounts.service.ts"), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
  }).outputText;
  const helper: any = {};
  const mocks: Record<string, any> = { "../config/firebase.js": { firestore, firebaseAdmin }, "../config/testAccounts.js": config, "../utils/AppError.js": { AppError } };
  new Function("exports", "require", helperCode)(helper, (name: string) => mocks[name] ?? {});
  const filename = resolve(__dirname, "../src/services/auth.service.ts");
  const source = ts.createSourceFile(filename, readFileSync(filename, "utf8"), ts.ScriptTarget.Latest, true);
  const selected = source.statements.filter((statement) => ts.isFunctionDeclaration(statement) && ["normalizeOrganization", "joinOrganization"].includes(statement.name?.text ?? ""));
  const printer = ts.createPrinter();
  const code = ts.transpileModule(selected.map((statement) => printer.printNode(ts.EmitHint.Unspecified, statement, source)).join("\n"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
  }).outputText;
  const service: any = {};
  const context = { firestore, firebaseAdmin, AppError, acceptTestOrganizationJoin: helper.acceptTestOrganizationJoin,
    invalidateUserCache: (id: string) => invalidated.push(id), appCache: { deletePrefix: () => {}, delete: () => {} },
    getCurrentUser: async () => ({ ...profile }), writeAuditLog: (log: any) => logs.push(log) };
  new Function("exports", ...Object.keys(context), code)(service, ...Object.values(context));
  return { uid, requests, writes, invalidated, logs, profile: () => profile, join: () => service.joinOrganization(uid, targetId) };
}

test("both test roles join immediately and the response unlocks their organization workspace", async () => {
  for (const role of ["Student Leader", "Organization Member"]) {
    const app = harness({ role });
    const result = await app.join();
    assert.equal(result.status, "accepted");
    assert.equal(result.user.organizationId, config.TEST_ORGANIZATION_ID);
    assert.equal(result.user.organizationName, config.TEST_ORGANIZATION_NAME);
    assert.equal(result.user.role, role);
    assert.deepEqual(result.user.skills, ["Photography"]);
    assert.equal(result.user.onboardingCompleted, true);
    assert.equal(app.requests.get(app.uid).status, "accepted");
    assert.equal(app.requests.get(app.uid).submittedAt, "server-time");
    assert.deepEqual(app.invalidated, [app.uid]);
    assert.match(app.logs[0].action, /accepted automatically/);
    assert.equal((await app.join()).status, "accepted", "Repeated joins are safe");
    assert.equal(app.requests.size, 1);
  }
});

test("earlier pending test requests are accepted rather than blocking the join", async () => {
  const app = harness({ pending: true });
  assert.equal((await app.join()).status, "accepted");
  assert.equal(app.requests.get("legacy-pending").status, "accepted");
  assert.ok([...app.requests.values()].every((request) => request.status === "accepted"));
});

test("normal accounts, lookalike addresses, and requests to other organizations still wait for approval", async () => {
  for (const options of [{ marked: false }, { email: "test21@university.edu.ph" }, { targetId: "real-organization" }]) {
    const app = harness(options);
    assert.equal((await app.join()).status, "pending");
    assert.equal(app.profile().organizationId, null);
    assert.equal(app.requests.get("new-pending").status, "pending");
  }
  const pending = harness({ marked: false, pending: true });
  await assert.rejects(pending.join(), /already have a pending request/);
  assert.equal(pending.writes.length, 0);
});

test("inactive or unmarked test organizations cannot grant automatic membership", async () => {
  for (const options of [{ active: false }, { orgMarked: false }]) {
    const app = harness(options);
    await assert.rejects(app.join(), /not available to join/);
    assert.equal(app.writes.length, 0);
  }
});
