import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

test("leader emails name Hans as the assignee while Hans's email describes his own assignment", async () => {
  const sent: Array<{ to: string; subject: string; html: string }> = [];
  const modules: Record<string, unknown> = {
    nodemailer: { createTransport: () => ({ sendMail: async (message: any) => { sent.push(message); return { messageId: "mock-email" }; } }) },
    "../config/env.js": { env: { gmailUser: "sender@example.test", gmailAppPassword: "mock-only", frontendUrl: "https://example.test" } }
  };
  const source = readFileSync(resolve(__dirname, "../src/services/email.service.ts"), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const service: { sendNudgeNotificationEmail?: (input: any) => Promise<{ success: boolean }> } = {};
  new Function("exports", "require", "console", code)(service, (name: string) => {
    assert.ok(modules[name], `Unexpected import ${name}`); return modules[name];
  }, { log: () => {}, warn: () => {}, error: () => {} });
  const input = { taskTitle: "Letter for VPHE", eventName: "Spring Fundraiser 2026", assigneeName: "Hans Ernie V. San Miguel", nudgeType: "overdue" };
  assert.equal((await service.sendNudgeNotificationEmail!({ ...input, recipientKind: "leader", to: "carl@example.test", recipientName: "Carl Emmanuel P. Valenciano" })).success, true);
  assert.equal((await service.sendNudgeNotificationEmail!({ ...input, recipientKind: "assignee", to: "hans@example.test", recipientName: "Hans Ernie V. San Miguel" })).success, true);
  assert.match(sent[0].subject, /^Leader alert/);
  assert.match(sent[0].html, /Hello Carl Emmanuel P. Valenciano/);
  assert.match(sent[0].html, /assigned to <strong>Hans Ernie V. San Miguel<\/strong>/);
  assert.doesNotMatch(sent[0].html, /your assigned task/);
  assert.doesNotMatch(sent[1].subject, /^Leader alert/);
  assert.match(sent[1].html, /Hello Hans Ernie V. San Miguel/);
  assert.match(sent[1].html, /your assigned task/);
});
