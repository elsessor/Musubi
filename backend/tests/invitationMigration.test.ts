import assert from "node:assert/strict";
import test from "node:test";
import { getInvitationApplicantUID, invitationAsJoinRequest } from "../src/utils/invitationMigration.js";

const submittedAt = { seconds: 1791385086, nanoseconds: 0 };
const user = { fullName: "New Member", email: "member@example.com", position: "Vice President", skills: ["Photography"] };
const invitation = { organizationId: "org", invitedUID: "member", invitedByUID: "leader", email: user.email, status: "pending", sentAt: submittedAt };

test("legacy invitation becomes the applicant's join request with the original time and profile", () => {
  assert.deepEqual(invitationAsJoinRequest(invitation, user), {
    organizationId: "org", requestedByUID: "member", name: user.fullName, email: user.email,
    position: user.position, skills: user.skills, status: "pending", submittedAt
  });
  assert.equal(getInvitationApplicantUID(invitation), "member");
});

test("existing join-request fields and recorded review metadata are retained", () => {
  const source = { ...invitation, requestedByUID: "applicant", name: "Saved Name", position: "President", skills: ["Editing"], submittedAt, reviewedAt: submittedAt, reviewedByUID: "reviewer", status: "accepted" };
  const migrated = invitationAsJoinRequest(source, user);
  assert.equal(migrated.requestedByUID, "applicant");
  assert.equal(migrated.name, "Saved Name");
  assert.deepEqual(migrated.skills, ["Editing"]);
  assert.equal(migrated.reviewedByUID, "reviewer");
  assert.equal(migrated.status, "accepted");
  assert.equal(migrated.reviewedAt, submittedAt);
});

test("migration rejects mismatched identities and malformed source records", () => {
  assert.throws(() => invitationAsJoinRequest(invitation, { ...user, email: "other@example.com" }));
  for (const change of [{ invitedUID: null }, { organizationId: "org/other" }, { status: "unknown" }, { sentAt: null }]) {
    assert.throws(() => invitationAsJoinRequest({ ...invitation, ...change }, user));
  }
});
