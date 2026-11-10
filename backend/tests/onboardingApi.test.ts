import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { AppError } from "../src/utils/AppError.js";
import { tutorialStatusSchema } from "../src/utils/tutorialStatus.js";
import * as progress from "../src/utils/onboardingProgress.js";

const stamp = "2026-11-10T00:00:00.000Z";
const code = ts.transpileModule(readFileSync(resolve(__dirname, "../src/controllers/tutorial.controller.ts"), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
function api(previous: any, role = "Organization Member") {
  const writes: any[] = [];
  const references: string[] = [];
  const record = { fullName: "Alex Santos", role, tutorials: { [`${role}:v1`]: previous } };
  const snapshot = { exists: true, data: () => record };
  const ref = { get: async () => snapshot };
  const firestore = {
    collection: (name: string) => ({ doc: (uid: string) => { references.push(`${name}/${uid}`); return ref; } }),
    runTransaction: async (operation: (transaction: any) => unknown) => operation({ get: async () => snapshot, set: (...args: any[]) => writes.push(args) })
  };
  const mocks: Record<string, unknown> = { "../config/firebase.js": { firestore }, "../utils/AppError.js": { AppError }, "../utils/tutorialStatus.js": { tutorialStatusSchema }, "../utils/onboardingProgress.js": progress };
  const exports: any = {};
  new Function("exports", "require", code)(exports, (name: string) => mocks[name]);
  return { writes, references, async request(body: any, authUser: { uid: string } | null = { uid: "current-user" }) {
    let response: any, failure: any;
    await exports.tutorialController({ method: "PUT", authUser, body }, { json: (value: any) => { response = value; } }, (error: any) => { failure = error; });
    return { response, failure };
  } };
}

test("tutorial API merges concurrent module progress inside the authenticated user's record", async () => {
  const previous = { onboarding: { version: 1, modules: { "page-dashboard": { status: "completed", step: 3, updatedAt: stamp } } }, seenPages: ["page-dashboard"] };
  const app = api(previous);
  const result = await app.request({ role: "Organization Member", version: 1, status: "in_progress", tour: "sidebar", step: 2,
    onboarding: { version: 1, preference: { mode: "guided", updatedAt: stamp }, sidebar: { status: "in_progress", step: 2, updatedAt: stamp }, modules: { "page-organization": { status: "dismissed", step: 1, updatedAt: stamp } } } });
  assert.equal(result.failure, undefined);
  assert.deepEqual(app.references, ["users/current-user"]);
  assert.equal(result.response.tutorial.onboarding.modules["page-dashboard"].status, "completed");
  assert.equal(result.response.tutorial.onboarding.modules["page-organization"].status, "dismissed");
  assert.equal(result.response.tutorial.onboarding.sidebar.step, 2);
  assert.deepEqual(Object.keys(app.writes[0][1]), ["tutorials"]);
  assert.deepEqual(app.writes[0][2], { merge: true });
  assert.equal(app.writes[0][1].fullName, undefined);
});

test("tutorial API rejects unauthorized, stale-role, and malformed progress without writing", async () => {
  const payload = { role: "Organization Member", version: 1, status: "in_progress", tour: "sidebar", step: 0 };
  const app = api(null);
  assert.equal((await app.request(payload, null)).failure.statusCode, 401);
  assert.equal((await app.request({ ...payload, role: "Admin" })).failure.statusCode, 409);
  assert.equal((await app.request({ ...payload, onboarding: { version: 1, modules: { unknown: { status: "completed", step: 0, updatedAt: stamp } } } })).failure.statusCode, 400);
  assert.equal(app.writes.length, 0);
});

test("repaired legacy page history is retained by account synchronization", async () => {
  const item = { status: "dismissed", step: 0, updatedAt: stamp };
  const app = api({ tour: "page-events", onboarding: { version: 1, preference: { mode: "independent", updatedAt: stamp }, welcome: item, sidebar: item, modules: { "page-event-details": item } } });
  const result = await app.request({ role: "Organization Member", version: 1, status: "in_progress", tour: "page-event-details", step: 0, onboarding: { version: 1, preference: { mode: "guided", source: "legacy", updatedAt: stamp }, modules: { "page-event-details": { ...item, status: "in_progress" } } } });
  assert.equal(result.failure, undefined);
  assert.equal(result.response.tutorial.onboarding.preference.mode, "guided");
  assert.equal(result.response.tutorial.onboarding.modules["page-event-details"].status, "in_progress");
});
