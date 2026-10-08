"use client";

import { AlertTriangle, Calendar, ChevronDown, GripVertical, Lock, Star, UserCheck, Zap } from "lucide-react";
import { useState } from "react";
import type { Task, TaskPriority } from "./types";
import { OverdueBadge } from "./overdue";
import { ALL_PRIORITIES, PRIORITY_CONFIG as priorityConfig } from "./priorityUtils";
import { useAuthStore } from "@/store/authStore";
import { canUpdateTaskStatus, canUseTaskPriorityControl } from "@/utils/taskAssignment";
import { TaskAssignee } from "./TaskAssignee";

type TaskCardProps = {
  task: Task;
  isDragging?: boolean;
  onDragStart?: (taskId: string) => void;
  onDragEnd?: () => void;
  onReassign?: (task: Task) => void;
  onSelectTask?: (task: Task) => void;
  onUpdatePriority?: (taskId: string, newPriority: TaskPriority) => void;
};

export function TaskCard({
  task,
  isDragging = false,
  onDragStart,
  onDragEnd,
  onReassign,
  onSelectTask,
  onUpdatePriority
}: TaskCardProps) {
  const uid = useAuthStore((state) => state.firebaseUser?.uid ?? state.profile?.uid);
  const fullName = useAuthStore((state) => state.profile?.fullName || state.firebaseUser?.displayName || "");
  function canEditPriority(task: Task) { return canUseTaskPriorityControl(task, uid, fullName, Boolean(onUpdatePriority), role); }
  const role = useAuthStore((state) => state.profile?.role);
  const canDrag = Boolean(onDragStart) && canUpdateTaskStatus(task, uid, fullName, role);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
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
      className={`group relative flex min-w-0 flex-col gap-3 rounded-xl border bg-white p-4 shadow-xs transition-all ${
        canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${
        isDragging
          ? "opacity-30 scale-95 border-2 border-dashed border-blue-400 shadow-none"
          : "border-slate-200 hover:border-blue-300 hover:shadow-md"
      }`}
    >
      {/* Top Header Row with Badges and Drag Handle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
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
            <span className="inline-flex items-center rounded-full max-w-full truncate bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {task.committee}
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
      <div>
        <p className="break-words text-[13px] font-semibold leading-5 text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2">
          {task.title}
        </p>
        {task.description && (
          <p className="mt-1 break-words text-xs leading-5 text-slate-500 line-clamp-2">{task.description}</p>
        )}
      </div>

      {/* Priority + meta row */}
      <div className="relative flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        {/* Interactive Priority Badge */}
        <div className="relative">
          {canEditPriority(task) ? <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={showPriorityMenu}
            onClick={(e) => {
              e.stopPropagation();
              if (canEditPriority(task)) {
                setShowPriorityMenu(!showPriorityMenu);
              }
            }}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset transition ${pCfg.classes}`}
            title="Change priority"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {pCfg.label}
            <ChevronDown size={10} className="opacity-60" />
          </button> : <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${pCfg.classes}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />{pCfg.label}
          </span>}

          {showPriorityMenu && canEditPriority(task) && onUpdatePriority && (
            <div
              role="menu"
              aria-label="Task priority"
              className="absolute left-0 top-full z-30 mt-1 w-28 rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5 animate-in fade-in duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              {ALL_PRIORITIES.map((pr) => {
                const cfg = priorityConfig[pr];
                return (
                  <button
                    key={pr}
                    type="button"
                    role="menuitemradio"
                    aria-checked={task.priority === pr}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canEditPriority(task)) onUpdatePriority?.(task.id, pr);
                      setShowPriorityMenu(false);
                    }}
                    className={`flex w-full items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium transition hover:bg-slate-50 ${
                      task.priority === pr ? `${cfg.classes} font-bold` : "text-slate-700"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
          {onReassign && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReassign(task);
              }}
              title="Reassign task delegation"
              className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
            >
              <UserCheck size={12} />
            </button>
          )}

          <span className="flex min-w-0 items-start gap-1.5 text-[11px] leading-4 text-slate-500">
            <Calendar size={12} className="mt-0.5 shrink-0" />
            <span className="break-words">{task.dueDate || "No deadline"}</span>
          </span>
        </div>
      </div>
      <TaskAssignee task={task} className="self-start" />
    </div>
  );
}
