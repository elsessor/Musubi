"use client";

import { Calendar, CheckCircle, ChevronDown, ShieldAlert, Sparkles, AlertTriangle } from "lucide-react";
import type { Task, TaskPriority, TaskStatus } from "./types";
import { useState } from "react";
import { getStatusTheme, type CustomStatusConfig } from "./statusUtils";

const priorityConfig: Record<TaskPriority, { label: string; classes: string }> = {
  Low: { label: "Low", classes: "bg-slate-100 text-slate-600 ring-slate-200" },
  Medium: { label: "Medium", classes: "bg-blue-50 text-blue-600 ring-blue-200" },
  High: { label: "High", classes: "bg-amber-50 text-amber-700 ring-amber-200" },
  Critical: { label: "Critical", classes: "bg-rose-50 text-rose-600 ring-rose-200" }
};

const DEFAULT_STATUSES: TaskStatus[] = ["To Do", "In Progress", "In Review", "Completed"];

type TaskTableViewProps = {
  tasks: Task[];
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  customStatuses?: CustomStatusConfig[];
};

export function TaskTableView({ tasks, onUpdateStatus, customStatuses }: TaskTableViewProps) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const allStatuses: TaskStatus[] = [
    ...DEFAULT_STATUSES,
    ...(customStatuses ? customStatuses.map((cs) => cs.name as TaskStatus) : [])
  ];

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-700">No tasks found</p>
        <p className="mt-1 text-xs text-slate-400">Add a task or adjust filters to view tasks in table mode.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          <tr>
            <th scope="col" className="px-5 py-3.5">Task Title</th>
            <th scope="col" className="px-4 py-3.5">Committee</th>
            <th scope="col" className="px-4 py-3.5">Status</th>
            <th scope="col" className="px-4 py-3.5">Priority</th>
            <th scope="col" className="px-4 py-3.5">Assignee</th>
            <th scope="col" className="px-4 py-3.5">Due Date</th>
            <th scope="col" className="px-4 py-3.5">Flags / Info</th>
            <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {tasks.map((task) => {
            const pCfg = priorityConfig[task.priority || "Medium"];
            const theme = getStatusTheme(task.status, customStatuses);

            return (
              <tr key={task.id} className="transition-colors hover:bg-slate-50/80">
                {/* Title & Description */}
                <td className="px-5 py-3.5">
                  <div className="font-semibold text-slate-900">{task.title || task.description}</div>
                  {task.description && task.title && task.description.trim() !== task.title.trim() && (
                    <div className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">{task.description}</div>
                  )}
                </td>

                {/* Committee */}
                <td className="px-4 py-3.5">
                  <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 border border-violet-200">
                    {task.committee || "General"}
                  </span>
                </td>

                {/* Status Dropdown */}
                <td className="px-4 py-3.5 relative">
                  <button
                    type="button"
                    onClick={() => setOpenDropdownId(openDropdownId === task.id ? null : task.id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-colors ${theme.badge}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
                    {task.status}
                    <ChevronDown size={12} className="opacity-60" />
                  </button>

                  {openDropdownId === task.id && (
                    <div className="absolute left-4 top-full z-20 mt-1 max-h-48 overflow-y-auto w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
                      {allStatuses.map((st) => {
                        const stTheme = getStatusTheme(st, customStatuses);
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => {
                              onUpdateStatus(task.id, st);
                              setOpenDropdownId(null);
                            }}
                            className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-left transition-colors hover:bg-slate-50 ${task.status === st ? "font-bold text-blue-600" : "text-slate-700"
                              }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${stTheme.dot}`} />
                            {st}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </td>

                {/* Priority */}
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${pCfg.classes}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {pCfg.label}
                  </span>
                </td>

                {/* Assignee */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${task.assignee?.color || "bg-blue-600"}`}
                    >
                      {task.assignee?.initials || "ME"}
                    </span>
                    <span className="font-medium text-slate-700 truncate max-w-[120px]">
                      {task.assignedMemberName || "Unassigned"}
                    </span>
                  </div>
                </td>

                {/* Due Date */}
                <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-slate-400" />
                    {task.dueDate}
                  </div>
                </td>

                {/* Flags / Info */}
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {task.isLeaderOnly && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200/80">
                        <ShieldAlert size={10} className="text-amber-500" />
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
                        <AlertTriangle size={10} className="text-rose-500" />
                        Blocked ({task.blockedBy})
                      </span>
                    ) : null}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5 text-right">
                  {task.status !== "Completed" ? (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(task.id, "Completed")}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <CheckCircle size={12} />
                      Complete
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-emerald-600">Done</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
