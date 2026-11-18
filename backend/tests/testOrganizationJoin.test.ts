import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";
import * as config from "../src/config/testAccounts.js";
import { AppError } from "../src/utils/AppError.js";

function harness(options: { role?: string; marked?: boolean; email?: string; organizationId?: string | null; targetId?: string; active?: boolean; pending?: boolean; orgMarked?: boolean; failNotifications?: boolean; retry?: boolean } = {}) {
  const uid = config.TEST_ACCOUNTS[0].uid;
  let profile: Record<string, any> = { uid, email: options.email ?? config.TEST_ACCOUNTS[0].email,
    role: options.role ?? "Organization Member", fullName: "Test Account 1", position: "Secretary",
    organizationId: options.organizationId ?? null, onboardingCompleted: true, skills: ["Photography"],
    testAccountSuite: options.marked === false ? undefined : config.TEST_ACCOUNT_SUITE, testAccountUid: uid };
  const targetId = options.targetId ?? config.TEST_ORGANIZATION_ID;
  const organization = { name: config.TEST_ORGANIZATION_NAME, status: options.active === false ? "inactive" : "active",
    setupStatus: options.active === false ? "inactive" : "active", testAccountSuite: options.orgMarked === false ? undefined : config.TEST_ACCOUNT_SUITE };
  const requests = new Map<string, any>();
  const notifications = new Map<string, any>();
  const orgRequests = new Map<string, any>();
  const organizations = new Map<string, any>([[targetId, organization], ["another-organization", { name: "Another Club", status: "active" }]]);
  const versions = new Map<string, number>(), counters = new Map<string, number>();
  const leaders = new Map<string, any>([
    ["leader-one", { role: "Student Leader", organizationId: targetId }],
    ["leader-two", { role: "Student Leader", organizationId: targetId }],
    ["member", { role: "Organization Member", organizationId: targetId }],
    ["outside-leader", { role: "Student Leader", organizationId: "outside-organization" }]
  ]);
  if (options.pending) requests.set("legacy-pending", { organizationId: targetId, requestedByUID: uid, status: "pending", submittedAt: "old-date" });
  const writes: any[] = [], invalidated: string[] = [], logs: any[] = [], logOptions: any[] = [];
  const ref = (collection: string, id: string): any => ({ id, path: `${collection}/${id}`,
    get: async () => snapshot(collection, id) });
  const records = (collection: string) => collection === "users" ? new Map([[uid, profile], ...leaders]) : collection === "organizations" ? organizations : collection === "notifications" ? notifications : collection === "org_requests" ? orgRequests : requests;
  const snapshot = (collection: string, id: string): any => {
    const data = records(collection).get(id);
    return { id, ref: ref(collection, id), exists: data !== undefined, data: () => data && { ...data } };
  };
  const query = (collection: string, filters: [string, unknown][] = []): any => ({
    where: (field: string, _op: string, value: unknown) => query(collection, [...filters, [field, value]]),
    limit: () => query(collection, filters),
    get: async () => {
      const docs = [...records(collection)].filter(([, value]) => filters.every(([key, expected]) => value[key] === expected))
        .map(([id]) => snapshot(collection, id));
      return { docs, empty: docs.length === 0 };
    }
  });
  const mutate = (reference: any, values: any) => {
    writes.push({ path: reference.path, values });
    versions.set(reference.path, (versions.get(reference.path) || 0) + 1);
    const collection = reference.path.split("/")[0];
    if (collection === "users" && reference.id === uid) profile = { ...profile, ...values };
    else {
      const target = collection === "users" ? leaders : records(collection);
      target.set(reference.id, { ...target.get(reference.id), ...values });
    }
  };
  const firestore = { collection: (collection: string) => ({ ...query(collection), doc: (id?: string) => {
    if (id) return ref(collection, id);
    const next = (counters.get(collection) || 0) + 1; counters.set(collection, next);
    return ref(collection, next === 1 ? "new-pending" : `new-pending-${next}`);
  },
    add: async (data: any) => { const reference = ref(collection, "new-pending"); mutate(reference, data); return reference; } }),
    runTransaction: async (operation: (transaction: any) => unknown) => {
      for (let attempt = 0; attempt < 8; attempt++) {
      const staged: any[] = [], readVersions = new Map<string, number>();
      const transaction = { get: async (target: any) => {
        if (target.path) readVersions.set(target.path, versions.get(target.path) || 0);
        return target.get();
      },
        create: (target: any, data: any) => staged.push([target, data]),
        update: (target: any, data: any) => staged.push([target, data]), set: (target: any, data: any) => staged.push([target, data]) };
      const result = await operation(transaction);
      if (options.retry && attempt === 0 || [...readVersions].some(([path, version]) => (versions.get(path) || 0) !== version)) continue;
      if (options.failNotifications && staged.some(([target]) => target.path.startsWith("notifications/"))) throw Error("Notification write failed");
      for (const [target, data] of staged) mutate(target, data);
      return result;
      }
      throw Error("Transaction retries exhausted");
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
  const selected = source.statements.filter((statement) => ts.isFunctionDeclaration(statement) && ["normalizeOrganization", "joinOrganization", "cancelOrganizationJoinRequest", "reviewOrganizationJoinRequest", "createOrganization", "completeUserOnboarding"].includes(statement.name?.text ?? ""));
  const printer = ts.createPrinter();
  const code = ts.transpileModule(selected.map((statement) => printer.printNode(ts.EmitHint.Unspecified, statement, source)).join("\n"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
  }).outputText;
  const service: any = {};
  const context = { firestore, firebaseAdmin, AppError, acceptTestOrganizationJoin: helper.acceptTestOrganizationJoin,
    invalidateUserCache: (id: string) => invalidated.push(id), appCache: { deletePrefix: () => {}, delete: () => {} },
    provisionedTestAccount: config.provisionedTestAccount, TEST_ORGANIZATION_ID: config.TEST_ORGANIZATION_ID, TEST_ACCOUNT_SUITE: config.TEST_ACCOUNT_SUITE,
    createAppJwt: () => "token", getCurrentUser: async (id: string) => ({ ...(id === uid ? profile : leaders.get(id)) }), writeAuditLog: (log: any, options: any) => { logs.push(log); logOptions.push(options); } };
  new Function("exports", ...Object.keys(context), code)(service, ...Object.values(context));
  return { uid, requests, notifications, orgRequests, writes, invalidated, logs, logOptions, profile: () => profile,
    join: (orgId = targetId) => service.joinOrganization(uid, orgId),
    cancel: (requestId: string, actor = uid) => service.cancelOrganizationJoinRequest(actor, requestId),
    review: (requestId: string, status: "accepted" | "rejected", actor = "leader-one", orgId = targetId) => service.reviewOrganizationJoinRequest(actor, orgId, requestId, status),
    create: () => service.createOrganization(uid, { name: "New Club", type: "Academic", description: "A new club" }),
    onboard: (input: any = {}) => service.completeUserOnboarding(uid, { role: profile.role, position: "Member", yearLevel: "1st Year", program: "BSIT", skills: [], organizationId: null, ...input }) };
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

test("pending join requests notify every leader in the requested organization", async () => {
  const app = harness({ marked: false });
  const request = await app.join();
  assert.equal(request.status, "pending");
  const notices = [...app.notifications.values()];
  assert.deepEqual(notices.map(n => n.recipientUID).sort(), ["leader-one", "leader-two"]);
  for (const notice of notices) {
    assert.equal(notice.orgId, config.TEST_ORGANIZATION_ID);
    assert.equal(notice.joinRequestId, request.id);
    assert.equal(notice.requestedByUID, app.uid);
    assert.equal(notice.type, "organization");
    assert.equal(notice.read, false);
    assert.deepEqual(notice.readBy, []);
    assert.match(notice.description, /Test Account 1 requested to join Musubi Test Organization/);
  }
  assert.deepEqual(app.logOptions, [{ notify: false }], "The audit entry must not broadcast a duplicate notification");
  const count = app.writes.length;
  await assert.rejects(app.join(), /already have a pending request/);
  assert.equal(app.writes.length, count);
  assert.equal(app.notifications.size, 2);
});

test("request and leader notifications commit together, and retries do not duplicate notices", async () => {
  const failed = harness({ marked: false, failNotifications: true });
  await assert.rejects(failed.join(), /Notification write failed/);
  assert.equal(failed.requests.size, 0);
  assert.equal(failed.notifications.size, 0);
  assert.equal(failed.logs.length, 0);
  const retried = harness({ marked: false, retry: true });
  await retried.join();
  assert.equal(retried.requests.size, 1);
  assert.equal(retried.notifications.size, 2);
  const automatic = harness();
  assert.equal((await automatic.join()).status, "accepted");
  assert.equal(automatic.notifications.size, 1, "Automatic acceptance sends the applicant a confirmation");
  assert.equal([...automatic.notifications.values()][0].membershipEvent, "join-accepted");
  assert.equal([...automatic.notifications.values()][0].recipientUID, automatic.uid);
});

test("membership and pending requests block joining any second organization, including test-account shortcuts", async () => {
  for (const marked of [false, true]) for (const organizationId of [config.TEST_ORGANIZATION_ID, "another-organization"]) {
    const app = harness({ marked, organizationId });
    if (marked && organizationId === config.TEST_ORGANIZATION_ID) {
      assert.equal((await app.join()).status, "accepted", "An existing test membership may be returned idempotently");
    } else {
      await assert.rejects(app.join(), /already belong to an organization/);
      assert.equal(app.writes.length, 0);
    }
    assert.equal(app.profile().organizationId, organizationId);
  }
  for (const marked of [false, true]) {
    const app = harness({ marked });
    app.requests.set("other-pending", { organizationId: "another-organization", requestedByUID: app.uid, status: "pending" });
    await assert.rejects(app.join(), /already have a pending request/);
    assert.equal(app.writes.length, 0);
  }
});

test("users can cancel only their own pending requests, then request another organization", async () => {
  const app = harness({ marked: false });
  const result = await app.join();
  await assert.rejects(app.cancel(result.id, "leader-one"), /not found/);
  assert.equal(app.requests.get(result.id).status, "pending");
  await app.cancel(result.id);
  assert.equal(app.requests.get(result.id).status, "cancelled");
  assert.equal(app.requests.get(result.id).cancelledByUID, app.uid);
  assert.equal(app.profile().organizationId, null);
  assert.equal(app.profile().pendingOrganizationJoinRequestId, null);
  assert.ok([...app.notifications.values()].every(notice => notice.read && notice.title === "Join request cancelled"));
  const writes = app.writes.length;
  await app.cancel(result.id);
  assert.equal(app.writes.length, writes, "Cancelling twice is safe");
  const next = await app.join("another-organization");
  assert.equal(next.status, "pending");
  assert.equal(app.requests.get(next.id).organizationId, "another-organization");
});

test("declining allows a new request, while accepting prevents cancellation and further joins", async () => {
  for (const status of ["accepted", "rejected"] as const) {
    const app = harness({ marked: false });
    const result = await app.join();
    await assert.rejects(app.review(result.id, status, "outside-leader"), /Only organization leaders/);
    await app.review(result.id, status);
    assert.equal(app.requests.get(result.id).status, status);
    assert.equal(app.profile().pendingOrganizationJoinRequestId, null);
    assert.ok([...app.notifications.values()].filter(notice => notice.recipientUID !== app.uid).every(notice => notice.read));
    const outcomes = [...app.notifications.values()].filter(notice => notice.recipientUID === app.uid);
    assert.equal(outcomes.length, 1);
    assert.equal(outcomes[0].read, false);
    assert.equal(outcomes[0].membershipEvent, status === "accepted" ? "join-accepted" : "join-rejected");
    assert.equal(outcomes[0].joinRequestId, result.id);
    await assert.rejects(app.cancel(result.id), /already been reviewed/);
    if (status === "accepted") {
      assert.equal(app.profile().organizationId, config.TEST_ORGANIZATION_ID);
      await assert.rejects(app.join("another-organization"), /already belong to an organization/);
    } else assert.equal((await app.join("another-organization")).status, "pending");
  }
});

test("simultaneous requests serialize through the applicant and create one pending request", async () => {
  const app = harness({ marked: false });
  const results = await Promise.allSettled([app.join(), app.join("another-organization")]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(results.filter(result => result.status === "rejected").length, 1);
  assert.equal(app.requests.size, 1);
  assert.equal(app.requests.get(app.profile().pendingOrganizationJoinRequestId).status, "pending");
});

test("cancellation and leader approval cannot both win the same pending request", async () => {
  for (const approvalFirst of [false, true]) {
    const app = harness({ marked: false });
    const { id } = await app.join();
    const operations = approvalFirst ? [app.review(id, "accepted"), app.cancel(id)] : [app.cancel(id), app.review(id, "accepted")];
    const results = await Promise.allSettled(operations);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    const status = app.requests.get(id).status;
    assert.ok(status === "accepted" || status === "cancelled");
    assert.equal(app.profile().organizationId, status === "accepted" ? config.TEST_ORGANIZATION_ID : null);
    assert.equal(app.profile().pendingOrganizationJoinRequestId, null);
  }
});

test("creation and onboarding cannot replace membership or bypass a pending request", async () => {
  const joined = harness({ marked: false, role: "Student Leader", organizationId: "another-organization" });
  await assert.rejects(joined.create(), /already belong to an organization/);
  await joined.onboard();
  assert.equal(joined.profile().organizationId, "another-organization", "An onboarding retry cannot clear membership");
  await assert.rejects(joined.onboard({ organizationId: "new-club", organizationRequest: { organizationId: "new-club", orgName: "New Club", orgType: "Academic", description: "Club" } }), /already belong to an organization/);
  const pending = harness({ marked: false, role: "Student Leader", pending: true });
  await assert.rejects(pending.create(), /pending join request/);
  await assert.rejects(pending.onboard({ organizationId: "new-club", organizationRequest: { organizationId: "new-club", orgName: "New Club", orgType: "Academic", description: "Club" } }), /pending join request/);
  const fresh = harness({ marked: false });
  await assert.rejects(fresh.onboard({ organizationId: "another-organization" }), /Submit a join request/);
  const testAccount = harness();
  testAccount.requests.set("other-pending", { organizationId: "another-organization", requestedByUID: testAccount.uid, status: "pending" });
  await assert.rejects(testAccount.onboard(), /pending join request/);
  assert.equal(testAccount.profile().organizationId, null);
});

test("profile setup and organization registration still work when membership rules permit them", async () => {
  for (const role of ["Student Leader", "Organization Member"]) {
    const pending = harness({ marked: false, role, pending: true });
    await pending.onboard();
    assert.equal(pending.profile().organizationId, null);
    assert.equal(pending.requests.get("legacy-pending").status, "pending", "Saving profile details does not remove a pending request");
  }
  const registration = harness({ marked: false, role: "Student Leader" });
  await registration.create();
  assert.ok(registration.profile().organizationId);
  assert.equal(registration.orgRequests.size, 1);
  await assert.rejects(registration.join(), /already belong to an organization/);
  const onboarding = harness({ marked: false, role: "Student Leader" });
  await onboarding.onboard({ organizationId: "new-club", organizationRequest: { organizationId: "new-club", orgName: "New Club", orgType: "Academic", description: "Club" } });
  assert.equal(onboarding.profile().organizationId, "new-club");
  assert.equal(onboarding.orgRequests.size, 1);
  const testAccount = harness();
  await testAccount.onboard();
  assert.equal(testAccount.profile().organizationId, config.TEST_ORGANIZATION_ID);
});

test("simultaneous organization creation and joining cannot both succeed", async () => {
  const app = harness({ marked: false, role: "Student Leader" });
  const result = await Promise.allSettled([app.join(), app.create()]);
  assert.equal(result.filter(operation => operation.status === "fulfilled").length, 1);
  assert.ok(Boolean(app.profile().organizationId) !== Boolean([...app.requests.values()].find(request => request.status === "pending")));
});
