type TaskAssignment = {
  assignedMemberUID?: unknown;
  assignedMemberName?: unknown;
  assigneeName?: unknown;
  assignee?: { name?: unknown } | null;
};

const UNASSIGNED_NAMES = new Set(["unassigned", "not assigned", "none", "n/a", "tbd", "-", "—"]);

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Count distinct task assignees, using IDs and a name fallback for older tasks. */
export function getEventMemberCount(tasks: unknown): number {
  if (!Array.isArray(tasks)) return 0;
  const memberIds = new Set<string>();
  const identifiedNames = new Set<string>();
  const legacyNames = new Set<string>();

  for (const task of tasks) {
    if (!task || typeof task !== "object") continue;
    const assignment = task as TaskAssignment;
    const uid = text(assignment.assignedMemberUID);
    const name = (text(assignment.assignedMemberName) || text(assignment.assignee?.name) || text(assignment.assigneeName))
      .replace(/\s+/g, " ").toLowerCase();
    const hasName = name && !UNASSIGNED_NAMES.has(name);
    if (uid) {
      memberIds.add(uid);
      if (hasName) identifiedNames.add(name);
    } else if (hasName) {
      legacyNames.add(name);
    }
  }

  // Older name-only tasks for an identified member must not count them twice.
  return memberIds.size + [...legacyNames].filter((name) => !identifiedNames.has(name)).length;
}

