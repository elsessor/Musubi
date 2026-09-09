"use client";

import { Calendar, CheckCircle, ChevronDown, ChevronUp, Clock, ShieldAlert, Sparkles, AlertTriangle, Bell, User } from "lucide-react";
import type { Task, TaskPriority, TaskStatus } from "./types";
import { useState } from "react";

const priorityConfig: Record<TaskPriority, { label: string; classes: string }> = {
  Low:      { label: "Low",      classes: "bg-slate-100 text-slate-600 ring-slate-200" },
  Medium:   { label: "Medium",   classes: "bg-blue-50 text-blue-600 ring-blue-200" },
  High:     { label: "High",     classes: "bg-amber-50 text-amber-700 ring-amber-200" },
  Critical: { label: "Critical", classes: "bg-rose-50 text-rose-600 ring-rose-200" }
};

const STATUS_ORDER: TaskStatus[] = ["To Do", "In Progress", "In Review", "Completed"];

type TaskExpandedViewProps = {
  tasks: Task[];
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
};

export function TaskExpandedView({ tasks, onUpdateStatus }: TaskExpandedViewProps) {
  // All tasks expanded by default in expanded view
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});

  function toggleTask(id: string) {
    setExpandedTaskIds((prev) => ({ ...prev, [id]: prev[id] === undefined ? false : !prev[id] }));
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-700">No tasks found</p>
        <p className="mt-1 text-xs text-slate-400">Add a task or adjust filters to view tasks in expanded mode.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {tasks.map((task) => {
        const isExpanded = expandedTaskIds[task.id] !== false; // Default true
        const pCfg = priorityConfig[task.priority || "Medium"];
        const currentStatusIndex = STATUS_ORDER.indexOf(task.status);

        const statusColor =
          task.status === "Completed"
            ? "border-l-emerald-500"
            : task.status === "In Progress"
            ? "border-l-blue-500"
            : task.status === "In Review"
            ? "border-l-purple-500"
            : "border-l-slate-400";

        return (
          <div
            key={task.id}
            className={`overflow-hidden rounded-2xl border border-slate-200 border-l-4 ${statusColor} bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md`}
          >
            {/* Main Header / Summary Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                <button
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900">{task.title || task.description}</h3>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${pCfg.classes}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {pCfg.label}
                    </span>
                    {task.committee && (
                      <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">
                        {task.committee}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <User size={12} className="text-slate-400" />
                      {task.assignedMemberName || task.assignee?.initials || "Unassigned"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" />
                      Due {task.dueDate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status stepper & Actions */}
              <div className="flex items-center gap-3">
                {/* Status stepper pills */}
                <div className="hidden sm:flex items-center gap-1 rounded-xl bg-slate-50 p-1 border border-slate-200">
                  {STATUS_ORDER.map((st, idx) => {
                    const isActive = task.status === st;
                    const isPassed = idx <= currentStatusIndex;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => onUpdateStatus(task.id, st)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-slate-900 text-white shadow-xs"
                            : isPassed
                            ? "text-slate-700 hover:bg-slate-200/60"
                            : "text-slate-400 hover:bg-slate-200/40"
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>

                {task.status !== "Completed" && (
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(task.id, "Completed")}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                  >
                    <CheckCircle size={14} />
                    Complete
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Content Drawer */}
            {isExpanded && (
              <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-4">
                {/* Description block */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description & Details</h4>
                  <p className="mt-1 text-sm text-slate-700 leading-relaxed">
                    {task.description || "No detailed description provided for this task."}
                  </p>
                </div>

                {/* Metadata & Badges Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-400">Assignee</span>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${task.assignee?.color || "bg-blue-600"}`}>
                        {task.assignee?.initials || "ME"}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">
                        {task.assignedMemberName || "Unassigned"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-400">AI Match Score</span>
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
                      <Sparkles size={14} />
                      {typeof task.matchPercentage === "number" ? `${task.matchPercentage}% Match` : "N/A"}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-400">Access Level</span>
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                      <ShieldAlert size={14} className="text-amber-500" />
                      {task.isLeaderOnly ? "Leader Only" : "All Members"}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-400">Dependencies</span>
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <AlertTriangle size={14} className={task.blockedBy ? "text-rose-500" : "text-slate-400"} />
                      {task.blockedBy ? `Blocked by ${task.blockedBy} task(s)` : "No Blockers"}
                    </div>
                  </div>
                </div>

                {/* Nudges List (if nudges present) */}
                {task.nudges && task.nudges.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                      <Bell size={14} className="text-amber-600" />
                      Automated Nudges & Reminders ({task.nudges.length})
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {task.nudges.map((nudge, idx) => (
                        <div key={nudge.nudgeUID || idx} className="flex items-center justify-between text-xs text-amber-900 bg-white/80 px-3 py-1.5 rounded-lg border border-amber-200/60">
                          <span>Type: <strong className="font-semibold">{nudge.nudgeType}</strong></span>
                          <span>Trigger: {nudge.triggerDate}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${nudge.sent ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                            {nudge.sent ? "Sent" : "Scheduled"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
