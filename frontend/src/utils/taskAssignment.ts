import type { Task } from "@/components/events/types";

type TaskAssignment = Pick<Task, "assignedMemberUID" | "assignedMemberName" | "assignee"> & {
  assigneeName?: string;
  archivedAt?: string | null;
  status?: string;
};

export function getTaskAssigneeName(task: TaskAssignment): string {
  return task.assignedMemberName?.trim() || task.assignee?.name?.trim() || task.assigneeName?.trim() || "";
}

export function isTaskAssignedToUser(task: TaskAssignment, uid: string | null | undefined, fullName: string): boolean {
  if (!uid) return false;
  if (task.assignedMemberUID) return task.assignedMemberUID === uid;
  const userName = fullName.trim().toLowerCase();
  return Boolean(userName && getTaskAssigneeName(task).toLowerCase() === userName);
}

export function canUseTaskPriorityControl(task: TaskAssignment, uid: string | null | undefined, fullName: string, permitted: boolean, role?: string | null): boolean {
  if (!uid || !permitted || task.archivedAt || task.status?.toLowerCase() === "archived") return false;
  if (role === "Student Leader" || role === "Admin") return true;
  return isTaskAssignedToUser(task, uid, fullName);
}

export function canUpdateTaskStatus(task: TaskAssignment, uid: string | null | undefined, fullName: string, role: string | null | undefined): boolean {
  if (!uid || task.archivedAt || task.status?.toLowerCase() === "archived") return false;
  if (role === "Student Leader" || role === "Admin") return true;
  if (["cancelled", "canceled"].includes((task.status || "").trim().toLowerCase())) return false;
  return role === "Organization Member" && isTaskAssignedToUser(task, uid, fullName);
}
