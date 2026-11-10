type TaskRecord = Record<string, any>;
export function recordTaskSchedules(tasks: TaskRecord[], originals: TaskRecord[], actor: { uid: string; fullName: string }, now: string): TaskRecord[] {
  const byId = new Map(originals.map(task => [task.id, task]));
  return tasks.map(task => {
    const original = byId.get(task.id);
    const updated = { ...task };
    delete updated.deadlineChangeReason;
    updated.dueDateHistory = original?.dueDateHistory || [];
    if (!original) { delete updated.originalDueDate; return updated; }
    const previous = original.dueDate || original.deadline || "";
    const next = task.dueDate !== undefined ? task.dueDate : task.deadline ?? previous;
    updated.originalDueDate = original.originalDueDate ?? previous;
    if (previous !== next) {
      const reason = typeof task.deadlineChangeReason === "string" ? task.deadlineChangeReason.trim() : "";
      updated.dueDateHistory = [...updated.dueDateHistory, { from: previous, to: next, ...(reason ? { reason } : {}), changedAt: now, changedBy: actor.uid, changedByUID: actor.uid, changedByName: actor.fullName }];
      // A new schedule gets new reminder identities; preserve previous delivery history.
      updated.nudges = (original.nudges || []).filter((nudge: TaskRecord) => nudge.deadlineKey);
      if (original.deadline !== undefined) updated.deadline = next;
    } else updated.nudges = original.nudges || task.nudges || [];
    return updated;
  });
}
