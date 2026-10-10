import type { TaskActor, TaskRecord } from "./taskPermissions.js";
import { assertEventAccess, isTaskLeader } from "./taskPermissions.js";

export function ownsProfileTask(user: Pick<TaskActor, "uid" | "fullName">, task: TaskRecord): boolean {
  if (task.assignedMemberUID) return task.assignedMemberUID === user.uid;
  const name = String(task.assignedMemberName || task.assignee?.name || task.assigneeName || "").trim().toLowerCase();
  return Boolean(user.uid && name && name === user.fullName.trim().toLowerCase());
}

export function canViewMemberPerformance(user: TaskActor, memberUID: string): boolean {
  return isTaskLeader(user) || Boolean(user.uid && user.uid === memberUID);
}

export function taskForViewer(user: TaskActor, task: TaskRecord): TaskRecord {
  if (isTaskLeader(user) || ownsProfileTask(user, task)) return { ...task };
  const { performanceReview: _review, ...visible } = task;
  return visible;
}

function validDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null;
  const normalized = value.replace(/\s+at\s+/i, " ");
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(normalized) ? `${normalized}T00:00:00` : normalized);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function memberForViewer(user: TaskActor, id: string, data: TaskRecord, events: TaskRecord[]) {
  assertEventAccess(user, data.organizationId);
  const name = typeof data.fullName === "string" ? data.fullName : "Unnamed member";
  const tasks: TaskRecord[] = events.flatMap((event) => (Array.isArray(event.tasks) ? event.tasks : [])
    .filter((task: TaskRecord) => ownsProfileTask({ uid: id, fullName: name }, task))
    .map((task: TaskRecord) => ({ ...task, eventId: event.id, eventTitle: event.title, customStatuses: event.customStatuses })));
  const unfinished = tasks.filter((task: TaskRecord) => !["completed", "done", "cancelled", "canceled"].includes(String(task.status).trim().toLowerCase()));
  const rawAvail = typeof data.availability === "string" && data.availability.trim()
    ? data.availability.trim()
    : typeof data.status === "string" && data.status.trim()
    ? data.status.trim()
    : "";
  const validAvail = ["Available", "Busy", "On Leave"].find((v) => v.toLowerCase() === rawAvail.toLowerCase());
  const resolvedAvailability = validAvail || (unfinished.length >= 4 ? "Busy" : "Available");
  const assignedTasks = tasks.map((task: TaskRecord) => ({
    id: task.id, title: task.title || task.description || "Untitled Subtask", eventTitle: task.eventTitle, eventId: task.eventId,
    dueDate: task.dueDate || "", deadline: task.deadline,
    status: task.status, customStatuses: task.customStatuses || []
  }));
  const publicProfile = {
    id, name,
    role: typeof data.role === "string" ? data.role : "Organization Member",
    position: typeof data.position === "string" ? data.position : "Organization Member",
    skills: Array.isArray(data.skills) ? data.skills.filter((skill: unknown): skill is string => typeof skill === "string") : [],
    committeeId: typeof data.committeeId === "string" ? data.committeeId : null,
    committeeName: typeof data.committeeName === "string" ? data.committeeName : null,
    profilePicture: typeof data.profilePicture === "string" ? data.profilePicture : null,
    assignedTasks,
    availability: resolvedAvailability
  };
  if (!canViewMemberPerformance(user, id)) return publicProfile;
  let dated = 0;
  let onTime = 0;
  for (const task of tasks) {
    if (!["completed", "done"].includes(String(task.status).trim().toLowerCase())) continue;
    const completed = validDate(task.completedAt);
    const deadlineValue = validDate(task.dueDate) ? task.dueDate : task.deadline;
    const deadline = validDate(deadlineValue);
    if (!completed || !deadline) continue;
    if (!/[T]|\d{1,2}:\d{2}/.test(deadlineValue)) deadline.setHours(23, 59, 59, 999);
    dated += 1;
    if (completed <= deadline) onTime += 1;
  }
  return {
    ...publicProfile,
    workload: Math.min(100, Math.round(unfinished.length / 5 * 100)),
    reliability: dated ? `${Math.round(onTime / dated * 100)}%` : "—",
    assignedTasks: tasks.map((task: TaskRecord, index: number) => ({
      ...assignedTasks[index], completedAt: task.completedAt || null, matchPercentage: task.matchPercentage,
      performanceReview: task.performanceReview || null
    }))
  };
}
