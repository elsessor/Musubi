type ClaimTask = {
  status?: string;
  priority?: string;
  isLeaderOnly?: boolean;
  archivedAt?: unknown;
  assignedMemberUID?: unknown;
  assignedMemberName?: unknown;
  assigneeName?: unknown;
  assignee?: { name?: unknown };
};
type ClaimActor = { uid?: string | null; role?: string | null; organizationId?: string | null };
type ClaimEvent = { orgId?: string | null; status?: string; archivedAt?: unknown };

const unassignedNames = new Set(["", "unassigned", "not assigned", "no assignee", "none", "n/a", "tbd", "-", "—"]);

// Keep this policy aligned with frontend/src/utils/taskClaims.ts (parity tests).
export function getTaskClaimError(task: ClaimTask, actor: ClaimActor, event: ClaimEvent): string | null {
  if (!actor.uid || actor.role !== "Organization Member") return "Only organization members can claim tasks.";
  if (!actor.organizationId || !event.orgId || actor.organizationId !== event.orgId) return "You can only claim tasks in your own organization.";
  if (event.archivedAt || ["archived", "completed", "done", "cancelled", "canceled"].includes((event.status || "").trim().toLowerCase())) return "This event is no longer accepting task claims.";
  if (task.archivedAt || (task.status || "").trim().toLowerCase() !== "to do") return "Only active To Do tasks can be claimed.";
  if (task.isLeaderOnly || (task.priority || "").trim().toLowerCase() === "critical") return "Leader-only and Critical tasks must be assigned by a leader.";
  if (String(task.assignedMemberUID ?? "").trim() || [task.assignedMemberName, task.assignee?.name, task.assigneeName]
    .some(name => !unassignedNames.has(typeof name === "string" ? name.trim().toLowerCase() : ""))) return "This task has already been assigned. Refresh to see its assignee.";
  // Claiming reserves To Do work; it never starts work or bypasses dependencies.
  return null;
}
