import assert from "node:assert/strict";
import test from "node:test";
import { validateEventStatusSettings } from "../src/utils/workflowSettings.js";

test("event status settings preserve descriptions through validation and reordering", () => {
  const customStatuses = [{ name: "Waiting for Approval", color: "purple", description: "  The leader is reviewing the event proposal.  " }];
  const saved = validateEventStatusSettings({ customStatuses, statusOrder: ["Active", "Waiting for Approval"] });
  assert.equal(saved.customStatuses[0].description, "The leader is reviewing the event proposal.");
  const reordered = validateEventStatusSettings({ ...saved, statusOrder: [...saved.statusOrder].reverse() });
  assert.deepEqual(reordered.customStatuses, saved.customStatuses);
});

test("legacy statuses remain valid while invalid descriptions are rejected", () => {
  const settings = (description?: unknown) => ({ customStatuses: [{ name: "On Hold", color: "amber", ...(description !== undefined ? { description } : {}) }], statusOrder: ["On Hold"] });
  assert.deepEqual(validateEventStatusSettings(settings()).customStatuses, [{ name: "On Hold", color: "amber" }]);
  assert.deepEqual(validateEventStatusSettings(settings("   ")).customStatuses, [{ name: "On Hold", color: "amber" }]);
  for (const invalid of [null, true, 3, {}, "x".repeat(2001)]) assert.throws(() => validateEventStatusSettings(settings(invalid)), /descriptions/);
});
