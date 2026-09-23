"use client";

import { Calendar, CheckCircle2, ShieldAlert, Sparkles, AlertTriangle, ChevronDown, Check } from "lucide-react";
import type { Task, TaskPriority, TaskStatus } from "./types";
import { useState } from "react";
import { getStatusTheme, type CustomStatusConfig } from "./statusUtils";

const priorityConfig: Record<TaskPriority, { label: string; classes: string; dot: string }> = {
  Low: { label: "Low", classes: "bg-slate-100 text-slate-600 ring-slate-200 hover:bg-slate-200", dot: "bg-slate-400" },
  Medium: { label: "Medium", classes: "bg-blue-50 text-blue-600 ring-blue-200 hover:bg-blue-100", dot: "bg-blue-500" },
  High: { label: "High", classes: "bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100", dot: "bg-amber-500" },
  Critical: { label: "Critical", classes: "bg-rose-50 text-rose-600 ring-rose-200 hover:bg-rose-100", dot: "bg-rose-500" }
};

const DEFAULT_STATUSES: TaskStatus[] = ["To Do", "In Progress", "In Review", "Completed"];
const ALL_PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Critical"];

type TaskGridViewProps = {
  tasks: Task[];
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onUpdatePriority?: (taskId: string, newPriority: TaskPriority) => void;
  onSelectTask?: (task: Task) => void;
  customStatuses?: CustomStatusConfig[];
};

export function TaskGridView({ tasks, onUpdateStatus, onUpdatePriority, onSelectTask, customStatuses }: TaskGridViewProps) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [openPriorityDropdownId, setOpenPriorityDropdownId] = useState<string | null>(null);

  const allStatuses: TaskStatus[] = [
    ...DEFAULT_STATUSES,
    ...(customStatuses ? customStatuses.map((cs) => cs.name as TaskStatus) : [])
  ];

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
        <p className="text-sm font-semibold text-slate-700">No tasks found</p>
        <p className="mt-1 text-xs text-slate-400">Add a task or adjust filters to view tasks in grid mode.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tasks.map((task) => {
        const pCfg = priorityConfig[task.priority || "Medium"];
        const theme = getStatusTheme(task.status, customStatuses);
        const isPriorityOpen = openPriorityDropdownId === task.id;

        return (
          <div
            key={task.id}
            onClick={() => onSelectTask?.(task)}
            className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-blue-300 hover:shadow-md"
          >
            <div>
              {/* Header Badges & Status/Priority Dropdowns */}
              <div className="flex items-center justify-between gap-2 pb-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Priority Dropdown Trigger */}
                  <div className="relative">
                    {onUpdatePriority ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(null);
                          setOpenPriorityDropdownId(isPriorityOpen ? null : task.id);
                        }}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset transition cursor-pointer ${pCfg.classes}`}
                        title="Click to modify priority level"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {pCfg.label}
                        <ChevronDown size={11} className="opacity-60" />
                      </button>
                    ) : (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${pCfg.classes}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {pCfg.label}
                      </span>
                    )}

                    {isPriorityOpen && onUpdatePriority && (
                      <div
                        className="absolute left-0 top-full z-30 mt-1 w-32 rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5 animate-in fade-in duration-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {ALL_PRIORITIES.map((pr) => {
                          const cfg = priorityConfig[pr];
                          const isSelected = task.priority === pr;
                          return (
                            <button
                              key={pr}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdatePriority(task.id, pr);
                                setOpenPriorityDropdownId(null);
                              }}
                              className={`flex w-full items-center justify-between px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50 ${
                                isSelected ? "font-bold text-blue-600" : "text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                                {cfg.label}
                              </div>
                              {isSelected && <Check size={12} className="text-blue-600" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {task.committee && (
                    <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">
                      {task.committee}
                    </span>
                  )}
                </div>

                {/* Status Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenPriorityDropdownId(null);
                      setOpenDropdownId(openDropdownId === task.id ? null : task.id);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-colors ${theme.badge}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
                    {task.status}
                    <ChevronDown size={12} className="opacity-60" />
                  </button>

                  {openDropdownId === task.id && (
                    <div
                      className="absolute right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5 animate-in fade-in duration-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {allStatuses.map((st) => {
                        const stTheme = getStatusTheme(st, customStatuses);
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateStatus(task.id, st);
                              setOpenDropdownId(null);
                            }}
                            className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-left transition-colors hover:bg-slate-50 ${
                              task.status === st ? "font-bold text-blue-600" : "text-slate-700"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${stTheme.dot}`} />
                            {st}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="text-sm font-bold leading-snug text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                {task.title || task.description}
              </h3>

              {task.description && task.title && task.description.trim() !== task.title.trim() && (
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">{task.description}</p>
              )}

              {/* Badges / Nudges / Leader Only */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {task.isLeaderOnly && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200/80">
                    <ShieldAlert size={11} className="text-amber-500" />
                    Leader Only
                  </span>
                )}
                {typeof task.matchPercentage === "number" && task.matchPercentage > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 ring-1 ring-indigo-200/60">
                    <Sparkles size={10} className="text-indigo-500" />
                    {task.matchPercentage}% Match
                  </span>
                )}
                {task.blockedBy && task.blockedBy > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200">
                    <AlertTriangle size={11} className="text-rose-500" />
                    Blocked by {task.blockedBy}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Card Footer */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${task.assignee?.color || "bg-blue-600"}`}
                  title={task.assignedMemberName || task.assignee?.name || task.assignee?.initials || "Assignee"}
                >
                  {task.assignee?.initials || "ME"}
                </span>
                <span className="text-xs font-medium text-slate-600 truncate max-w-[90px]">
                  {task.assignedMemberName || task.assignee?.name || "Unassigned"}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {task.dueDate}
                </span>
                {task.status !== "Completed" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateStatus(task.id, "Completed");
                    }}
                    title="Mark Completed"
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                  >
                    <CheckCircle2 size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

