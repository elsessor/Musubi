import type { Task } from "@/components/events/types";

type TaskAssignment = Pick<Task, "assignedMemberUID" | "assignedMemberName" | "assignee"> & {
  assigneeName?: string;
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

export function canUseTaskPriorityControl(task: TaskAssignment, uid: string | null | undefined, fullName: string, permitted: boolean): boolean {
  return permitted && isTaskAssignedToUser(task, uid, fullName);
}

export function canUpdateTaskStatus(task: TaskAssignment, uid: string | null | undefined, fullName: string, role: string | null | undefined): boolean {
  if (!uid) return false;
  if (role === "Student Leader" || role === "Admin") return true;
  return role === "Organization Member" && isTaskAssignedToUser(task, uid, fullName);
}
