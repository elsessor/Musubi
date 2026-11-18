import assert from "node:assert/strict";
import test from "node:test";
import { matchesEventSearch } from "../../frontend/src/utils/eventSearch.js";
import { matchesEventSchedule, sortEvents } from "../../frontend/src/utils/workspaceSort.js";
import type { Event } from "../../frontend/src/components/events/types.js";

const events: Event[] = [
  { id: "festival", title: "Spring Festival", description: "Student arts exhibition", committee: "Events", location: "Main Hall", status: "Planning", startDate: "2027-03-01", endDate: "2027-03-02", tasks: [], progress: 0, memberCount: 0 },
  { id: "budget", title: "Budget Workshop", description: "Review funding proposals", committee: "Finance", status: "Active", startDate: "2026-11-01", endDate: "2026-11-02", tasks: [], progress: 0, memberCount: 0 }
];

test("event search finds names, descriptions, committees and locations regardless of case or surrounding spaces", () => {
  for (const query of [" SPRING ", "Arts exhibition", "events", "main HALL"]) {
    assert.deepEqual(events.filter((event) => matchesEventSearch(event, query)).map((event) => event.id), ["festival"]);
  }
  assert.deepEqual(events.filter((event) => matchesEventSearch(event, "finance")).map((event) => event.id), ["budget"]);
});

test("clearing event search restores the available records and missing optional text is safe", () => {
  for (const query of ["", "   "]) assert.equal(events.filter((event) => matchesEventSearch(event, query)).length, 2);
  assert.equal(matchesEventSearch({}, "festival"), false);
  assert.equal(matchesEventSearch({}, ""), true);
  assert.equal(events.filter((event) => matchesEventSearch(event, "unrelated phrase")).length, 0);
});

test("event search composes with schedule and workflow filters while preserving sort order and source records", () => {
  const source = JSON.stringify(events);
  const now = new Date("2026-11-18T04:00:00Z");
  const matching = events.filter((event) => matchesEventSearch(event, "student") && matchesEventSchedule(event, "upcoming", now) && event.status === "Planning");
  assert.deepEqual(sortEvents(matching, "latest", now).map((event) => event.id), ["festival"]);
  assert.equal(events.filter((event) => matchesEventSearch(event, "finance") && matchesEventSchedule(event, "upcoming", now)).length, 0);
  assert.equal(JSON.stringify(events), source);
});
