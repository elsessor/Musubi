"use client";

import { AlertTriangle, Calendar } from "lucide-react";
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
};

export function TaskCard({ task, onDragStart }: TaskCardProps) {
  const pCfg = priorityConfig[task.priority];

  return (
    <div
      draggable
      onDragStart={() => onDragStart?.(task.id)}
      className="group flex cursor-grab flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:shadow-md active:cursor-grabbing"
    >
      {/* Blocker alert */}
      {task.blockedBy && task.blockedBy > 0 ? (
        <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
          <AlertTriangle size={12} className="shrink-0 text-amber-500" />
          Blocked by {task.blockedBy} {task.blockedBy === 1 ? "task" : "tasks"}
        </div>
      ) : null}

      {/* Title */}
      <p className="text-[13px] font-medium leading-snug text-slate-800">{task.title}</p>

      {/* Priority + meta row */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${pCfg.classes}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {pCfg.label}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            <Calendar size={11} />
            {task.dueDate}
          </span>
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${task.assignee.color}`}
            title={task.assignee.initials}
          >
            {task.assignee.initials}
          </span>
        </div>
      </div>
    </div>
  );
}
