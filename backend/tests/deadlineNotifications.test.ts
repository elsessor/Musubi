import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

test("deadline notifications are personal and durable, and reading one does not mark it read for everyone", async () => {
  const callbacks: Array<(snapshot: any) => void> = [];
  const updates: any[] = [];
  const modules: Record<string, any> = {
    "firebase/firestore": {
      collection: () => ({}), query: () => ({}), where: () => ({}), limit: () => ({}),
      onSnapshot: (_query: any, callback: any) => { callbacks.push(callback); return () => {}; },
      doc: (_db: any, _collection: any, id: any) => ({ id }), arrayUnion: (uid: string) => [uid],
      updateDoc: async (_doc: any, update: any) => updates.push(update)
    },
    "../firebase/config": { getFirebaseDb: () => ({}) },
    "./announcements.service": { subscribeAnnouncementsFirestore: () => () => {} },
    "@/store/authStore": { useAuthStore: { getState: () => ({ profile: { uid: "member", role: "Organization Member", organizationId: "org" } }) } }
  };
  const source = readFileSync(resolve(__dirname, "../../frontend/src/services/notifications.service.ts"), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const service: any = {};
  new Function("exports", "require", code)(service, (name: string) => { assert.ok(modules[name], `Unexpected dependency ${name}`); return modules[name]; });
  let rows: any[] = [];
  const stop = service.subscribeNotificationsFirestore({ uid: "member" }, "org", (data: any[]) => { rows = data; });
  const notice = { orgId: "org", title: "Arrange chairs (Overdue)", description: "Event", type: "nudge", nudgeCategory: "deadline", dueDate: "2026-10-12", createdAt: "2026-10-13T00:00:00Z", readBy: [] };
  callbacks[0]({ docs: [
    { id: "first", data: () => ({ ...notice, recipientUID: "member" }) },
    { id: "other-task", data: () => ({ ...notice, recipientUID: "member" }) },
    { id: "leader-only", data: () => ({ ...notice, recipientUID: "leader" }) },
    { id: "broadcast", data: () => ({ orgId: "org", type: "system", title: "General update" }) }
  ] });
  assert.deepEqual(rows.map(row => row.id).sort(), ["broadcast", "first", "other-task"]);
  assert.equal(rows[0].nudgeCategory, "deadline");
  await service.markNotificationAsRead({ uid: "member" }, "first");
  assert.deepEqual(updates, [{ readBy: ["member"] }]);
  stop();
});
