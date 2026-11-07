import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

function service(user: any, fetcher: any) {
  let expire: () => void = () => {};
  let cleared = false;
  const exports: any = {};
  const code = ts.transpileModule(readFileSync(resolve(__dirname, "../../frontend/src/services/notifications.service.ts"), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
  }).outputText;
  new Function("exports", "require", "fetch", "setTimeout", "clearTimeout", code)(
    exports,
    (name: string) => name === "@/store/authStore" ? { useAuthStore: { getState: () => ({ firebaseUser: user }) } } : {},
    fetcher, (callback: () => void) => { expire = callback; return 1; }, () => { cleared = true; }
  );
  return { check: exports.checkAndDispatchDueNudges, expire: () => expire(), cleared: () => cleared };
}

test("member nudge check sends credentials and preserves server failures", async () => {
  const api = service({ getIdToken: async () => "member-token" }, async (_url: string, options: any) => {
    assert.equal(options.headers.Authorization, "Bearer member-token");
    assert.ok(options.signal);
    return { ok: false, json: async () => ({ error: "Email service unavailable" }) };
  });
  assert.deepEqual(await api.check(), { success: false, processedCount: undefined, error: "Email service unavailable" });
  assert.ok(api.cleared());
});

test("stalled token and network requests release the loading action", async () => {
  for (const stalledToken of [true, false]) {
    let signal: AbortSignal | undefined;
    const api = service({ getIdToken: () => stalledToken ? new Promise(() => {}) : Promise.resolve("token") },
      async (_url: string, options: any) => { signal = options.signal; return new Promise(() => {}); });
    const pending = api.check();
    await Promise.resolve();
    api.expire();
    const result = await pending;
    assert.equal(result.success, false);
    assert.match(result.error, /took too long/);
    if (signal) assert.ok(signal.aborted);
    assert.ok(api.cleared());
  }
});

test("successful checks return the actual dispatched count", async () => {
  const api = service({ getIdToken: async () => "token" }, async () => ({
    ok: true, json: async () => ({ success: true, processedCount: 2 })
  }));
  assert.equal((await api.check()).processedCount, 2);
});
