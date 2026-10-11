import type { UserRole } from "../types/auth.types.js";
import { AppError } from "./AppError.js";
import { assertTaskDependencies } from "./taskDependencies.js";

export type TaskActor = { uid: string; fullName: string; role: UserRole; organizationId: string | null };
export type TaskRecord = Record<string, any>;

export function isTaskLeader(user: TaskActor): boolean {
  return user.role === "Student Leader" || user.role === "Admin";
}

export function assertEventAccess(user: TaskActor, orgId: unknown): void {
  if (user.role !== "Admin" && (!orgId || user.organizationId !== orgId)) {
    throw new AppError("You do not have access to this event.", 403);
  }
}

export function assertCanEditEvent(user: TaskActor, orgId: unknown): void {
  assertEventAccess(user, orgId);
  if (!isTaskLeader(user)) throw new AppError("Members can only update the status of their assigned subtasks and add attachments.", 403);
}

export function assertCanContributeTask(user: TaskActor, orgId: unknown, task: TaskRecord): void {
  assertEventAccess(user, orgId);
  if (task.archivedAt || String(task.status).toLowerCase() === "archived") throw new AppError("Restore this archived subtask before making changes.", 409);
  if (isTaskLeader(user)) return;
  const name = String(task.assignedMemberName || task.assignee?.name || task.assigneeName || "").trim().toLowerCase();
  const ownsTask = task.assignedMemberUID
    ? task.assignedMemberUID === user.uid
    : Boolean(name && user.fullName.trim().toLowerCase() === name);
  if (!ownsTask) throw new AppError("You can only update status or add attachments on subtasks assigned to you.", 403);
}

export function applyTaskStatusUpdate(task: TaskRecord, input: unknown, event: TaskRecord): TaskRecord {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new AppError("Choose a valid task status.", 400);
  const update = input as TaskRecord;
  if (Object.keys(update).some((key) => key !== "status")) throw new AppError("This action only allows updating the task status.", 403);
  const allowed = new Set([
    "To Do", "In Progress", "In Review", "Completed", "Done", "Pending", task.status,
    ...(Array.isArray(event.customStatuses) ? event.customStatuses.map((status: TaskRecord) => status.name) : []),
    ...(Array.isArray(event.statusOrder) ? event.statusOrder : [])
  ]);
  if (typeof update.status !== "string" || !update.status.trim() || !allowed.has(update.status)) throw new AppError("Choose a valid task status.", 400);
  const updated = { ...task, status: update.status };
  const originals = Array.isArray(event.tasks) ? event.tasks : [task];
  assertTaskDependencies(originals.map((item: TaskRecord) => item.id === task.id ? updated : item), originals);
  return updated;
}

// Only the attachment actions may change attachment records. Full event saves
// preserve them even when a client's task list is older than a recent upload.
export function preserveTaskAttachments(tasks: TaskRecord[], originals: TaskRecord[]): TaskRecord[] {
  const byId = new Map(originals.map((task) => [task.id, task]));
  return tasks.map((task) => ({ ...task, attachments: byId.get(task.id)?.attachments || [] }));
}

export function recordTaskArchives(tasks: TaskRecord[], originals: TaskRecord[], uid: string, now = new Date().toISOString()): TaskRecord[] {
  const byId = new Map(originals.map((task) => [task.id, task]));
  const retained = [...tasks, ...originals.filter((task) => task.archivedAt && !tasks.some((item) => item.id === task.id))];
  return retained.map((task) => {
    const original = byId.get(task.id);
    const archived = task.archivedAt !== undefined ? Boolean(task.archivedAt) : Boolean(original?.archivedAt);
    if (original?.archivedAt && archived) return { ...original };
    return { ...task, archivedAt: archived ? original?.archivedAt || now : null,
      archivedByUID: archived ? original?.archivedByUID || uid : null };
  });
}
