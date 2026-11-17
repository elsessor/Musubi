import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";
import * as config from "../src/config/testAccounts.js";
import { testAccountSessionUpdate } from "../src/utils/testAccountSession.js";
import { tutorialStatusSchema } from "../src/utils/tutorialStatus.js";
import { AppError } from "../src/utils/AppError.js";
import { mergeOnboarding } from "../src/utils/onboardingProgress.js";
import { onboardingProgress } from "../../frontend/src/config/onboardingProgress.js";
import type { TutorialStatus } from "../../frontend/src/config/tutorial.js";
import { getPostAuthenticationRoute } from "../../frontend/src/utils/routes.js";

const completed: TutorialStatus = { version: 1, status: "completed", step: 8, tour: "page-events", acknowledged: true,
  updatedAt: "2026-11-10T00:00:00.000Z", seenPages: ["page-dashboard", "page-events"],
  onboarding: { version: 1, restartedAt: "2026-11-10T00:00:00.000Z", preference: { mode: "independent", source: "user", updatedAt: "2026-11-10T00:00:00.000Z" },
    welcome: { status: "completed", step: 0, updatedAt: "2026-11-10T00:00:00.000Z" },
    modules: { "page-events": { status: "completed", step: 8, updatedAt: "2026-11-10T00:00:00.000Z" } } } };

test("the test suite contains exactly test1 through test20 without assigning a role choice", () => {
  assert.equal(config.TEST_ACCOUNTS.length, 20);
  assert.equal(new Set(config.TEST_ACCOUNTS.map(({ uid }) => uid)).size, 20);
  assert.equal(new Set(config.TEST_ACCOUNTS.map(({ email }) => email)).size, 20);
  for (let n = 1; n <= 20; n++) {
    const account = config.TEST_ACCOUNTS.find(({ email }) => email === `test${n}@university.edu.ph`)!;
    assert.ok(account);
    assert.equal(account.position, null);
    assert.deepEqual(account.skills, []);
  }
});

test("the seeded test organization is discoverable in the real directory for either role", async () => {
  const filename = resolve(__dirname, "../src/services/auth.service.ts");
  const source = ts.createSourceFile(filename, readFileSync(filename, "utf8"), ts.ScriptTarget.Latest, true);
  const printer = ts.createPrinter();
  const selected = source.statements.filter((statement) => ts.isFunctionDeclaration(statement) &&
    ["normalizeOrganization", "getOrganizationDirectory"].includes(statement.name?.text ?? ""));
  const code = ts.transpileModule(selected.map((statement) => printer.printNode(ts.EmitHint.Unspecified, statement, source)).join("\n"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
  }).outputText;
  for (const role of ["Student Leader", "Organization Member"]) {
    const docs = [
      { id: config.TEST_ORGANIZATION_ID, data: () => ({ name: config.TEST_ORGANIZATION_NAME, ...config.TEST_ORGANIZATION_STATUSES }) },
      { id: "inactive", data: () => ({ name: "Inactive organization", status: "active", setupStatus: "inactive" }) },
      { id: "pending", data: () => ({ name: "Pending organization", status: "pending" }) }
    ];
    const firestore = { collection: (name: string) => {
      assert.equal(name, "organizations");
      return { orderBy: () => ({ get: async () => ({ docs }) }) };
    } };
    const exports: any = {};
    new Function("exports", "firestore", "getCurrentUser", code)(exports, firestore, async () => ({ role }));
    const directory = await exports.getOrganizationDirectory("test-user");
    assert.deepEqual(directory.map((item: any) => item.id), [config.TEST_ORGANIZATION_ID]);
    assert.equal(directory[0].name, "Musubi Test Organization");
    assert.equal(directory[0].status, "active");
  }
});

test("lookalike emails, ordinary UIDs, and unmarked profiles cannot acquire automatic membership", () => {
  const account = config.TEST_ACCOUNTS[0];
  for (const [uid, email, marker] of [
    ["ordinary-user", account.email, config.TEST_ACCOUNT_SUITE],
    [account.uid, "test21@university.edu.ph", config.TEST_ACCOUNT_SUITE],
    [account.uid, "test1@different.edu.ph", config.TEST_ACCOUNT_SUITE],
    [account.uid, "studentleader1@university.edu.ph", config.TEST_ACCOUNT_SUITE],
    [account.uid, account.email, undefined]
  ]) assert.equal(testAccountSessionUpdate(uid!, email, 1, { testAccountSuite: marker, testAccountUid: account.uid }), null);
});

