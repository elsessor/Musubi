import assert from "node:assert/strict";
import test from "node:test";
import { getAdminAccountStatus } from "../src/utils/adminAccountStatus.js";

test("completed onboarding with a pending organization application remains a pending join request", () => {
  assert.equal(getAdminAccountStatus({ onboardingCompleted: true }, true), "Pending Join Request");
});

test("unfinished onboarding alone is not an invitation or a pending join request", () => {
  assert.equal(getAdminAccountStatus({ onboardingCompleted: false }, false), "Onboarding");
  assert.equal(getAdminAccountStatus({}, false), "Onboarding");
  assert.equal(getAdminAccountStatus({ onboardingCompleted: false, inviteStatus: "Pending Invite" }, false), "Onboarding");
});

test("accepting or rejecting the last pending request restores the completed account's active status", () => {
  const user = { onboardingCompleted: true };
  assert.equal(getAdminAccountStatus(user, true), "Pending Join Request");
  assert.equal(getAdminAccountStatus(user, false), "Active");
});

test("an actual pending request takes precedence over unfinished onboarding", () => {
  assert.equal(getAdminAccountStatus({ onboardingCompleted: false }, true), "Pending Join Request");
});

test("existing inactive account flags are preserved even with a pending request", () => {
  assert.equal(getAdminAccountStatus({ onboardingCompleted: true, accountStatus: "Inactive" }, true), "Inactive");
  assert.equal(getAdminAccountStatus({ onboardingCompleted: true, inviteStatus: "Inactive" }, false), "Inactive");
});
