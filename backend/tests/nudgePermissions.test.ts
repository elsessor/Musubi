import assert from "node:assert/strict";
import test from "node:test";
import type { JwtPayload } from "../src/types/auth.types.js";
import { AppError } from "../src/utils/AppError.js";
import { assertCanSendManualNudge } from "../src/utils/nudgePermissions.js";

const leader: JwtPayload = { uid: "leader", email: "leader@example.com", role: "Student Leader", organizationId: "org" };
const forbidden = (error: unknown) => error instanceof AppError && error.statusCode === 403;

test("manual nudges require authentication", () => {
  assert.throws(() => assertCanSendManualNudge(undefined, "member"), (error: unknown) => error instanceof AppError && error.statusCode === 401);
});

test("members cannot nudge themselves or other members", () => {
  const member: JwtPayload = { ...leader, uid: "member", role: "Organization Member" };
  assert.throws(() => assertCanSendManualNudge(member, "member"), forbidden);
  assert.throws(() => assertCanSendManualNudge(member, "other-member"), forbidden);
});

test("leaders and admins can nudge another member, using UID or email", () => {
  for (const role of ["Student Leader", "Admin"] as const) {
    assert.doesNotThrow(() => assertCanSendManualNudge({ ...leader, role }, "member"));
    assert.doesNotThrow(() => assertCanSendManualNudge({ ...leader, role }, undefined, "member@example.com"));
  }
});

test("self-nudges are blocked by UID and normalized email, including resolved addresses", () => {
  for (const role of ["Student Leader", "Admin"] as const) {
    const actor = { ...leader, role };
    assert.throws(() => assertCanSendManualNudge(actor, "leader"), forbidden);
    assert.throws(() => assertCanSendManualNudge(actor, undefined, " LEADER@EXAMPLE.COM "), forbidden);
    assert.throws(() => assertCanSendManualNudge(actor, "different-uid", "leader@example.com"), forbidden);
  }
});
