"use client";

import {
  Calendar,
  ChevronLeft,
  Columns3,
  Filter,
  LayoutGrid,
  Plus,
  Rows,
  Search,
  SlidersHorizontal,
  Table,
  Users
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Event, Task, TaskStatus } from "./types";
import { KanbanColumn } from "./KanbanColumn";
import { TaskGridView } from "./TaskGridView";
import { TaskTableView } from "./TaskTableView";
import { TaskExpandedView } from "./TaskExpandedView";
import { TaskCalendarView } from "./TaskCalendarView";

import { useAuthStore } from "@/store/authStore";
import { updateEventFirestore } from "@/services/events.service";

import { AddTaskModal } from "./AddTaskModal";

const STATUSES: TaskStatus[] = ["To Do", "In Progress", "In Review", "Completed"];

type ViewMode = "grid" | "table" | "expanded" | "kanban" | "calendar";

const TASK_FILTERS: { label: string; key: TaskStatus | "All" }[] = [
  { label: "All Tasks", key: "All" },
  { label: "To Do", key: "To Do" },
  { label: "In Progress", key: "In Progress" },
  { label: "In Review", key: "In Review" },
  { label: "Completed", key: "Completed" }
];

const TASK_STATUS_DOT: Record<TaskStatus, string> = {
  "To Do":       "bg-slate-400",
  "In Progress": "bg-blue-500",
  "In Review":   "bg-purple-500",
  "Completed":   "bg-emerald-500"
};

const VIEW_MODES: { mode: ViewMode; title: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { mode: "grid",     title: "Grid View",       icon: LayoutGrid },
  { mode: "table",    title: "Table View",      icon: Table },
  { mode: "expanded", title: "Expanded View",   icon: Rows },
  { mode: "kanban",   title: "Kanban Columns",  icon: Columns3 },
  { mode: "calendar", title: "Calendar View",  icon: Calendar }
];

type KanbanBoardProps = {
  event: Event;
  onBack: () => void;
  committees?: { id: string; name: string }[];
};

