import assert from "node:assert/strict";
import test from "node:test";
import { assertCanUpdateOrganization } from "../src/utils/organizationPermissions.js";
import { AppError } from "../src/utils/AppError.js";
import type { TaskActor } from "../src/utils/taskPermissions.js";

const leader: TaskActor = { uid: "leader", fullName: "Leader", role: "Student Leader", organizationId: "org" };
const forbidden = (error: unknown) => error instanceof AppError && error.statusCode === 403;

test("leaders edit their organization's details but cannot change setup status through the API", () => {
  assert.doesNotThrow(() => assertCanUpdateOrganization(leader, "org", {}));
  for (const setupStatus of ["active", "pending", "inactive"]) {
    assert.throws(() => assertCanUpdateOrganization(leader, "org", { setupStatus }), forbidden);
  }
});

test("members and leaders from another organization cannot edit organization details", () => {
  assert.throws(() => assertCanUpdateOrganization({ ...leader, role: "Organization Member" }, "org", {}), forbidden);
  assert.throws(() => assertCanUpdateOrganization(leader, "other", {}), forbidden);
});

test("administrator review retains permission to manage setup status", () => {
  assert.doesNotThrow(() => assertCanUpdateOrganization({ ...leader, role: "Admin", organizationId: null }, "org", { setupStatus: "active" }));
});
