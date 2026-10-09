"use client";

import { useAuthStore } from "@/store/authStore";
import { createContext, useContext } from "react";
import { MemberAvatar } from "@/components/dashboard/MemberAvatar";
import type { OrganizationMember } from "@/services/auth.service";
import { cn } from "@/utils/cn";
import { getTaskAssigneeName, isTaskAssignedToUser } from "@/utils/taskAssignment";
import type { Task } from "./types";

export const TaskAssigneeMembersContext = createContext<OrganizationMember[]>([]);

export function TaskAssignee({ task, className, showAvatar = true, compact = false, compactMobile = false }: {
  task: Task;
  className?: string;
  showAvatar?: boolean;
  compact?: boolean;
  compactMobile?: boolean;
}) {
  const uid = useAuthStore((state) => state.firebaseUser?.uid ?? state.profile?.uid);
  const fullName = useAuthStore((state) => state.profile?.fullName || state.firebaseUser?.displayName || "");
  const isYou = isTaskAssignedToUser(task, uid, fullName);
  const members = useContext(TaskAssigneeMembersContext);
  const ownPicture = useAuthStore((state) => state.profile?.profilePicture || state.firebaseUser?.photoURL);
  const name = getTaskAssigneeName(task) || (isYou && fullName) || (task.assignedMemberUID ? "Assigned member" : "Unassigned");
  const matches = task.assignedMemberUID
    ? members.filter((member) => member.id === task.assignedMemberUID)
    : members.filter((member) => member.name.trim().toLowerCase() === name.trim().toLowerCase());
  const member = matches.length === 1 ? matches[0] : undefined;

  return (
    <span
      title={isYou ? `${name} — Assigned to you` : name}
      className={cn("inline-flex min-w-0 max-w-full items-center gap-1.5", isYou && "rounded-full bg-blue-50 py-1 pr-2 ring-1 ring-inset ring-blue-200", isYou && (showAvatar ? "pl-1" : "pl-2"), compactMobile && "gap-1 sm:gap-1.5", compactMobile && isYou && "py-0.5 pr-1 sm:py-1 sm:pr-2", className)}
    >
      {showAvatar ? <MemberAvatar member={name === "Unassigned" ? undefined : { name, profilePicture: member?.profilePicture || (isYou ? ownPicture : null) }} className={compactMobile ? "size-5 shrink-0 sm:size-6" : "size-6"} fallbackClassName={isYou ? "bg-blue-600" : task.assignee?.color || "bg-blue-600"} /> : null}
      <span className={cn("min-w-0 truncate", compact ? "text-[10px]" : compactMobile ? "text-[11px] sm:text-xs" : "text-xs", isYou ? "font-bold text-blue-700" : "font-medium text-slate-600")}>{name}</span>
      {isYou ? <span className="shrink-0 rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold leading-tight text-white">You</span> : null}
    </span>
  );
}
