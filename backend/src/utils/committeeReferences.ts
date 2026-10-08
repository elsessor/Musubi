/** Rename matching committee labels while preserving event and task data. */
export function renameCommitteeReferences(data: Record<string, unknown>, previousName: string, name: string): Record<string, unknown> {
  if (!previousName.trim() || previousName === name) return {};
  const matches = (value: unknown) => typeof value === "string" && value.trim().toLowerCase() === previousName.trim().toLowerCase();
  const update: Record<string, unknown> = {};
  if (matches(data.committee)) update.committee = name;
  if (Array.isArray(data.tasks) && data.tasks.some((task) => task && typeof task === "object" && matches(task.committee))) {
    update.tasks = data.tasks.map((task) => task && typeof task === "object" && matches(task.committee) ? { ...task, committee: name } : task);
  }
  return update;
}
