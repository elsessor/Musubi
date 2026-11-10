import assert from "node:assert/strict";
import test from "node:test";
import type { Firestore } from "firebase-admin/firestore";
import { dispatchTaskReminders } from "../src/utils/taskReminderDispatch.js";

function database(tasks: any[] = [{ id: "task", title: "Arrange chairs", status: "To Do", dueDate: "2026-10-12", assignedMemberUID: "member" }]) {
  const records = new Map<string, any>([
    ["events/event", { orgId: "org", title: "Campus event", status: "Active", tasks }],
    ["users/member", { fullName: "Member", email: "member@example.test", role: "Organization Member", organizationId: "org" }],
    ["users/leader", { fullName: "Leader", email: "leader@example.test", role: "Student Leader", organizationId: "org" }],
    ["users/other", { fullName: "Other", email: "other@example.test", role: "Organization Member", organizationId: "other" }]
  ]);
  const snapshot = (key: string): any => ({ id: key.split("/").at(-1), ref: ref(key), exists: records.has(key), data: () => structuredClone(records.get(key)) });
  const ref = (key: string): any => ({ id: key.split("/").at(-1), key, get: async () => snapshot(key) });
  const collection = (name: string, field?: string, value?: string): any => ({
    doc: (id: string) => ref(`${name}/${id}`),
    where: (field: string, _op: string, value: string) => collection(name, field, value),
    get: async () => ({ docs: [...records.keys()].filter(key => key.startsWith(`${name}/`) && (!field || records.get(key)[field] === value)).map(snapshot) })
  });
  let chain: Promise<any> = Promise.resolve();
  const db = { collection, runTransaction: (callback: (transaction: any) => Promise<any>) => {
    const pending = chain.then(async () => {
      const writes: Array<() => void> = [];
      const result = await callback({ get: async (reference: any) => { assert.equal(writes.length, 0, "all transaction reads must precede writes"); return snapshot(reference.key); },
        set: (reference: any, data: any) => writes.push(() => records.set(reference.key, structuredClone(data))),
        update: (reference: any, data: any) => writes.push(() => records.set(reference.key, { ...records.get(reference.key), ...structuredClone(data) })) });
      writes.forEach(write => write()); return result;
    });
    chain = pending.catch(() => {}); return pending;
  } } as unknown as Firestore;
  const emails: any[] = [];
  const run = (now: string, sendEmail = async (input: any) => { emails.push(input); return { success: true }; }) => dispatchTaskReminders({ db, sendEmail, serverTimestamp: () => now, now: new Date(now) });
  return { db, records, emails, run, notices: () => [...records].filter(([key]) => key.startsWith("notifications/")).map(([, value]) => value) };
}

test("concurrent reminder checks send once per stage and recipient; today, tomorrow and overdue are distinct", async () => {
  const app = database();
  await Promise.all([app.run("2026-10-11T00:00:00Z"), app.run("2026-10-11T00:00:00Z")]);
  assert.equal(app.emails.length, 1);
  assert.match(app.emails[0].message, /^Due tomorrow/);
  const notice = [...app.records].find(([key]) => key.startsWith("notifications/"))!;
  app.records.set(notice[0], { ...notice[1], readBy: ["member"] });
  await app.run("2026-10-11T01:00:00Z");
  assert.deepEqual(app.records.get(notice[0]).readBy, ["member"]);
  await app.run("2026-10-12T15:59:59Z");
  assert.match(app.emails[1].message, /^Due today/);
  assert.equal(app.notices().some(notice => notice.reminderKind === "overdue"), false);
  await Promise.all([app.run("2026-10-12T16:00:00Z"), app.run("2026-10-12T16:00:00Z")]);
  assert.equal(app.emails.length, 4);
  const overdue = app.notices().filter(notice => notice.reminderKind === "overdue");
  assert.deepEqual(overdue.map(notice => notice.recipientUID).sort(), ["leader", "member"]);
  await app.run("2026-10-15T00:00:00Z");
  assert.equal(app.emails.length, 4);
  assert.equal(app.records.get("events/event").tasks[0].status, "To Do");
});

