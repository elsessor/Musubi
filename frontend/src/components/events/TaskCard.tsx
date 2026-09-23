"use client";

import { AlertTriangle, Calendar, ChevronDown, Lock, UserCheck, Zap } from "lucide-react";
import { useState } from "react";
import type { Task, TaskPriority } from "./types";

const priorityConfig: Record<TaskPriority, { label: string; classes: string; dot: string }> = {
  Low:      { label: "Low",      classes: "bg-slate-100 text-slate-600 ring-slate-200 hover:bg-slate-200", dot: "bg-slate-400" },
  Medium:   { label: "Medium",   classes: "bg-blue-50 text-blue-600 ring-blue-200 hover:bg-blue-100", dot: "bg-blue-500" },
  High:     { label: "High",     classes: "bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100", dot: "bg-amber-500" },
  Critical: { label: "Critical", classes: "bg-rose-50 text-rose-600 ring-rose-200 hover:bg-rose-100", dot: "bg-rose-500" }
};

const ALL_PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Critical"];

type TaskCardProps = {
  task: Task;
  onDragStart?: (taskId: string) => void;
  onReassign?: (task: Task) => void;
  onSelectTask?: (task: Task) => void;
  onUpdatePriority?: (taskId: string, newPriority: TaskPriority) => void;
};

export function TaskCard({ task, onDragStart, onReassign, onSelectTask, onUpdatePriority }: TaskCardProps) {
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const pCfg = priorityConfig[task.priority || "Medium"];

  return (
    <div
      draggable
      onDragStart={() => onDragStart?.(task.id)}
      onClick={() => onSelectTask?.(task)}
      className="group flex cursor-pointer flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all hover:border-blue-300 hover:shadow-md active:cursor-grabbing"
    >
      {/* Blocker alert */}
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
        {task.committee && (
          <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-200">
            {task.committee}
          </span>
        )}
      </div>

      {/* Title & Description */}
      <div>
        <p className="text-[13px] font-semibold leading-snug text-slate-800 group-hover:text-blue-600 transition-colors">
          {task.title}
        </p>
        {task.description && (
          <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2 font-medium">{task.description}</p>
        )}
      </div>

      {/* Priority + meta row */}
      <div className="flex items-center gap-2 pt-1 relative">
        {/* Interactive Priority Badge */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onUpdatePriority) {
                setShowPriorityMenu(!showPriorityMenu);
              }
            }}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset transition ${pCfg.classes}`}
            title="Click to modify priority level"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {pCfg.label}
            {onUpdatePriority && <ChevronDown size={10} className="opacity-60" />}
          </button>

          {showPriorityMenu && onUpdatePriority && (
            <div
              className="absolute left-0 top-full z-30 mt-1 w-28 rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5 animate-in fade-in duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              {ALL_PRIORITIES.map((pr) => {
                const cfg = priorityConfig[pr];
                return (
                  <button
                    key={pr}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdatePriority(task.id, pr);
                      setShowPriorityMenu(false);
                    }}
                    className={`flex w-full items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium transition hover:bg-slate-50 ${
                      task.priority === pr ? "font-bold text-blue-600" : "text-slate-700"
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
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${task.assignee?.color || "bg-blue-600"}`}
            title={task.assignedMemberName || task.assignee?.name || task.assignee?.initials}
          >
            {task.assignee?.initials || "ME"}
          </span>
        </div>
      </div>
    </div>
  );
}

