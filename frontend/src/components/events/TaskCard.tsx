"use client";

import { Calendar, GripVertical, Lock, Star, UserCheck, Zap } from "lucide-react";
import type { Task } from "./types";
import { OverdueBadge } from "./overdue";
import { PRIORITY_CONFIG as priorityConfig } from "./priorityUtils";
import { useAuthStore } from "@/store/authStore";
import { canUpdateTaskStatus } from "@/utils/taskAssignment";
import { TaskAssignee } from "./TaskAssignee";

type TaskCardProps = {
  task: Task;
  isDragging?: boolean;
  onDragStart?: (taskId: string) => void;
  onDragEnd?: () => void;
  onReassign?: (task: Task) => void;
  onSelectTask?: (task: Task) => void;
};

export function TaskCard({
  task,
  isDragging = false,
  onDragStart,
  onDragEnd,
  onReassign,
  onSelectTask
}: TaskCardProps) {
  const uid = useAuthStore((state) => state.firebaseUser?.uid ?? state.profile?.uid);
  const fullName = useAuthStore((state) => state.profile?.fullName || state.firebaseUser?.displayName || "");
  const role = useAuthStore((state) => state.profile?.role);
  const canDrag = Boolean(onDragStart) && canUpdateTaskStatus(task, uid, fullName, role);
  const pCfg = priorityConfig[task.priority || "Medium"];

  return (
    <div
      draggable={canDrag}
      onDragStart={(event) => {
        if (canDrag) {
          event.stopPropagation();
          event.dataTransfer.setData("text/plain", task.id);
          onDragStart?.(task.id);
        } else {
          event.preventDefault();
        }
      }}
      onDragEnd={() => {
        onDragEnd?.();
      }}
      onClick={() => onSelectTask?.(task)}
      className={`group relative flex min-w-0 flex-col gap-2 rounded-xl border bg-white p-3 shadow-xs transition-all ${
        canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${
        isDragging
          ? "opacity-30 scale-95 border-2 border-dashed border-blue-400 shadow-none"
          : "border-slate-200 hover:border-blue-300 hover:shadow-md"
      }`}
    >
      {/* Top Header Row with Badges and Drag Handle */}
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {task.isLeaderOnly && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              <Lock size={10} /> Leader Only
            </span>
          )}
          {task.isAiGenerated && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
              <Zap size={10} /> AI Generated
            </span>
          )}
          {task.committee && (
            <span title={task.committee} className="inline-flex min-w-0 max-w-full items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              <span className="truncate">{task.committee}</span>
            </span>
          )}
          {task.performanceReview?.rating ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200" title={`Rated ${task.performanceReview.rating}/5 stars by Leader`}>
              <Star size={10} className="fill-amber-400 text-amber-500" />
              {task.performanceReview.rating}/5 Rating
            </span>
          ) : null}
          <OverdueBadge task={task} />
        </div>

        {canDrag && (
          <GripVertical size={13} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
        )}
      </div>

      {/* Title & Description */}
      <div className="min-w-0">
        <p title={task.title} className="break-words [overflow-wrap:anywhere] text-[13px] font-semibold leading-5 text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2">
          {task.title}
        </p>
        {task.description && (
          <p className="mt-1 break-words [overflow-wrap:anywhere] text-[11px] leading-4 text-slate-500 line-clamp-2">{task.description}</p>
        )}
      </div>

      {/* Read-only priority and deadline */}
      <div className="flex min-w-0 flex-wrap items-start gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2">
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${pCfg.classes}`}>
          <span className="size-1.5 shrink-0 rounded-full bg-current" />{pCfg.label}
        </span>
        <div className="flex min-w-0 flex-1 basis-28 items-start gap-1.5 text-[11px] leading-4 text-slate-500">
          <Calendar size={12} className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">{task.dueDate || task.deadline || "No deadline"}</span>
        </div>
      </div>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0 flex-1"><TaskAssignee task={task} compactMobile /></div>
        {onReassign ? <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onReassign(task); }}
          title="Reassign task delegation"
          aria-label={`Reassign ${task.title}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
        ><UserCheck size={13} /></button> : null}
      </div>
    </div>
  );
}
