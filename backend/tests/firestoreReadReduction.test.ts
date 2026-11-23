import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { MemoryCache } from "../src/utils/cache.js";

test("admin refreshes reuse directory reads; invalidation still returns fresh records and checks permissions", async () => {
  const source = readFileSync(resolve(__dirname, "../src/services/auth.service.ts"), "utf8");
  const ast = ts.createSourceFile("auth.ts", source, ts.ScriptTarget.Latest, true);
  const names = ["buildAdminMemberDirectory", "getAdminMemberDirectory"];
  const selected = ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text || ""));
  assert.equal(selected.length, 2);
  const code = ts.transpileModule(selected.map(node => node.getText(ast)).join("\n"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022
  } }).outputText;
  let reads = 0, authorizations = 0;
  const users: any[] = [];
  const firestore = { collection: (_name: string) => {
    const query: any = { where: () => query, get: async () => { reads++; return { docs: _name === "users" ? users : [] }; } };
    return query;
  } };
  const cache = new MemoryCache(), exports: any = {};
  new Function("exports", "firestore", "appCache", "requireAdmin", "getAdminAccountStatus", "asIsoString", "isUserRole", code)(
    exports, firestore, cache, async () => { authorizations++; }, () => "Active", () => null, () => true
  );
  assert.deepEqual((await exports.getAdminMemberDirectory("admin")).members, []);
  const firstReads = reads;
  await exports.getAdminMemberDirectory("admin");
  assert.equal(reads, firstReads, "A repeated dashboard refresh must not rescan users and organizations");
  assert.equal(authorizations, 2, "Cached results must still require admin authorization");
  users.push({ id: "member", data: () => ({ fullName: "New Member", role: "Organization Member" }) });
  cache.delete("admin_member_directory");
  assert.equal((await exports.getAdminMemberDirectory("admin")).members[0].name, "New Member");
  assert.ok(reads > firstReads);
});

test("admin organization summaries use count queries, cache repeated requests, and refresh after invalidation or expiry", async (t) => {
  let now = 1000;
  t.mock.method(Date, "now", () => now);
  let organizationReads = 0, countQueries = 0, authorizations = 0;
  const aggregate = (count: number): any => ({
    count: () => ({ get: async () => { countQueries++; return { data: () => ({ count }) }; } }),
    get: async () => { throw new Error("Count-only summaries must not download member documents"); }
  });
  const organization = { id: "club", data: () => ({ name: "Club" }),
    ref: { collection: (name: string) => aggregate(name === "committees" ? 3 : 0) } };
  const firestore = { collection: (name: string) => name === "organizations"
    ? { get: async () => { organizationReads++; return { empty: false, docs: [organization] }; } }
    : { where: () => aggregate(1200) } };
  const ast = ts.createSourceFile("auth.ts", readFileSync(resolve(__dirname, "../src/services/auth.service.ts"), "utf8"), ts.ScriptTarget.Latest, true);
  const selected = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "getOrganizationsForAdmin")!;
  const code = ts.transpileModule(selected.getText(ast), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022
  } }).outputText;
  const cache = new MemoryCache(), exports: any = {};
  new Function("exports", "firestore", "appCache", "requireAdmin", "normalizeOrganization", code)(
    exports, firestore, cache, async () => { authorizations++; }, (id: string, value: any) => ({ id, ...value })
  );
  assert.deepEqual(await exports.getOrganizationsForAdmin("admin"), [{ id: "club", name: "Club", memberCount: 1200, committeeCount: 3 }]);
  await exports.getOrganizationsForAdmin("admin");
  assert.equal(organizationReads, 1);
  assert.equal(countQueries, 3);
  assert.equal(authorizations, 2);
  cache.delete("admin_organizations");
  await exports.getOrganizationsForAdmin("admin");
  assert.equal(organizationReads, 2);
  now += 60001;
  await exports.getOrganizationsForAdmin("admin");
  assert.equal(organizationReads, 3);
});
