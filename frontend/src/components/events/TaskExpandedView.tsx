"use client";

import { Bell, Calendar, CheckCircle, ChevronDown, ChevronUp, ShieldAlert, Sparkles } from "lucide-react";
import { useId, useState } from "react";
import type { Task, TaskStatus } from "./types";
import { OverdueBadge } from "./overdue";
import { getOrderedTaskStatuses, getStatusTheme, type CustomStatusConfig } from "./statusUtils";
import { PRIORITY_CONFIG as priorityConfig } from "./priorityUtils";
import { useAuthStore } from "@/store/authStore";
import { canUpdateTaskStatus } from "@/utils/taskAssignment";
import { TaskAssignee } from "./TaskAssignee";
import { CustomSelect } from "@/components/ui/CustomSelect";

type TaskExpandedViewProps = {
  tasks: Task[];
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onSelectTask?: (task: Task) => void;
  customStatuses?: CustomStatusConfig[];
  statusOrder?: string[];
};

export function TaskExpandedView({ tasks, onUpdateStatus, onSelectTask, customStatuses, statusOrder }: TaskExpandedViewProps) {
  const panelId = useId();
  const uid = useAuthStore((state) => state.firebaseUser?.uid ?? state.profile?.uid);
  const fullName = useAuthStore((state) => state.profile?.fullName || state.firebaseUser?.displayName || "");
  const role = useAuthStore((state) => state.profile?.role);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});
  function canEditStatus(task: Task) { return canUpdateTaskStatus(task, uid, fullName, role); }

  const allStatuses = getOrderedTaskStatuses(statusOrder, customStatuses, tasks.map((task) => task.status));
  const statusOptions = allStatuses.map((value) => {
    const theme = getStatusTheme(value, customStatuses);
    return { value, label: value, indicatorClass: theme.dot, selectedClass: theme.badge };
  });

  function toggleTask(id: string) {
    setExpandedTaskIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center shadow-xs">
        <p className="text-sm font-semibold text-slate-700">No tasks found</p>
        <p className="mt-1 text-xs text-slate-400">Add a task or adjust filters to see tasks in this list.</p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {tasks.map((task, index) => {
        const isExpanded = expandedTaskIds[task.id] === true;
        const pCfg = priorityConfig[task.priority || "Medium"];
        const theme = getStatusTheme(task.status, customStatuses);
        const detailsId = `${panelId}-${index}-details`;
        const dueDate = task.dueDate || task.deadline;

        return (
          <div key={task.id} className={`min-w-0 rounded-2xl border border-slate-200 border-l-4 ${theme.border} bg-white shadow-xs transition-all hover:border-slate-300 hover:shadow-md`}>
            <div className="min-w-0 space-y-3 p-3 sm:p-4">
              <div className="flex min-w-0 items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  aria-expanded={isExpanded}
                  aria-controls={detailsId}
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} ${task.title || "task"}`}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <div className="min-w-0 flex-1 space-y-2">
                  <h3 className="break-words [overflow-wrap:anywhere] text-sm font-semibold leading-5 text-slate-900">
                    {onSelectTask ? <button type="button" onClick={() => onSelectTask(task)} className="w-full text-left transition-colors hover:text-blue-600">{task.title || task.description}</button> : task.title || task.description}
                  </h3>
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${pCfg.classes}`}><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />{pCfg.label}</span>
                    {task.committee ? <span title={task.committee} className="inline-flex min-w-0 max-w-full items-center rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-200"><span className="truncate">{task.committee}</span></span> : null}
                    <OverdueBadge task={task} />
                  </div>
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-1.5 text-[11px] text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
                <TaskAssignee task={task} compactMobile className="self-start max-w-full" />
                <div className="flex min-w-0 items-start gap-1.5 leading-4">
                  <Calendar size={12} className="mt-0.5 shrink-0 text-slate-400" />
                  <span className="min-w-0 break-words">{dueDate ? `Due ${dueDate}` : "No deadline"}</span>
                </div>
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5">
                <div className="min-w-0 flex-1 basis-36 sm:max-w-48">
                  {canEditStatus(task) ? (
                    <CustomSelect
                      value={task.status}
                      options={statusOptions}
                      onChange={(value) => { if (canEditStatus(task)) onUpdateStatus(task.id, value as TaskStatus); }}
                      buttonClassName="min-h-9 rounded-xl px-2.5 py-1.5"
                      dropdownClassName="rounded-xl [&_button]:min-h-11"
                      portal
                    />
                  ) : <span className={`inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold ring-1 ring-inset ${theme.badge}`}><span className={`size-2 shrink-0 rounded-full ${theme.dot}`} /><span className="min-w-0 break-words">{task.status}</span></span>}
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {onSelectTask ? <button type="button" onClick={() => onSelectTask(task)} className="min-h-9 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:flex-none">View Details</button> : null}
                  {canEditStatus(task) && task.status !== "Completed" && task.status !== "Done" ? (
                    <button type="button" onClick={() => { if (canEditStatus(task)) onUpdateStatus(task.id, "Completed"); }} className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-emerald-700 sm:flex-none">
                      <CheckCircle size={14} className="shrink-0" /> Complete
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {isExpanded ? (
              <div id={detailsId} className="min-w-0 space-y-3 rounded-b-2xl border-t border-slate-100 bg-slate-50/50 p-3 sm:p-4">
                <div className="min-w-0">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Description</h4>
                  <p className="mt-1.5 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-6 text-slate-700">{task.description || "No detailed description provided for this task."}</p>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200/70 pt-2.5 text-[11px] text-slate-500">
                  {task.isLeaderOnly ? <span className="inline-flex items-center gap-1 font-semibold text-amber-600"><ShieldAlert size={12} className="shrink-0" /> Leader Only</span>
                    : typeof task.matchPercentage === "number" ? <span className="inline-flex items-center gap-1 font-semibold text-indigo-600"><Sparkles size={12} className="shrink-0" /> {task.matchPercentage}% Match</span>
                    : <span>Standard Task</span>}
                  <span className="inline-flex items-center gap-1.5"><Bell size={12} className="shrink-0 text-blue-500" />{task.nudges?.length || 0} nudges</span>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
