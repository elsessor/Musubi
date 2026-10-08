import assert from "node:assert/strict";
import test from "node:test";
import { getDateRangeError, parseScheduleDate } from "../src/utils/dateRange.js";
import { getDateRangeError as frontendError } from "../../frontend/src/utils/dateRange.js";

test("events and tasks reject a target date before their start", () => {
  assert.match(getDateRangeError("2026-10-12", "2026-10-11")!, /target date must be on or after/);
  assert.match(getDateRangeError("Oct 12, 2026", "Oct 11, 2026", "Task")!, /deadline must be on or after/);
});

test("calendar time strings reject reversed times on the same day", () => {
  assert.ok(getDateRangeError("Oct 8, 2026 at 02:30 PM", "Oct 8, 2026 at 09:00 AM"));
  assert.equal(getDateRangeError("Oct 8, 2026 at 09:00 AM", "Oct 8, 2026 at 02:30 PM"), null);
  assert.equal(getDateRangeError("Oct 8, 2026 at 09:00 AM", "Oct 8, 2026 at 09:00 AM"), null);
});

test("midnight, noon, cross-year dates and explicit ISO timestamps compare correctly", () => {
  assert.equal(parseScheduleDate("Oct 8, 2026 at 12:00 AM")?.getHours(), 0);
  assert.equal(parseScheduleDate("Oct 8, 2026 at 12:00 PM")?.getHours(), 12);
  assert.equal(getDateRangeError("Dec 31, 2026 at 11:59 PM", "Jan 1, 2027 at 12:00 AM"), null);
  assert.ok(getDateRangeError("2026-10-08T10:00:00Z", "2026-10-08T09:00:00Z"));
});

test("invalid calendar days and malformed times receive clear errors", () => {
  assert.match(getDateRangeError("2026-02-30", "2026-03-01")!, /start date is invalid/);
  assert.match(getDateRangeError("Oct 8, 2026", "Oct 8, 2026 at 13:00 PM")!, /target date is invalid/);
  assert.match(getDateRangeError("invalid", "2026-10-08")!, /start date is invalid/);
});

test("date-only deadlines include the whole day and legacy unset dates remain supported", () => {
  assert.equal(getDateRangeError("Oct 8, 2026 at 02:30 PM", "Oct 8, 2026", "Task"), null);
  assert.equal(getDateRangeError(undefined, "2026-10-08", "Task"), null);
  assert.equal(getDateRangeError("TBD", "Not set"), null);
});

test("the form and server date validation agree", () => {
  for (const [start, end] of [["2026-10-12", "2026-10-11"], ["Oct 8, 2026 at 02:30 PM", "Oct 8, 2026 at 09:00 AM"], ["2026-02-30", "2026-03-01"], ["", ""], ["2026-10-08", "2026-10-08"]]) {
    assert.equal(frontendError(start, end, "Task"), getDateRangeError(start, end, "Task"));
  }
});
