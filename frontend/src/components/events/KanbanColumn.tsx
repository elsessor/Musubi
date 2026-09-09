"use client";

import { Plus } from "lucide-react";
import type { Task, TaskStatus } from "./types";
import { TaskCard } from "./TaskCard";
import { getStatusTheme, type CustomStatusConfig } from "./statusUtils";

type KanbanColumnProps = {
  status: TaskStatus;
  tasks: Task[];
  onAddTask?: () => void;
  onDragStart?: (taskId: string) => void;
  onDrop?: (status: TaskStatus) => void;
  customStatuses?: CustomStatusConfig[];
};

export function KanbanColumn({ status, tasks, onAddTask, onDragStart, onDrop, customStatuses }: KanbanColumnProps) {
  const theme = getStatusTheme(status, customStatuses);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop?.(status);
  };

  return (
    <div
      className="flex h-full min-w-[280px] max-w-[300px] flex-col rounded-2xl bg-[#f4f6f9]"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-4 py-3.5">
        <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
        <span className={`text-sm font-semibold ${theme.text}`}>{status}</span>
        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
          {tasks.length}
        </span>
      </div>

      {/* Scrollable task list */}
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-3 pb-3">
        {tasks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 text-xs text-slate-400">
            Drop tasks here
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} onDragStart={onDragStart} />
          ))
        )}
      </div>

      {/* Add task button */}
      <button
        type="button"
        onClick={onAddTask}
        className="mx-3 mb-3 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
      >
        <Plus size={13} />
        Add task
      </button>
    </div>
  );
}
