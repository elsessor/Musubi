import assert from "node:assert/strict";
import test from "node:test";
import { getAverageMatchScore, getMemberDashboardTasks } from "../../frontend/src/utils/memberDashboard.js";

test("average uses actual scores including zero and excludes missing or invalid values", () => {
  assert.equal(getAverageMatchScore([{ matchPercentage: 50 }, { matchPercentage: 80 }]), 65);
  assert.equal(getAverageMatchScore([{ matchPercentage: 0 }, { matchPercentage: 100 }, {}, { matchPercentage: NaN }, { matchPercentage: 101 }]), 50);
  assert.equal(getAverageMatchScore([{}]), null);
  assert.equal(getAverageMatchScore([]), null);
});

test("live event updates change the member average without including other assignees", () => {
  const events: any = [{ id: "event", title: "Event", tasks: [
    { id: "own", assignedMemberUID: "me", matchPercentage: 60 },
    { id: "other", assignedMemberUID: "other", assignedMemberName: "Member", matchPercentage: 100 },
    { id: "archived", assignedMemberUID: "me", archivedAt: "today", matchPercentage: 100 }
  ] }];
  const read = () => getMemberDashboardTasks(events, "me", "Member");
  assert.equal(getAverageMatchScore(read()), 60);
  events[0].tasks[0].matchPercentage = 80;
  assert.equal(getAverageMatchScore(read()), 80);
  events[0].tasks[0].assignedMemberUID = "other";
  assert.deepEqual(read(), []);
  assert.equal(getAverageMatchScore(read()), null);
});

test("legacy assignment requires an exact name match and archived events are excluded", () => {
  const events: any = [{ title: "Event", tasks: [
    { assignedMemberName: " Member ", matchPercentage: 70 },
    { assignedMemberName: "Member Two", matchPercentage: 100 }
  ] }, { title: "Archived", archivedAt: "today", tasks: [{ assignedMemberUID: "me", matchPercentage: 100 }] }];
  assert.equal(getAverageMatchScore(getMemberDashboardTasks(events, "me", "Member")), 70);
});
