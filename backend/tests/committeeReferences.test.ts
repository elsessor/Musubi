import assert from "node:assert/strict";
import test from "node:test";
import { renameCommitteeReferences } from "../src/utils/committeeReferences.js";

test("renaming a committee preserves task ownership, status, attachments and unrelated labels", () => {
  const assigned = { id: "task", committee: " Events Committee ", assigneeId: "member", status: "Completed", attachments: [{ id: "file" }] };
  const other = { id: "other", committee: "Finance", status: "To Do" };
  const event = { committee: "events committee", tasks: [assigned, other], title: "Event" };
  const update = renameCommitteeReferences(event, "Events Committee", "Programs");
  assert.deepEqual(update, { committee: "Programs", tasks: [{ ...assigned, committee: "Programs" }, other] });
  assert.equal(event.committee, "events committee");
  assert.equal(assigned.committee, " Events Committee ");
  assert.equal((update.tasks as unknown[])[1], other);
});

test("unrelated events and unchanged or missing names do not produce writes", () => {
  assert.deepEqual(renameCommitteeReferences({ committee: "Finance", tasks: [{ committee: "Finance" }] }, "Events", "Programs"), {});
  assert.deepEqual(renameCommitteeReferences({ committee: "Events" }, "Events", "Events"), {});
  assert.deepEqual(renameCommitteeReferences({ committee: "" }, "", "Events"), {});
});

test("task committee labels can be renamed independently of the event committee", () => {
  assert.deepEqual(renameCommitteeReferences({ committee: "General", tasks: [null, { committee: "Events", title: "Task" }] }, "Events", "Programs"), {
    tasks: [null, { committee: "Programs", title: "Task" }]
  });
});
