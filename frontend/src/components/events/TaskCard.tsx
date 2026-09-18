"use client";

import { AlertTriangle, Calendar, Lock, UserCheck, Zap } from "lucide-react";
import type { Task, TaskPriority } from "./types";

const priorityConfig: Record<TaskPriority, { label: string; classes: string }> = {
  Low:      { label: "Low",      classes: "bg-slate-100 text-slate-600 ring-slate-200" },
  Medium:   { label: "Medium",   classes: "bg-blue-50 text-blue-600 ring-blue-200" },
  High:     { label: "High",     classes: "bg-amber-50 text-amber-700 ring-amber-200" },
  Critical: { label: "Critical", classes: "bg-rose-50 text-rose-600 ring-rose-200" }
};

type TaskCardProps = {
  task: Task;
  onDragStart?: (taskId: string) => void;
  onReassign?: (task: Task) => void;
};

export function TaskCard({ task, onDragStart, onReassign }: TaskCardProps) {
  const pCfg = priorityConfig[task.priority];

  return (
    <div
      draggable
      onDragStart={() => onDragStart?.(task.id)}
      className="group flex cursor-grab flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:shadow-md active:cursor-grabbing"
    >
      {/* Blocker alert or Leader / AI Badges */}
      {task.blockedBy && task.blockedBy > 0 ? (
        <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
          <AlertTriangle size={12} className="shrink-0 text-amber-500" />
          Blocked by {task.blockedBy} {task.blockedBy === 1 ? "task" : "tasks"}
        </div>
      ) : null}

      {/* Badges row */}
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
      </div>

      {/* Title & Description */}
      <div>
        <p className="text-[13px] font-semibold leading-snug text-slate-800">{task.title}</p>
        {task.description && (
          <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2 font-medium">{task.description}</p>
        )}
      </div>

      {/* Priority + meta row */}
      <div className="flex items-center gap-2 pt-1">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${pCfg.classes}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {pCfg.label}
        </span>

        <div className="ml-auto flex items-center gap-2">
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

          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            <Calendar size={11} />
            {task.dueDate}
          </span>
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${task.assignee.color}`}
            title={task.assignee.name || task.assignee.initials}
          >
            {task.assignee.initials}
          </span>
        </div>
      </div>
    </div>
  );
}