test("new sign-ins reset profile setup and both role walkthroughs before membership is activated", () => {
  for (const account of config.TEST_ACCOUNTS) {
    const old = { testAccountSuite: config.TEST_ACCOUNT_SUITE, testAccountUid: account.uid, testAccountAuthTime: 100, role: "Admin", organizationId: null,
      tutorials: { [`${account.role}:v1`]: completed, "Admin:v1": completed } };
    const update = testAccountSessionUpdate(account.uid, account.email, 101, old, Date.parse("2026-11-11T00:00:00Z"))!;
    assert.equal(update.role, account.role);
    assert.equal(update.organizationId, null);
    assert.equal(update.organizationName, null);
    assert.equal(update.onboardingCompleted, false);
    assert.equal(update.position, null);
    assert.equal(update.program, null);
    assert.equal(update.yearLevel, null);
    assert.deepEqual(update.skills, []);
    assert.equal(getPostAuthenticationRoute(update as any), "/onboarding");
    const tutorials = update.tutorials as Record<string, TutorialStatus>;
    assert.deepEqual(Object.keys(tutorials), ["Student Leader:v1", "Organization Member:v1"]);
    for (const role of ["Student Leader", "Organization Member"]) {
    const fresh = tutorials[`${role}:v1`];
    const { updatedAt: _, ...payload } = fresh;
    assert.ok(tutorialStatusSchema.safeParse({ ...payload, role }).success);
    assert.equal(fresh.acknowledged, false);
    assert.deepEqual(fresh.seenPages, []);
    assert.equal(onboardingProgress(fresh).preference, undefined, "Get Started must be shown again");
    assert.equal(mergeOnboarding(fresh.onboarding, completed.onboarding)?.modules, undefined, "Stale clients cannot resurrect completed guides");
    }
    assert.equal(update.fullName, undefined, "Profile edits are preserved");
  }
});

test("refreshes and older sessions preserve the chosen role, profile, skills, and current tour", () => {
  const account = config.TEST_ACCOUNTS[0];
  for (const authTime of [100, 99]) {
    const update = testAccountSessionUpdate(account.uid, account.email, authTime, {
      testAccountSuite: config.TEST_ACCOUNT_SUITE, testAccountUid: account.uid, testAccountAuthTime: 100, tutorials: { [`${account.role}:v1`]: completed }
    });
    assert.equal(update, null);
  }
  assert.throws(() => testAccountSessionUpdate(account.uid, account.email, NaN, { testAccountSuite: config.TEST_ACCOUNT_SUITE, testAccountUid: account.uid }));
});

test("an adopted account uses its original UID only when the stored binding matches", () => {
  const account = config.TEST_ACCOUNTS[0];
  const originalUid = "original-firebase-uid";
  const data = { testAccountSuite: config.TEST_ACCOUNT_SUITE, testAccountUid: originalUid };
  assert.equal(testAccountSessionUpdate(originalUid, account.email, 1, data)?.onboardingCompleted, false);
  assert.equal(testAccountSessionUpdate(account.uid, account.email, 1, data), null);
});

test("a new run supersedes even a future-dated previously saved reset", () => {
  const account = config.TEST_ACCOUNTS[0];
  const update = testAccountSessionUpdate(account.uid, account.email, 2, { testAccountSuite: config.TEST_ACCOUNT_SUITE, testAccountUid: account.uid,
    tutorials: { [account.role + ":v1"]: { onboarding: { restartedAt: "2030-01-01T00:00:00.000Z" } } } }, 1)!;
  assert.equal((update.tutorials as any)[account.role + ":v1"].onboarding.restartedAt, "2030-01-01T00:00:00.001Z");
});

test("login preparation checks the marked organization and writes within a transaction", async () => {
  const account = config.TEST_ACCOUNTS[0];
  let data: Record<string, any> = { testAccountSuite: config.TEST_ACCOUNT_SUITE, testAccountUid: account.uid, tutorials: { [account.role + ":v1"]: completed } };
  let org: Record<string, any> = { testAccountSuite: config.TEST_ACCOUNT_SUITE, status: "active" };
  const writes: any[] = [];
  const firestore = { collection: (name: string) => ({ doc: (id: string) => ({ path: `${name}/${id}` }) }),
    runTransaction: async (operation: (transaction: any) => unknown) => operation({
      get: async (ref: any) => ({ data: () => ref.path.startsWith("users/") ? data : org }),
      update: (ref: any, update: any) => { writes.push({ ref, update }); data = { ...data, ...update }; }
    }) };
  const code = ts.transpileModule(readFileSync(resolve(__dirname, "../src/services/testAccounts.service.ts"), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
  }).outputText;
  const exports: any = {};
  const mocks: Record<string, any> = { "../config/firebase.js": { firestore }, "../config/testAccounts.js": config,
    "../utils/AppError.js": { AppError }, "../utils/testAccountSession.js": { testAccountSessionUpdate } };
  new Function("exports", "require", code)(exports, (name: string) => mocks[name]);
  await exports.prepareTestAccountLogin("ordinary", account.email, 1);
  assert.equal(writes.length, 0);
  org = {};
  await assert.rejects(exports.prepareTestAccountLogin(account.uid, account.email, 1), /test organization is unavailable/);
  assert.equal(writes.length, 0);
  org = { testAccountSuite: config.TEST_ACCOUNT_SUITE, status: "active" };
  await exports.prepareTestAccountLogin(account.uid, account.email, 1);
  assert.equal(writes[0].update.organizationId, null);
  assert.equal(Object.keys(writes[0].update.tutorials).length, 2);
  await exports.prepareTestAccountLogin(account.uid, account.email, 1);
  assert.equal(writes.length, 1);
  data = { ...data, testAccountSuite: "another-suite" };
  await exports.prepareTestAccountLogin(account.uid, account.email, 2);
  assert.equal(writes.length, 1);
});
