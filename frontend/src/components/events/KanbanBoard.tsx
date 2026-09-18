"use client";

import {
  AlertOctagon,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Filter,
  LayoutGrid,
  Plus,
  RotateCcw,
  Search,
  Users,
  XCircle
} from "lucide-react";
import { useState } from "react";
import { AddTaskModal } from "./AddTaskModal";
import { EventStatusModal } from "./EventStatusModal";
import { KanbanColumn } from "./KanbanColumn";
import { ReassignTaskModal } from "./ReassignTaskModal";
import type { Event, EventStatus, Task, TaskStatus } from "./types";
import type { OrgMemberItem } from "./AddTaskModal";

import { useAuthStore } from "@/store/authStore";
import { updateEventFirestore } from "@/services/events.service";

const STATUSES: TaskStatus[] = ["To Do", "In Progress", "In Review", "Completed"];

type KanbanBoardProps = {
  event: Event;
  onBack: () => void;
  onUpdateEvent?: (updatedEvent: Event) => void;
};

export function KanbanBoard({ event, onBack, onUpdateEvent }: KanbanBoardProps) {
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const [currentEvent, setCurrentEvent] = useState<Event>(event);
  const [tasks, setTasks] = useState<Task[]>(event.tasks);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "All">("All");
  const [search, setSearch] = useState("");

  // Modals state
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [reassignTaskTarget, setReassignTaskTarget] = useState<Task | null>(null);
  const [statusModalTarget, setStatusModalTarget] = useState<"Completed" | "Cancelled" | null>(null);

  function syncEvent(updatedTasks: Task[], statusOverride?: EventStatus, progressOverride?: number) {
    const completedTasks = updatedTasks.filter((t) => t.status === "Completed").length;
    const computedProgress = updatedTasks.length > 0
      ? Math.round((completedTasks / updatedTasks.length) * 100)
      : currentEvent.progress;

    const finalStatus = statusOverride || currentEvent.status;
    const finalProgress = typeof progressOverride === "number" ? progressOverride : computedProgress;

    const updated: Event = {
      ...currentEvent,
      status: finalStatus,
      progress: finalProgress,
      tasks: updatedTasks
    };

    setCurrentEvent(updated);
    setTasks(updatedTasks);
    if (onUpdateEvent) {
      onUpdateEvent(updated);
    }
    void updateEventFirestore(firebaseUser, event.id, {
      status: finalStatus,
      progress: finalProgress,
      tasks: updatedTasks
    }).catch((error) => {
      console.error("Failed to update event:", error);
    });
  }

  function handleAddTask(newTask: Task) {
    const updatedTasks = [newTask, ...tasks];
    syncEvent(updatedTasks);
    setShowAddTaskModal(false);
  }

  function handleReassignConfirm(taskId: string, newAssignee: OrgMemberItem) {
    const updatedTasks = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            assignee: {
              initials: newAssignee.initials,
              color: newAssignee.color,
              name: newAssignee.name
            }
          }
        : t
    );
    syncEvent(updatedTasks);
    setReassignTaskTarget(null);
  }

  function handleEventStatusChange(targetStatus: EventStatus) {
    const isCompleted = targetStatus === "Completed";
    const updatedTasks = isCompleted
      ? tasks.map((t) => ({ ...t, status: "Completed" as TaskStatus }))
      : tasks;

    syncEvent(updatedTasks, targetStatus, isCompleted ? 100 : currentEvent.progress);
  }

  function handleDrop(targetStatus: TaskStatus) {
    if (!draggedId) return;
    const updatedTasks = tasks.map((t) => (t.id === draggedId ? { ...t, status: targetStatus } : t));
    syncEvent(updatedTasks);
    setDraggedId(null);
  }

  const visibleTasks = tasks.filter((t) => {
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  function getColumnTasks(status: TaskStatus) {
    return visibleTasks.filter((t) => t.status === status);
  }

  const completedCount = tasks.filter((t) => t.status === "Completed").length;

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-200">
      {/* Breadcrumb Navigation */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
          <button type="button" onClick={onBack} className="flex items-center gap-1 text-slate-700 hover:text-blue-600 font-bold transition-colors">
            <ChevronLeft size={16} />
            Events &amp; Tasks
          </button>
          <span>/</span>
          <span className="font-extrabold text-slate-900">{currentEvent.title}</span>
        </div>

        {/* Event Lifecycle Header Buttons */}
        <div className="flex items-center gap-2">
          {currentEvent.status !== "Completed" && (
            <button
              type="button"
              onClick={() => setStatusModalTarget("Completed")}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              <CheckCircle2 size={14} />
              Mark Completed
            </button>
          )}

          {currentEvent.status !== "Cancelled" && (
            <button
              type="button"
              onClick={() => setStatusModalTarget("Cancelled")}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
            >
              <XCircle size={14} />
              Mark Cancelled
            </button>
          )}

          {(currentEvent.status === "Completed" || currentEvent.status === "Cancelled") && (
            <button
              type="button"
              onClick={() => handleEventStatusChange("Active")}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <RotateCcw size={14} />
              Reopen Event
            </button>
          )}
        </div>
      </div>

      {/* Event Header Summary Card */}
      <div className="mb-4 rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{currentEvent.title}</h1>
              <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-extrabold ${
                currentEvent.status === "Completed"
                  ? "bg-emerald-100 text-emerald-800"
                  : currentEvent.status === "Cancelled"
                  ? "bg-rose-100 text-rose-800"
                  : "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
              }`}>
                {currentEvent.status}
              </span>
              {currentEvent.committee && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  {currentEvent.committee} Committee
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-slate-600 font-medium max-w-2xl">{currentEvent.description}</p>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" />
                {currentEvent.startDate} – {currentEvent.endDate}
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={13} className="text-slate-400" />
                {currentEvent.memberCount} members
              </span>
              <span className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-800">{tasks.length}</span> total tasks
              </span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-3xl font-black text-slate-900">{currentEvent.progress}%</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Progress</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${
              currentEvent.progress === 100
                ? "bg-emerald-500"
                : currentEvent.status === "Cancelled"
                ? "bg-rose-400"
                : "bg-gradient-to-r from-blue-600 to-indigo-500"
            }`}
            style={{ width: `${currentEvent.progress}%` }}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Status filter pills */}
        <div className="flex items-center gap-1 rounded-2xl bg-white p-1 shadow-xs ring-1 ring-slate-200">
          {(["All", ...STATUSES] as const).map((s) => {
            const count = s === "All" ? tasks.length : tasks.filter((t) => t.status === s).length;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  statusFilter === s
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {s} <span className="ml-0.5 opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="h-9 rounded-2xl bg-white pl-9 pr-3 text-xs text-slate-700 shadow-xs ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Right controls */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddTaskModal(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-2 text-xs font-extrabold text-white shadow-md hover:bg-blue-700 transition active:scale-95"
          >
            <Plus size={15} />
            + Add Task
          </button>
        </div>
      </div>

      {/* Kanban board — horizontal scroll */}
      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={getColumnTasks(status)}
            onAddTask={() => setShowAddTaskModal(true)}
            onDragStart={(id) => setDraggedId(id)}
            onDrop={handleDrop}
            onReassignTask={(t) => setReassignTaskTarget(t)}
          />
        ))}
      </div>

      {/* Completion summary footer */}
      <p className="mt-2 text-center text-xs font-semibold text-slate-500">
        {completedCount} of {tasks.length} tasks completed ({currentEvent.progress}% overall)
      </p>

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <AddTaskModal
          eventName={currentEvent.title}
          onClose={() => setShowAddTaskModal(false)}
          onAddTask={handleAddTask}
        />
      )}

      {/* Reassign Task Modal */}
      {reassignTaskTarget && (
        <ReassignTaskModal
          task={reassignTaskTarget}
          onClose={() => setReassignTaskTarget(null)}
          onConfirmReassign={handleReassignConfirm}
        />
      )}

      {/* Event Lifecycle Status Confirmation Modal */}
      {statusModalTarget && (
        <EventStatusModal
          eventTitle={currentEvent.title}
          targetStatus={statusModalTarget}
          onClose={() => setStatusModalTarget(null)}
          onConfirm={handleEventStatusChange}
        />
      )}
    </div>
  );
}
