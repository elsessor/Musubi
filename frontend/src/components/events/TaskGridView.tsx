"use client";

import { Calendar, CheckCircle2, ShieldAlert, Sparkles, AlertTriangle, ChevronDown, Check } from "lucide-react";
import type { Task, TaskPriority, TaskStatus } from "./types";
import { OverdueBadge } from "./overdue";
import { useState } from "react";
import { getOrderedTaskStatuses, getStatusTheme, type CustomStatusConfig } from "./statusUtils";
import { ALL_PRIORITIES, PRIORITY_CONFIG as priorityConfig } from "./priorityUtils";
import { useAuthStore } from "@/store/authStore";
import { canUpdateTaskStatus, canUseTaskPriorityControl } from "@/utils/taskAssignment";
import { TaskAssignee } from "./TaskAssignee";



type TaskGridViewProps = {
  tasks: Task[];
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onUpdatePriority?: (taskId: string, newPriority: TaskPriority) => void;
  onSelectTask?: (task: Task) => void;
  customStatuses?: CustomStatusConfig[];
  statusOrder?: string[];
};

export function TaskGridView({ tasks, onUpdateStatus, onUpdatePriority, onSelectTask, customStatuses, statusOrder }: TaskGridViewProps) {
  const uid = useAuthStore((state) => state.firebaseUser?.uid ?? state.profile?.uid);
  const fullName = useAuthStore((state) => state.profile?.fullName || state.firebaseUser?.displayName || "");
  const role = useAuthStore((state) => state.profile?.role);
  function canEditStatus(task: Task) { return canUpdateTaskStatus(task, uid, fullName, role); }
  function canEditPriority(task: Task) { return canUseTaskPriorityControl(task, uid, fullName, Boolean(onUpdatePriority), role); }
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [openPriorityDropdownId, setOpenPriorityDropdownId] = useState<string | null>(null);

  const allStatuses = getOrderedTaskStatuses(statusOrder, customStatuses, tasks.map((task) => task.status));

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
        <p className="text-sm font-semibold text-slate-700">No tasks found</p>
        <p className="mt-1 text-xs text-slate-400">Add a task or adjust filters to view tasks in grid mode.</p>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {tasks.map((task) => {
        const pCfg = priorityConfig[task.priority || "Medium"];
        const theme = getStatusTheme(task.status, customStatuses);
        const isPriorityOpen = openPriorityDropdownId === task.id;

        return (
          <div
            key={task.id}
            onClick={() => onSelectTask?.(task)}
            className="group relative flex min-w-0 cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-blue-300 hover:shadow-md"
          >
            <div>
              {/* Header Badges & Status/Priority Dropdowns */}
              <div className="flex flex-wrap items-start justify-between gap-2 pb-3">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  {/* Priority Dropdown Trigger */}
                  <div className="relative">
                    {canEditPriority(task) ? (
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

                    {isPriorityOpen && canEditPriority(task) && onUpdatePriority && (
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
                                if (canEditPriority(task)) onUpdatePriority?.(task.id, pr);
                                setOpenPriorityDropdownId(null);
                              }}
                              className={`flex w-full items-center justify-between px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50 ${
                                isSelected ? `${cfg.classes} font-bold` : "text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                                {cfg.label}
                              </div>
                              {isSelected && <Check size={12} className="text-current" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {task.committee && (
                    <span className="inline-flex items-center max-w-full truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      {task.committee}
                    </span>
                  )}
                </div>

                {/* Status Dropdown */}
                <div className="relative">
                  {canEditStatus(task) ? (
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
                  ) : <span onClick={(event) => event.stopPropagation()} className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold ${theme.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />{task.status}</span>}

                  {canEditStatus(task) && openDropdownId === task.id && (
                    <div
                      className="absolute right-0 top-full z-30 mt-1.5 max-h-56 w-40 space-y-0.5 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg ring-1 ring-black/5 animate-in fade-in duration-100"
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
                              if (canEditStatus(task)) onUpdateStatus(task.id, st);
                              setOpenDropdownId(null);
                            }}
                            className={`flex min-w-0 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-left transition-colors ${
                              task.status === st ? `${stTheme.badge} font-semibold ring-1 ring-inset` : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${stTheme.dot}`} />
                            <span className="min-w-0 flex-1 break-words">{st}</span>
                            {task.status === st && <Check size={12} className="shrink-0 text-current" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="min-h-10 break-words text-sm font-semibold leading-5 text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                {task.title || task.description}
              </h3>

              {task.description && task.title && task.description.trim() !== task.title.trim() && (
                <p className="mt-1 break-words text-xs leading-5 text-slate-500 line-clamp-2">{task.description}</p>
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
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <TaskAssignee task={task} className="max-w-[180px]" />

              <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar size={12} className="shrink-0" />
                  <span className="break-words">{task.dueDate || "No deadline"}</span>
                </span>
                {canEditStatus(task) && task.status !== "Completed" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canEditStatus(task)) onUpdateStatus(task.id, "Completed");
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
