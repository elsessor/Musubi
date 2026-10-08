"use client";

import { Calendar, CheckCircle, ChevronDown, ChevronUp, Clock, ShieldAlert, Sparkles, AlertTriangle, Bell, Check } from "lucide-react";
import type { Task, TaskPriority, TaskStatus } from "./types";
import { useState } from "react";
import { getOrderedTaskStatuses, getStatusTheme, type CustomStatusConfig } from "./statusUtils";
import { ALL_PRIORITIES, PRIORITY_CONFIG as priorityConfig } from "./priorityUtils";
import { useAuthStore } from "@/store/authStore";
import { canUpdateTaskStatus, canUseTaskPriorityControl } from "@/utils/taskAssignment";
import { TaskAssignee } from "./TaskAssignee";
import { CustomSelect } from "@/components/ui/CustomSelect";



type TaskExpandedViewProps = {
  tasks: Task[];
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onUpdatePriority?: (taskId: string, newPriority: TaskPriority) => void;
  onSelectTask?: (task: Task) => void;
  customStatuses?: CustomStatusConfig[];
  statusOrder?: string[];
};

export function TaskExpandedView({ tasks, onUpdateStatus, onUpdatePriority, onSelectTask, customStatuses, statusOrder }: TaskExpandedViewProps) {
  const uid = useAuthStore((state) => state.firebaseUser?.uid ?? state.profile?.uid);
  const fullName = useAuthStore((state) => state.profile?.fullName || state.firebaseUser?.displayName || "");
  const role = useAuthStore((state) => state.profile?.role);
  function canEditStatus(task: Task) { return canUpdateTaskStatus(task, uid, fullName, role); }
  function canEditPriority(task: Task) { return canUseTaskPriorityControl(task, uid, fullName, Boolean(onUpdatePriority)); }
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});
  const [openPriorityDropdownId, setOpenPriorityDropdownId] = useState<string | null>(null);

  const allStatuses = getOrderedTaskStatuses(statusOrder, customStatuses, tasks.map((task) => task.status));

  const statusOptions = allStatuses.map((value) => {
    const theme = getStatusTheme(value, customStatuses);
    return { value, label: value, indicatorClass: theme.dot, selectedClass: theme.badge };
  });

  function toggleTask(id: string) {
    setExpandedTaskIds((prev) => ({ ...prev, [id]: prev[id] === undefined ? false : !prev[id] }));
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
        <p className="text-sm font-semibold text-slate-700">No tasks found</p>
        <p className="mt-1 text-xs text-slate-400">Add a task or adjust filters to view tasks in expanded mode.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {tasks.map((task) => {
        const isExpanded = expandedTaskIds[task.id] !== false;
        const pCfg = priorityConfig[task.priority || "Medium"];
        const theme = getStatusTheme(task.status, customStatuses);
        const isPriorityOpen = openPriorityDropdownId === task.id;

        return (
          <div
            key={task.id}
            className={`min-w-0 rounded-2xl border border-slate-200 border-l-4 ${theme.border} bg-white shadow-xs transition-all hover:border-slate-300 hover:shadow-md`}
          >
            {/* Main Header / Summary Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      onClick={() => onSelectTask?.(task)}
                      className="break-words text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      {task.title || task.description}
                    </h3>

                    {/* Interactive Priority Badge */}
                    <div className="relative">
                      {canEditPriority(task) ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenPriorityDropdownId(isPriorityOpen ? null : task.id);
                          }}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset transition cursor-pointer ${pCfg.classes}`}
                          title="Click to modify priority level"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {pCfg.label}
                          <ChevronDown size={11} className="opacity-60" />
                        </button>
                      ) : (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${pCfg.classes}`}>
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
                      <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">
                        {task.committee}
                      </span>
                    )}
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${theme.badge}`}>
                      {task.status}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <TaskAssignee task={task} showAvatar={false} className="max-w-[240px]" />
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" />
                      Due {task.dueDate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status dropdown & Actions */}
              <div className="flex max-w-full flex-wrap items-center gap-3">
                {/* Status dropdown */}
                {canEditStatus(task) ? (
                  <div className="w-44 max-w-full">
                    <CustomSelect
                      value={task.status}
                      options={statusOptions}
                      onChange={(value) => { if (canEditStatus(task)) onUpdateStatus(task.id, value as TaskStatus); }}
                      buttonClassName="rounded-xl px-2.5 py-2"
                      dropdownClassName="rounded-xl"
                    />
                  </div>
                ) : <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${theme.badge}`}>{task.status}</span>}

                {onSelectTask && (
                  <button
                    type="button"
                    onClick={() => onSelectTask(task)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    View Details
                  </button>
                )}

                {canEditStatus(task) && task.status !== "Completed" && (
                  <button
                    type="button"
                    onClick={() => { if (canEditStatus(task)) onUpdateStatus(task.id, "Completed"); }}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 transition-colors"
                  >
                    <CheckCircle size={14} />
                    Complete
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Content Drawer */}
            {isExpanded && (
              <div className="rounded-b-2xl border-t border-slate-100 bg-slate-50/50 p-5 space-y-4">
                {/* Description block */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description & Details</h4>
                  <p className="mt-1 text-sm text-slate-700 leading-relaxed">
                    {task.description || "No detailed description provided for this task."}
                  </p>
                </div>

                {/* Metadata & Badges Grid */}
                <div className="grid min-w-0 grid-cols-1 gap-3 pt-2 sm:grid-cols-2 2xl:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-400">Assignee</span>
                    <div className="mt-1 flex items-center gap-2">
                      <TaskAssignee task={task} />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-400">Current Status</span>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                      <span className="text-xs font-bold text-slate-800">{task.status}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-400">Match & Security</span>
                    <div className="mt-1 flex items-center gap-2">
                      {task.isLeaderOnly ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                          <ShieldAlert size={12} /> Leader Only
                        </span>
                      ) : typeof task.matchPercentage === "number" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
                          <Sparkles size={12} /> {task.matchPercentage}% Match
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-500">Standard Task</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-400">Task Nudges</span>
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Bell size={12} className="text-blue-500" />
                      {task.nudges?.length || 0} Nudges Configured
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
