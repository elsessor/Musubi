import assert from "node:assert/strict";
import test from "node:test";
import { isValidBirthdate } from "../src/utils/birthdate.js";
import { getProfilePositionOptions, LEADER_POSITION_OPTIONS, MEMBER_POSITION_OPTIONS } from "../../frontend/src/utils/profileOptions.js";

test("profile birthdates accept students younger than 17 without accepting invalid or future dates", () => {
  const today = new Date("2026-11-11T12:00:00Z");
  for (const date of ["", "2010-11-11", "2012-06-15", "2000-02-29", "2024-02-29", "2026-11-11"]) {
    assert.equal(isValidBirthdate(date, today), true, date);
  }
  for (const date of ["2026-11-12", "2030-01-01", "2025-02-29", "2010-02-30", "2010-13-01", "2010-00-10", "not a date", "11/11/2010", "2010-1-1", "0000-01-01"]) {
    assert.equal(isValidBirthdate(date, today), false, date);
  }
});

test("profile position menus follow the account role and preserve an existing custom title", () => {
  assert.deepEqual(getProfilePositionOptions("Student Leader"), LEADER_POSITION_OPTIONS);
  assert.deepEqual(getProfilePositionOptions("Organization Member"), MEMBER_POSITION_OPTIONS);
  assert.deepEqual(getProfilePositionOptions("Admin"), ["Administrator"]);
  assert.ok(getProfilePositionOptions("Organization Member", "Secretary").includes("Secretary"));
  assert.ok(getProfilePositionOptions("Student Leader", "Documentation Lead").includes("Documentation Lead"));
  assert.equal(getProfilePositionOptions("Student Leader", "Secretary").filter((option) => option === "Secretary").length, 1);
  assert.ok(!getProfilePositionOptions("Organization Member").includes("President"));
});
