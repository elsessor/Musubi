import assert from "node:assert/strict";
import test from "node:test";
import { assertCanPostAnnouncement, canViewAnnouncement } from "../src/utils/announcementAccess.js";

const member = { uid: "member", fullName: "Member", role: "Organization Member" as const, organizationId: "org", committeeId: "arts" };
const leader = { ...member, role: "Student Leader" as const };
const announcement = { organizationId: "org", targetAudience: "Committee", committeeId: "arts" };

test("committee announcements are visible only to their current committee and organization leaders", () => {
  assert.equal(canViewAnnouncement(member, announcement), true);
  assert.equal(canViewAnnouncement({ ...member, committeeId: "finance" }, announcement), false);
  assert.equal(canViewAnnouncement({ ...member, committeeId: null }, announcement), false);
  assert.equal(canViewAnnouncement({ ...member, organizationId: "other" }, announcement), false);
  assert.equal(canViewAnnouncement({ ...leader, committeeId: "finance" }, announcement), true);
  assert.equal(canViewAnnouncement({ ...leader, organizationId: "other" }, announcement), false);
  assert.equal(canViewAnnouncement({ ...leader, role: "Admin" }, announcement), true);
});

test("existing audience rules remain supported and malformed committee posts stay private", () => {
  assert.equal(canViewAnnouncement(member, { ...announcement, targetAudience: "All Members" }), true);
  assert.equal(canViewAnnouncement(member, { ...announcement, targetAudience: "Leaders Only" }), false);
  assert.equal(canViewAnnouncement(member, { ...announcement, targetAudience: "Officers Only" }), false);
  assert.equal(canViewAnnouncement(member, { ...announcement, committeeId: undefined }), false);
});

test("only authorized leaders can post and committee selection is required", () => {
  assert.throws(() => assertCanPostAnnouncement(member, "org", "All Members"));
  assert.throws(() => assertCanPostAnnouncement(leader, "other", "All Members"));
  assert.throws(() => assertCanPostAnnouncement(leader, "org", "Committee"));
  assert.throws(() => assertCanPostAnnouncement(leader, "org", "Invalid"));
  assert.doesNotThrow(() => assertCanPostAnnouncement(leader, "org", "Committee", "arts"));
});