export function KanbanBoard({ event, onBack, committees = [] }: KanbanBoardProps) {
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const [tasks, setTasks] = useState<Task[]>(event.tasks || []);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "All">("All");
  const [selectedCommittee, setSelectedCommittee] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // AddTaskModal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultStatus, setModalDefaultStatus] = useState<TaskStatus>("To Do");

  // Keep internal tasks in sync when event prop changes
  useEffect(() => {
    setTasks(event.tasks || []);
  }, [event.tasks]);

  const fetchedNames = committees.map((c) => c.name);
  const taskNames = tasks.map((t) => t.committee).filter((c): c is string => Boolean(c));
  const allCommitteeNames = Array.from(
    new Set([...fetchedNames, ...taskNames, ...(event.committee ? [event.committee] : [])])
  );

  const visibleTasks = tasks.filter((t) => {
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    const matchesSearch = (t.title || "").toLowerCase().includes(search.toLowerCase()) ||
                          (t.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesCommittee =
      selectedCommittee === "All" ||
      (t.committee || event.committee || "").toLowerCase() === selectedCommittee.toLowerCase();
    return matchesStatus && matchesSearch && matchesCommittee;
  });

  function getColumnTasks(status: TaskStatus) {
    return visibleTasks.filter((t) => t.status === status);
  }

  function handleUpdateTaskStatus(taskId: string, targetStatus: TaskStatus) {
    const updatedTasks = tasks.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t));
    setTasks(updatedTasks);

    const completed = updatedTasks.filter((t) => t.status === "Completed").length;
    const newProgress = updatedTasks.length > 0 ? Math.round((completed / updatedTasks.length) * 100) : 0;

    void updateEventFirestore(firebaseUser, event.id, {
      tasks: updatedTasks,
      progress: newProgress
    });
  }

  function handleDrop(targetStatus: TaskStatus) {
    if (!draggedId) return;
    handleUpdateTaskStatus(draggedId, targetStatus);
    setDraggedId(null);
  }

  function handleOpenAddTask(status?: TaskStatus) {
    setModalDefaultStatus(status || "To Do");
    setIsModalOpen(true);
  }

  function handleTaskAdded(newTask: Task) {
    setTasks((prev) => [...prev, newTask]);
  }

  const completedCount = tasks.filter((t) => t.status === "Completed").length;

  return (
    <div className="flex h-full flex-col">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-1.5 text-sm text-slate-500">
        <button type="button" onClick={onBack} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
          <ChevronLeft size={15} />
          Events
        </button>
        <span>/</span>
        <span className="font-medium text-slate-800">{event.title}</span>
      </div>

      {/* Event header card */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">{event.title}</h1>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600 ring-1 ring-blue-200">
                {event.status}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Calendar size={12} />
                {event.startDate} – {event.endDate}
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={12} />
                {event.memberCount} members
              </span>
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                {tasks.length} tasks
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-900">
              {tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : event.progress}%
            </p>
            <p className="text-xs text-slate-500">complete</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
            style={{ width: `${tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : event.progress}%` }}
          />
        </div>
      </div>

      {/* Filter bar & View toggles (matching EventsDashboard styling 1-to-1) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Committee filter */}
          <div className="relative flex items-center">
            <SlidersHorizontal size={12} className="pointer-events-none absolute left-3.5 text-slate-400" />
            <select
              value={selectedCommittee}
              onChange={(e) => setSelectedCommittee(e.target.value)}
              className="h-8 rounded-xl bg-white pl-8 pr-3 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 outline-none hover:bg-slate-50 focus:ring-2 focus:ring-blue-400 cursor-pointer"
            >
              <option value="All">All Committees</option>
              {allCommitteeNames.map((commName) => (
                <option key={commName} value={commName}>
                  {commName}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter pills */}
          <div className="flex flex-wrap items-center gap-1">
            {TASK_FILTERS.map(({ label, key }) => {
              const count = key === "All" ? tasks.length : tasks.filter((t) => t.status === key).length;
              const isActive = statusFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-slate-900 text-white shadow"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {key !== "All" && (
                    <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-white/70" : TASK_STATUS_DOT[key as TaskStatus]}`} />
                  )}
                  {label}
                  <span className={`${isActive ? "text-white/70" : "text-slate-400"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right side: Search, 5 View mode icon buttons & Add task */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="h-8 rounded-xl bg-white pl-8 pr-3 text-xs text-slate-700 shadow-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* 5 View Mode Icon Buttons (Identical to Events Dashboard) */}
          <div className="flex items-center gap-0.5 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
            {VIEW_MODES.map(({ mode, title, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                title={title}
                onClick={() => setViewMode(mode)}
                className={`rounded-lg p-2 transition-all ${
                  viewMode === mode
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleOpenAddTask("To Do")}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-700 transition-colors"
          >
            <Plus size={14} />
            Add Task
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {viewMode === "grid" && (
          <TaskGridView
            tasks={visibleTasks}
            onUpdateStatus={handleUpdateTaskStatus}
          />
        )}

        {viewMode === "table" && (
          <TaskTableView
            tasks={visibleTasks}
            onUpdateStatus={handleUpdateTaskStatus}
          />
        )}

        {viewMode === "expanded" && (
          <TaskExpandedView
            tasks={visibleTasks}
            onUpdateStatus={handleUpdateTaskStatus}
          />
        )}

        {viewMode === "kanban" && (
          <div className="flex h-full gap-4 overflow-x-auto pb-4">
            {STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={getColumnTasks(status)}
                onAddTask={() => handleOpenAddTask(status)}
                onDragStart={(id) => setDraggedId(id)}
                onDrop={handleDrop}
              />
            ))}

            {/* + New Status column */}
            <div className="flex min-w-[64px] flex-col items-center justify-start pt-12">
              <button
                type="button"
                className="flex flex-col items-center gap-1 rounded-xl p-4 text-slate-400 transition-colors hover:bg-white hover:text-slate-600 hover:shadow-sm"
              >
                <Plus size={18} />
                <span className="text-[10px] font-medium">New<br />Status</span>
              </button>
            </div>
          </div>
        )}

        {viewMode === "calendar" && (
          <TaskCalendarView
            tasks={visibleTasks}
            onUpdateStatus={handleUpdateTaskStatus}
            onAddTask={() => handleOpenAddTask("To Do")}
          />
        )}
      </div>

      {/* Completion summary footer */}
      <p className="mt-3 text-center text-xs text-slate-400">
        {completedCount} of {tasks.length} tasks completed
      </p>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        eventId={event.id}
        events={[event]}
        defaultStatus={modalDefaultStatus}
        onTaskAdded={handleTaskAdded}
      />
    </div>
  );
}
