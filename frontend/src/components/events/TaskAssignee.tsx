"use client";

import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";
import { getTaskAssigneeName, isTaskAssignedToUser } from "@/utils/taskAssignment";
import type { Task } from "./types";

export function TaskAssignee({ task, className, showAvatar = true, compact = false }: {
  task: Task;
  className?: string;
  showAvatar?: boolean;
  compact?: boolean;
}) {
  const uid = useAuthStore((state) => state.firebaseUser?.uid ?? state.profile?.uid);
  const fullName = useAuthStore((state) => state.profile?.fullName || state.firebaseUser?.displayName || "");
  const isYou = isTaskAssignedToUser(task, uid, fullName);
  const name = getTaskAssigneeName(task) || (isYou && fullName) || (task.assignedMemberUID ? "Assigned member" : "Unassigned");
  const initials = task.assignee?.initials && !["ME", "UA"].includes(task.assignee.initials)
    ? task.assignee.initials
    : name === "Unassigned" ? "UA" : name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <span
      title={isYou ? `${name} — Assigned to you` : name}
      className={cn("inline-flex min-w-0 max-w-full items-center gap-1.5", isYou && "rounded-full bg-blue-50 py-1 pr-2 ring-1 ring-inset ring-blue-200", isYou && (showAvatar ? "pl-1" : "pl-2"), className)}
    >
      {showAvatar ? <span aria-hidden="true" className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white", isYou ? "bg-blue-600" : task.assignee?.color || "bg-blue-600")}>{initials}</span> : null}
      <span className={cn("min-w-0 truncate", compact ? "text-[10px]" : "text-xs", isYou ? "font-bold text-blue-700" : "font-medium text-slate-600")}>{name}</span>
      {isYou ? <span className="shrink-0 rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold leading-tight text-white">You</span> : null}
    </span>
  );
}
