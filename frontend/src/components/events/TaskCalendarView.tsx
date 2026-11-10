"use client";

import type { Task, TaskPriority, TaskStatus } from "./types";
import { ALL_PRIORITIES, PRIORITY_CONFIG } from "./priorityUtils";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useState } from "react";
import { getStatusTheme, type CustomStatusConfig } from "./statusUtils";
import { useAuthStore } from "@/store/authStore";
import { canUpdateTaskStatus, canUseTaskPriorityControl } from "@/utils/taskAssignment";
import { TaskAssignee } from "./TaskAssignee";
import { TaskSelfAssignmentSelect } from "./TaskSelfAssignmentSelect";
import { OverdueBadge } from "./overdue";
import { isTaskScheduledOnDay } from "@/utils/calendarSchedule";
import { CalendarView } from "./CalendarView";
import { TaskDependencyBadge } from "./TaskDependencies";
import { isBlockedTaskStatus } from "@/utils/taskDependencies";

type TaskCalendarViewProps = {
  readOnly?: boolean;
  tasks: Task[];
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onUpdatePriority?: (taskId: string, newPriority: TaskPriority) => void;
  onSelectTask?: (task: Task) => void;
  customStatuses?: CustomStatusConfig[];
};

export function TaskCalendarView({ readOnly = false, tasks, onUpdateStatus, onUpdatePriority, onSelectTask, customStatuses }: TaskCalendarViewProps) {
  const uid = useAuthStore((state) => state.firebaseUser?.uid ?? state.profile?.uid);
  const fullName = useAuthStore((state) => state.profile?.fullName || state.firebaseUser?.displayName || "");
  const role = useAuthStore((state) => state.profile?.role);
  function canEditStatus(task: Task) { return !readOnly && canUpdateTaskStatus(task, uid, fullName, role); }
  const [selectedTaskSnapshot, setSelectedTask] = useState<Task | null>(null);
  const selectedTask = tasks.find((task) => task.id === selectedTaskSnapshot?.id) || null;

  return (
    <>
      <CalendarView
        items={tasks}
        itemLabel="tasks"
        getId={(task) => task.id}
        getTitle={(task) => task.title || task.description || "Untitled task"}
        getStatus={(task) => task.status}
        getDescription={(task) => task.description}
        isScheduled={isTaskScheduledOnDay}
        onSelect={(task) => onSelectTask ? onSelectTask(task) : setSelectedTask(task)}
        renderDetails={(task) => <><TaskAssignee task={task} /><TaskDependencyBadge task={task} /><OverdueBadge task={task} /></>}
        renderCompactIndicator={(task) => <><TaskDependencyBadge task={task} compact /><OverdueBadge task={task} compact /></>}
        customStatuses={customStatuses}
      />

      {/* Selected Task Details Quick Modal / Popover */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">Calendar Task</span>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <h3 className="text-base font-bold text-slate-900">{selectedTask.title || selectedTask.description}</h3>
              <p className="text-xs text-slate-500">{selectedTask.description}</p>
              <div className="min-w-0">
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Assignee</label>
                <TaskSelfAssignmentSelect task={selectedTask} readOnly={readOnly} />
              </div>
              <TaskDependencyBadge task={selectedTask} />
              <OverdueBadge task={selectedTask} />
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${getStatusTheme(selectedTask.status, customStatuses).badge}`}>{selectedTask.status}</span>

              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-slate-400">Due: <strong className="text-slate-700">{selectedTask.dueDate || selectedTask.deadline || "No deadline"}</strong></span>
                <div className="flex min-w-0 items-center gap-2"><span className="text-slate-400">Priority:</span>
                  {!readOnly && canUseTaskPriorityControl(selectedTask, uid, fullName, Boolean(onUpdatePriority), role) ? (
                    <div className="w-36 max-w-full">
                      <CustomSelect value={selectedTask.priority || "Medium"} portal onChange={(value) => {
                        const priority = value as TaskPriority;
                        onUpdatePriority?.(selectedTask.id, priority);
                      }} options={ALL_PRIORITIES.map((value) => ({ value, label: value, indicatorClass: PRIORITY_CONFIG[value].dot, selectedClass: PRIORITY_CONFIG[value].classes }))} buttonClassName="py-1 text-xs" />
                    </div>
                  ) : <strong className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1 ring-inset ${PRIORITY_CONFIG[selectedTask.priority || "Medium"].classes}`}><span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_CONFIG[selectedTask.priority || "Medium"].dot}`} />{selectedTask.priority || "Medium"}</strong>}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
              {canEditStatus(selectedTask) && selectedTask.status !== "Completed" && (
                <button
                  type="button"
                  disabled={isBlockedTaskStatus(selectedTask, "Completed")}
                  onClick={() => {
                    if (canEditStatus(selectedTask) && !isBlockedTaskStatus(selectedTask, "Completed")) onUpdateStatus(selectedTask.id, "Completed");
                    setSelectedTask(null);
                  }}
                  className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Mark Completed
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