test("no-deadline, cancelled, archived, review and completed records suppress all automatic reminders", async () => {
  for (const status of ["Cancelled", "canceled", "Archived", "Completed", "Done", "In Review"]) {
    const app = database([{ id: "task", status, dueDate: "2026-10-12", assignedMemberUID: "member" }]);
    await app.run("2026-10-15T00:00:00Z"); assert.equal(app.notices().length, 0); assert.equal(app.emails.length, 0);
  }
  for (const override of [{ dueDate: "" }, { archivedAt: "archived" }]) {
    const app = database(); Object.assign(app.records.get("events/event").tasks[0], override);
    await app.run("2026-10-15T00:00:00Z"); assert.equal(app.notices().length, 0);
  }
  for (const status of ["Cancelled", "Archived", "Completed"]) {
    const app = database(); app.records.get("events/event").status = status;
    await app.run("2026-10-15T00:00:00Z"); assert.equal(app.notices().length, 0);
  }
});

test("blocked overdue alerts name prerequisites, and fresh organization membership determines delivery", async () => {
  const app = database([{ id: "prerequisite", title: "Approve budget", status: "To Do" }, { id: "task", title: "Arrange chairs", status: "To Do", dueDate: "2026-10-12", assignedMemberUID: "member", dependsOnTaskIds: ["prerequisite"] }]);
  app.records.get("users/member").organizationId = "other";
  await app.run("2026-10-15T00:00:00Z");
  assert.equal(app.notices().length, 1);
  assert.equal(app.notices()[0].recipientUID, "leader");
  assert.match(app.notices()[0].title, /Overdue · Blocked/);
  assert.match(app.notices()[0].description, /Approve budget/);
});

test("email delivery updates merge with concurrent task changes and a new deadline creates a fresh reminder identity", async () => {
  const app = database();
  await app.run("2026-10-11T00:00:00Z", async () => {
    const task = app.records.get("events/event").tasks[0];
    task.attachments = [{ id: "new-upload" }]; task.status = "In Review";
    return { success: true };
  });
  let task = app.records.get("events/event").tasks[0];
  assert.deepEqual(task.attachments, [{ id: "new-upload" }]); assert.equal(task.status, "In Review");
  assert.equal(task.nudges[0].sent, true);
  task.status = "To Do"; task.dueDate = "2026-10-13";
  await app.run("2026-10-12T00:00:00Z");
  task = app.records.get("events/event").tasks[0];
  assert.equal(task.nudges.length, 2);
  assert.notEqual(task.nudges[0].nudgeUID, task.nudges[1].nudgeUID);
  assert.equal(app.notices().length, 2);
});

test("failed email attempts do not repeat or erase the durable in-app notification", async () => {
  const app = database(); let attempts = 0;
  const fail = async () => { attempts++; throw new Error("Provider unavailable"); };
  await app.run("2026-10-11T00:00:00Z", fail); await app.run("2026-10-11T00:00:00Z", fail);
  assert.equal(attempts, 1); assert.equal(app.notices().length, 1);
  assert.equal(app.records.get("events/event").tasks[0].nudges[0].emailState, "failed");
});

test("Hans receives the assignment reminder and Carl receives a separate leader alert with Hans identified as assignee", async () => {
  const app = database([{ id: "task", title: "Letter for VPHE", status: "asdf", dueDate: "2026-10-11", assignedMemberUID: "member", assignedMemberName: "Hans Ernie V. San Miguel" }]);
  app.records.get("users/member").fullName = "Hans Ernie V. San Miguel";
  app.records.get("users/member").role = "Student Leader";
  app.records.get("users/leader").fullName = "Carl Emmanuel P. Valenciano";
  await app.run("2026-10-12T15:00:00Z");
  const hans = app.emails.find(email => email.to === "member@example.test");
  const carl = app.emails.find(email => email.to === "leader@example.test");
  assert.equal(app.emails.length, 2);
  assert.equal(hans.recipientKind, "assignee");
  assert.equal(hans.recipientName, "Hans Ernie V. San Miguel");
  assert.equal(carl.recipientKind, "leader");
  assert.equal(carl.assigneeName, "Hans Ernie V. San Miguel");
  assert.match(carl.message, /Review this task with Hans Ernie V. San Miguel/);
  assert.doesNotMatch(carl.message, /your leader|your task/);
  assert.equal(app.notices().find(notice => notice.recipientUID === "leader").assigneeUID, "member");
  await app.run("2026-10-12T15:00:00Z");
  assert.equal(app.emails.length, 2);
});
