export type DependencyTask = {
  id: string;
  title?: string;
  status?: string;
  dependsOnTaskIds?: string[];
  archivedAt?: string | null;
};

export function isTaskArchived(task: { archivedAt?: unknown; status?: string }): boolean {
  return Boolean(task.archivedAt) || task.status?.trim().toLowerCase() === "archived";
}

export function isDependencyComplete(status?: string): boolean {
  return ["completed", "done"].includes((status || "").trim().toLowerCase());
}

export function requiresFinishedDependencies(status?: string): boolean {
  // Custom workflow stages count as work unless they explicitly represent waiting.
  return !["", "to do", "pending", "backlog", "backlogs", "blocked", "on hold", "cancelled", "canceled"].includes((status || "").trim().toLowerCase());
}

export function getBlockingDependencies(task: DependencyTask, tasks: DependencyTask[]) {
  const byId = new Map(tasks.map((item) => [item.id, item]));
  return [...new Set(task.dependsOnTaskIds || [])].flatMap((id) => {
    const prerequisite = byId.get(id);
    return prerequisite && isDependencyComplete(prerequisite.status) ? [] : [{
      id, title: prerequisite?.title || "Unavailable prerequisite", status: prerequisite?.status || "Missing task"
    }];
  });
}

export function withTaskDependencyState<T extends DependencyTask>(tasks: T[], allTasks: DependencyTask[] = tasks) {
  return tasks.map((task) => {
    const blockers = getBlockingDependencies(task, allTasks);
    return { ...task, blockedBy: blockers.length, blockedByTaskTitles: blockers.map((item) => item.title) };
  });
}

export function isBlockedTaskStatus(task: { blockedBy?: number }, status: string): boolean {
  return Boolean(task.blockedBy && requiresFinishedDependencies(status));
}

export function resolveSuggestedTaskDependencies(taskIds: string[], indexes: unknown, taskIndex: number): string[] {
  if (!Array.isArray(indexes)) return [];
  return [...new Set(indexes.filter((index) => Number.isInteger(index) && index >= 0 && index < taskIndex && index < taskIds.length))].map((index) => taskIds[index]);
}

// Validate the whole event, including changes that reopen or delete prerequisites.
// Originals also prevent completing a whole dependency chain in a single save.
export function getTaskDependencyError(tasks: DependencyTask[], originals: DependencyTask[] = []): string | null {
  const byId = new Map<string, DependencyTask>();
  for (const task of tasks) {
    if (!task || typeof task.id !== "string" || !task.id.trim() || byId.has(task.id)) return "Each task must have a unique task ID.";
    if (task.status !== undefined && typeof task.status !== "string") return `${task.title || "Task"}: Choose a valid status.`;
    byId.set(task.id, task);
  }
  for (const task of tasks) {
    const ids = task.dependsOnTaskIds;
    if (ids !== undefined && (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !id.trim()) || new Set(ids).size !== ids.length)) {
      return `${task.title || "Task"}: Choose valid, unique prerequisites.`;
    }
    for (const id of ids || []) {
      if (id === task.id) return `${task.title || "Task"} cannot depend on itself.`;
      if (!byId.has(id)) return `${task.title || "Task"}: A prerequisite is missing. Remove its dependency before deleting that task.`;
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function hasCycle(id: string): boolean {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    if ((byId.get(id)?.dependsOnTaskIds || []).some(hasCycle)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  }
  if (tasks.some((task) => hasCycle(task.id))) return "Dependencies cannot form a circular chain. Remove the link that loops back to an earlier task.";
  const oldById = new Map(originals.map((task) => [task.id, task]));
  for (const task of tasks) {
    if (isTaskArchived(task)) continue;
    for (const id of task.dependsOnTaskIds || []) {
      const prerequisite = byId.get(id)!;
      if (isTaskArchived(prerequisite) && !isDependencyComplete(prerequisite.status)) return `${task.title || "Task"}: Restore the archived prerequisite "${prerequisite.title || "Task"}" or remove its dependency first.`;
    }
    if (!requiresFinishedDependencies(task.status)) continue;
    const blockers = getBlockingDependencies(task, tasks);
    const old = oldById.get(task.id);
    if (!old || old.status !== task.status) {
      for (const id of task.dependsOnTaskIds || []) {
        const prerequisite = oldById.get(id);
        if (prerequisite && !isDependencyComplete(prerequisite.status) && !blockers.some((item) => item.id === id)) {
          blockers.push({ id, title: prerequisite.title || "Prerequisite", status: prerequisite.status || "To Do" });
        }
      }
    }
    if (blockers.length) return `${task.title || "Task"} is blocked. Complete ${blockers.map((item) => `“${item.title}”`).join(", ")} first. To reopen a prerequisite, return its dependent tasks to To Do first.`;
  }
  return null;
}
