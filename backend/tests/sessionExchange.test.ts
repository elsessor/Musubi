import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

function service(fetcher: any) {
  const code = ts.transpileModule(readFileSync(resolve(__dirname, "../../frontend/src/services/auth.service.ts"), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
  }).outputText;
  const exports: any = {};
  new Function("exports", "require", "fetch", code)(exports, () => ({}), fetcher);
  return exports;
}
const user = (uid = "member") => ({ uid, displayName: "Member", getIdToken: async () => "token" });

test("sign-in preserves the database quota cause instead of claiming Google failed", async () => {
  const api = service(async () => ({ ok: false, status: 503,
    json: async () => ({ code: "DATABASE_QUOTA_EXCEEDED", message: "Database quota exceeded" }) }));
  await assert.rejects(api.exchangeFirebaseSession(user()), /database.*usage limit/);
});

test("concurrent form and auth-listener login share one request and failure allows retry", async () => {
  let calls = 0, release: any;
  const response = new Promise(resolve => { release = resolve; });
  const api = service(() => { calls++; return response; });
  const first = api.exchangeFirebaseSession(user());
  const second = api.exchangeFirebaseSession(user(), "Member");
  assert.equal(first, second);
  const rejected = assert.rejects(first, /Service unavailable/);
  await Promise.resolve();
  assert.equal(calls, 1);
  release({ ok: false, status: 503, json: async () => ({ message: "Service unavailable" }) });
  await rejected;
  await assert.rejects(api.exchangeFirebaseSession(user()), /Service unavailable/);
  assert.equal(calls, 2);
});

test("requests for separate accounts are never shared and non-JSON failures remain readable", async () => {
  let calls = 0;
  const api = service(async () => { calls++; return { ok: false, status: 502, json: async () => { throw new Error("HTML gateway page"); } }; });
  await Promise.all([
    assert.rejects(api.exchangeFirebaseSession(user("one")), /authentication server could not load/),
    assert.rejects(api.exchangeFirebaseSession(user("two")), /authentication server could not load/)
  ]);
  assert.equal(calls, 2);
});
