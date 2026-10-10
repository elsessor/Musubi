"use client";

import { GripVertical, Plus } from "lucide-react";
import type { Task, TaskStatus } from "./types";
import { TaskCard } from "./TaskCard";
import { getStatusTheme, type CustomStatusConfig } from "./statusUtils";

type KanbanColumnProps = {
  status: TaskStatus;
  tasks: Task[];
  onAddTask?: () => void;
  onDragStart?: (taskId: string) => void;
  onDragEnd?: () => void;
  onDrop?: (status: TaskStatus) => void;
  onReassignTask?: (task: Task) => void;
  onSelectTask?: (task: Task) => void;
  customStatuses?: CustomStatusConfig[];
  isLeader?: boolean;
  onColumnDragStart?: (status: TaskStatus) => void;
  onColumnDragOver?: (e: React.DragEvent, status: TaskStatus) => void;
  onColumnDrop?: (status: TaskStatus) => void;
  isColumnDragging?: boolean;
  isColumnDragOver?: boolean;
  draggedStatusPill?: string | null;
  draggedTaskId?: string | null;
  dragOverColumnStatus?: string | null;
  onTaskDragOver?: (status: TaskStatus) => void;
};

export function KanbanColumn({
  status,
  tasks,
  onAddTask,
  onDragStart,
  onDragEnd,
  onDrop,
  onReassignTask,
  onSelectTask,
  customStatuses,
  isLeader = false,
  onColumnDragStart,
  onColumnDragOver,
  onColumnDrop,
  isColumnDragging = false,
  isColumnDragOver = false,
  draggedStatusPill = null,
  draggedTaskId = null,
  dragOverColumnStatus = null,
  onTaskDragOver
}: KanbanColumnProps) {
  const theme = getStatusTheme(status, customStatuses);
  const isDraggableColumn = Boolean(isLeader && onColumnDragStart);
  const isTaskOverTarget = Boolean(draggedTaskId) && dragOverColumnStatus === status;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedTaskId) {
      onTaskDragOver?.(status);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop?.(status);
  };

  return (
    <div
      className={`flex w-[min(18rem,calc(100vw-3rem))] min-w-0 shrink-0 snap-start flex-col rounded-2xl bg-[#f4f6f9] transition-all sm:w-72 ${
        isColumnDragging ? "opacity-30 scale-95 border-2 border-dashed border-blue-400" : ""
      } ${
        isColumnDragOver || isTaskOverTarget ? "ring-2 ring-blue-500 bg-blue-50/60 shadow-inner" : ""
      }`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div
        draggable={isDraggableColumn}
        onDragStart={(e) => {
          if (!isDraggableColumn) return;
          e.stopPropagation();
          onColumnDragStart?.(status);
        }}
        onDragOver={(e) => {
          if (!isDraggableColumn) return;
          onColumnDragOver?.(e, status);
        }}
        onDrop={(e) => {
          if (isDraggableColumn && draggedStatusPill) {
            e.stopPropagation();
            onColumnDrop?.(status);
          }
        }}
        className={`flex items-center gap-2 px-3 py-3 ${
          isDraggableColumn ? "cursor-grab active:cursor-grabbing hover:bg-slate-200/50 rounded-t-2xl transition" : ""
        }`}
        title={isDraggableColumn ? "Drag column to rearrange" : undefined}
      >
        {isDraggableColumn && (
          <GripVertical size={14} className="shrink-0 text-slate-400 opacity-60 hover:opacity-100 -ml-1" />
        )}
        <span className={`h-2 w-2 shrink-0 rounded-full ${theme.dot}`} />
        <span title={status} className={`min-w-0 flex-1 break-words text-sm font-semibold ${theme.text}`}>{status}</span>
        <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 px-1 text-xs font-medium text-slate-600">
          {tasks.length}
        </span>
      </div>

      {/* Task list */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 px-2.5 pb-2.5">
        {tasks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 text-xs text-slate-400 font-medium transition-colors">
            {isTaskOverTarget ? "Drop task here" : "Drop tasks here"}
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isDragging={draggedTaskId === task.id}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onReassign={onReassignTask}
              onSelectTask={onSelectTask}
            />
          ))
        )}
      </div>

      {/* Add task button */}
      {isLeader && onAddTask ? <button
        type="button"
        onClick={onAddTask}
        className="mx-3 mb-3 flex min-h-11 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
      >
        <Plus size={13} />
        Add task
      </button> : null}
    </div>
  );
}

