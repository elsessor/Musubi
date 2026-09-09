"use client";

import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, Clock, Plus } from "lucide-react";
import type { Task, TaskStatus } from "./types";
import { useState } from "react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const statusConfig: Record<TaskStatus, { label: string; bg: string; text: string; border: string }> = {
  "To Do":       { label: "To Do",       bg: "bg-slate-100",   text: "text-slate-700", border: "border-slate-200" },
  "In Progress": { label: "In Progress", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "In Review":   { label: "In Review",   bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  "Completed":   { label: "Completed",   bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
};

type TaskCalendarViewProps = {
  tasks: Task[];
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onAddTask?: () => void;
};

export function TaskCalendarView({ tasks, onUpdateStatus, onAddTask }: TaskCalendarViewProps) {
  // Default to August 2026 (matching event timelines in mock data)
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 7, 1)); // Aug 2026
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function resetToday() {
    setCurrentDate(new Date(2026, 7, 1));
  }

  // Parse task due date and match with day number
  function getTasksForDay(dayNum: number): Task[] {
    return tasks.filter((t) => {
      if (!t.dueDate) return false;
      const lower = t.dueDate.toLowerCase();
      // Look for day number match (e.g. "Aug 15", "15", "2026-08-15")
      if (lower.includes(String(dayNum))) return true;
      return false;
    });
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
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Calendar Header / Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon size={18} className="text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">
            {monthName} {year}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetToday}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            Aug 2026
          </button>
          <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-2xs">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 text-slate-600 hover:text-blue-600 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 text-slate-600 hover:text-blue-600 transition-colors"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {onAddTask && (
            <button
              type="button"
              onClick={onAddTask}
              className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
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
          <div key={wd} className="py-1">{wd}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarCells.map((cell, idx) => {
          if (cell.isBlank) {
            return <div key={`blank-${idx}`} className="min-h-[100px] rounded-xl bg-slate-50/50 p-2 border border-transparent" />;
          }

          const dayTasks = getTasksForDay(cell.dayNum);
          const isToday = cell.dayNum === 15; // Highlight 15th as demo current day

          return (
            <div
              key={`day-${cell.dayNum}`}
              className={`group flex min-h-[100px] flex-col rounded-xl border p-2 transition-all ${
                isToday
                  ? "border-blue-300 bg-blue-50/30 ring-2 ring-blue-400/20"
                  : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-2xs"
              }`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    isToday ? "bg-blue-600 text-white" : "text-slate-700"
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
                  const s = statusConfig[t.status] || statusConfig["To Do"];
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTask(t)}
                      className={`group/task flex items-center justify-between rounded-lg border px-2 py-1 text-left text-[11px] font-semibold transition-all ${s.bg} ${s.text} ${s.border} hover:opacity-90`}
                      title={`${t.title} (${t.status})`}
                    >
                      <span className="truncate">{t.title}</span>
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

              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-slate-400">Due: <strong className="text-slate-700">{selectedTask.dueDate}</strong></span>
                <span className="text-slate-400">Priority: <strong className="text-slate-700">{selectedTask.priority}</strong></span>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
              {selectedTask.status !== "Completed" && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateStatus(selectedTask.id, "Completed");
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
