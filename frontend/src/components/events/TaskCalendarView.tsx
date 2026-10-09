"use client";

import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, Clock, Plus } from "lucide-react";
import type { Task, TaskPriority, TaskStatus } from "./types";
import { ALL_PRIORITIES, PRIORITY_CONFIG } from "./priorityUtils";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useState } from "react";
import { getStatusTheme, type CustomStatusConfig } from "./statusUtils";
import { useAuthStore } from "@/store/authStore";
import { canUpdateTaskStatus, canUseTaskPriorityControl } from "@/utils/taskAssignment";
import { TaskAssignee } from "./TaskAssignee";
import { isSameCalendarDay, isTaskScheduledOnDay } from "@/utils/calendarSchedule";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type TaskCalendarViewProps = {
  tasks: Task[];
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onUpdatePriority?: (taskId: string, newPriority: TaskPriority) => void;
  onSelectTask?: (task: Task) => void;
  onAddTask?: () => void;
  customStatuses?: CustomStatusConfig[];
};

export function TaskCalendarView({ tasks, onUpdateStatus, onUpdatePriority, onSelectTask, onAddTask, customStatuses }: TaskCalendarViewProps) {
  const uid = useAuthStore((state) => state.firebaseUser?.uid ?? state.profile?.uid);
  const fullName = useAuthStore((state) => state.profile?.fullName || state.firebaseUser?.displayName || "");
  const role = useAuthStore((state) => state.profile?.role);
  function canEditStatus(task: Task) { return canUpdateTaskStatus(task, uid, fullName, role); }
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());
  const today = new Date();
  const [selectedTaskSnapshot, setSelectedTask] = useState<Task | null>(null);
  const selectedTask = tasks.find((task) => task.id === selectedTaskSnapshot?.id) || null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(1);
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(1);
  }

  function resetToday() {
    setCurrentDate(new Date());
    setSelectedDay(new Date().getDate());
  }

  function getTasksForDay(dayNum: number): Task[] {
    const day = new Date(year, month, dayNum);
    return tasks.filter((task) => isTaskScheduledOnDay(task, day));
  }

  // Build grid slots (leading blanks + days of month)
  const calendarCells = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarCells.push({ isBlank: true, dayNum: 0 });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({ isBlank: false, dayNum: d });
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:gap-4 sm:p-5">
      {/* Calendar Header / Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon size={18} className="text-blue-600" />
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">
            {monthName} {year}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetToday}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors sm:min-h-0"
          >
            Today
          </button>
          <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-2xs">
            <button
              type="button"
              onClick={prevMonth}
              className="flex size-11 items-center justify-center text-slate-600 hover:text-blue-600 transition-colors sm:size-7"
              aria-label="Previous month"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <button
              type="button"
              onClick={nextMonth}
              className="flex size-11 items-center justify-center text-slate-600 hover:text-blue-600 transition-colors sm:size-7"
              aria-label="Next month"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {onAddTask && (
            <button
              type="button"
              onClick={onAddTask}
              className="hidden items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors sm:flex"
            >
              <Plus size={13} />
              Add Task
            </button>
          )}
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="py-1"><span className="sm:hidden" aria-label={wd}>{wd.charAt(0)}</span><span className="hidden sm:inline">{wd}</span></div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 sm:hidden">
        {calendarCells.map((cell, index) => cell.isBlank ? <div key={`mobile-blank-${index}`} /> : (
          <button key={cell.dayNum} type="button" aria-pressed={selectedDay === cell.dayNum} aria-label={`${monthName} ${cell.dayNum}, ${getTasksForDay(cell.dayNum).length} tasks`} onClick={() => setSelectedDay(cell.dayNum)} className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold ${selectedDay === cell.dayNum ? "bg-blue-600 text-white" : isSameCalendarDay(new Date(year, month, cell.dayNum), today) ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}>
            {cell.dayNum}
            <span aria-hidden="true" className={`size-1 rounded-full ${getTasksForDay(cell.dayNum).length ? selectedDay === cell.dayNum ? "bg-white" : "bg-blue-500" : "bg-transparent"}`} />
          </button>
        ))}
      </div>
      <section className="space-y-2 border-t border-slate-100 pt-3 sm:hidden" aria-label="Tasks for selected date">
        <h3 className="text-sm font-bold text-slate-800">{monthName} {selectedDay} · {getTasksForDay(selectedDay).length} tasks</h3>
        {getTasksForDay(selectedDay).length === 0 && <p className="py-4 text-sm text-slate-500">No tasks scheduled for this day.</p>}
        {getTasksForDay(selectedDay).map((task) => (
          <button key={task.id} type="button" onClick={() => onSelectTask ? onSelectTask(task) : setSelectedTask(task)} className="flex w-full min-w-0 flex-col gap-2 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50">
            <span className="break-words text-sm font-semibold text-slate-900">{task.title || task.description}</span>
            <span className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusTheme(task.status, customStatuses).badge}`}>{task.status}</span>
              <TaskAssignee task={task} />
            </span>
          </button>
        ))}
      </section>
      <div className="hidden grid-cols-7 gap-2 sm:grid">
        {calendarCells.map((cell, idx) => {
          if (cell.isBlank) {
            return <div key={`blank-${idx}`} className="min-h-[100px] rounded-xl bg-slate-50/50 p-2 border border-transparent" />;
          }

          const dayTasks = getTasksForDay(cell.dayNum);
          const isToday = isSameCalendarDay(new Date(year, month, cell.dayNum), today);

          return (
            <div
              key={`day-${cell.dayNum}`}
              className={`group flex min-h-[100px] flex-col rounded-xl border p-2 transition-all ${isToday
                ? "border-blue-300 bg-blue-50/30 ring-2 ring-blue-400/20"
                : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-2xs"
                }`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${isToday ? "bg-blue-600 text-white" : "text-slate-700"
                    }`}
                >
                  {cell.dayNum}
                </span>

                {dayTasks.length > 0 && (
                  <span className="text-[10px] font-semibold text-slate-400">
                    {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}
                  </span>
                )}
              </div>

              {/* Tasks list inside day box */}
              <div className="mt-1.5 flex flex-col gap-1 overflow-y-auto max-h-[80px]">
                {dayTasks.map((t) => {
                  const theme = getStatusTheme(t.status, customStatuses);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        if (onSelectTask) {
                          onSelectTask(t);
                        } else {
                          setSelectedTask(t);
                        }
                      }}
                      className={`group/task flex items-center justify-between rounded-lg border px-2 py-1 text-left text-[11px] font-semibold transition-all ${theme.bg} ${theme.text} ${theme.border} hover:opacity-90`}
                      title={`${t.title} (${t.status})`}
                    >
                      <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                        <span className="max-w-full truncate">{t.title}</span>
                        <TaskAssignee task={t} showAvatar={false} compact />
                      </span>
                      <span className="ml-1 shrink-0 opacity-0 group-hover/task:opacity-100 transition-opacity">
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

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
              <TaskAssignee task={selectedTask} />
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${getStatusTheme(selectedTask.status, customStatuses).badge}`}>{selectedTask.status}</span>

              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-slate-400">Due: <strong className="text-slate-700">{selectedTask.dueDate}</strong></span>
                <div className="flex min-w-0 items-center gap-2"><span className="text-slate-400">Priority:</span>
                  {canUseTaskPriorityControl(selectedTask, uid, fullName, Boolean(onUpdatePriority), role) ? (
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
                  onClick={() => {
                    if (canEditStatus(selectedTask)) onUpdateStatus(selectedTask.id, "Completed");
                    setSelectedTask(null);
                  }}
                  className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
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
    </div>
  );
}
