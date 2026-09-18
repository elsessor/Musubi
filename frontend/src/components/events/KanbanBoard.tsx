"use client";

import {
<<<<<<< HEAD
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
=======
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
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322

import { useAuthStore } from "@/store/authStore";
import { updateEventFirestore } from "@/services/events.service";

<<<<<<< HEAD
const STATUSES: TaskStatus[] = ["To Do", "In Progress", "In Review", "Completed"];
=======
import { AddTaskModal } from "./AddTaskModal";
import { AddCustomStatusModal } from "./AddCustomStatusModal";
import { getStatusTheme, type CustomStatusConfig, type StatusThemeColor } from "./statusUtils";

const DEFAULT_STATUSES: TaskStatus[] = ["To Do", "In Progress", "In Review", "Completed"];

type ViewMode = "grid" | "table" | "expanded" | "kanban" | "calendar";

const DEFAULT_TASK_FILTERS: { label: string; key: TaskStatus | "All" }[] = [
  { label: "All Tasks", key: "All" },
  { label: "To Do", key: "To Do" },
  { label: "In Progress", key: "In Progress" },
  { label: "In Review", key: "In Review" },
  { label: "Completed", key: "Completed" }
];

const VIEW_MODES: { mode: ViewMode; title: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { mode: "grid", title: "Grid View", icon: LayoutGrid },
  { mode: "table", title: "Table View", icon: Table },
  { mode: "expanded", title: "Expanded View", icon: Rows },
  { mode: "kanban", title: "Kanban Columns", icon: Columns3 },
  { mode: "calendar", title: "Calendar View", icon: Calendar }
];
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322

type KanbanBoardProps = {
  event: Event;
  onBack: () => void;
<<<<<<< HEAD
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
=======
  committees?: { id: string; name: string }[];
  isLeader?: boolean;
};

export function KanbanBoard({ event, onBack, committees = [], isLeader = true }: KanbanBoardProps) {
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const [tasks, setTasks] = useState<Task[]>(event.tasks || []);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "All">("All");
  const [selectedCommittee, setSelectedCommittee] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Custom task statuses state & localStorage
  const [customStatuses, setCustomStatuses] = useState<CustomStatusConfig[]>([]);
  const [isAddStatusModalOpen, setIsAddStatusModalOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("musubi_custom_task_statuses");
      if (saved) {
        setCustomStatuses(JSON.parse(saved));
      }
    } catch {}
  }, []);

  function handleAddCustomStatus(statusName: string, color: StatusThemeColor) {
    if (customStatuses.some((cs) => cs.name.toLowerCase() === statusName.toLowerCase())) {
      return;
    }
    const updated = [...customStatuses, { name: statusName, color }];
    setCustomStatuses(updated);
    try {
      localStorage.setItem("musubi_custom_task_statuses", JSON.stringify(updated));
    } catch {}
  }

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

  const allStatuses: TaskStatus[] = [
    ...DEFAULT_STATUSES,
    ...customStatuses.map((cs) => cs.name as TaskStatus)
  ];

  const allTaskFilters: { label: string; key: TaskStatus | "All" }[] = [
    ...DEFAULT_TASK_FILTERS,
    ...customStatuses.map((cs) => ({ label: cs.name, key: cs.name as TaskStatus }))
  ];

  const visibleTasks = tasks.filter((t) => {
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    const matchesSearch = (t.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesCommittee =
      selectedCommittee === "All" ||
      (t.committee || event.committee || "").toLowerCase() === selectedCommittee.toLowerCase();
    return matchesStatus && matchesSearch && matchesCommittee;
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
  });

  function getColumnTasks(status: TaskStatus) {
    return visibleTasks.filter((t) => t.status === status);
  }

<<<<<<< HEAD
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
=======
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
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">
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
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
          />
        </div>
      </div>

<<<<<<< HEAD
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
=======
      {/* Filter bar & View toggles */}
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
            {allTaskFilters.map(({ label, key }) => {
              const count = key === "All" ? tasks.length : tasks.filter((t) => t.status === key).length;
              const isActive = statusFilter === key;
              const theme = getStatusTheme(key, customStatuses);
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
                    <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-white/70" : theme.dot}`} />
                  )}
                  {label}
                  <span className={`${isActive ? "text-white/70" : "text-slate-400"}`}>{count}</span>
                </button>
              );
            })}

            {/* + Add Custom Status Button for Leaders */}
            {isLeader && (
              <button
                type="button"
                onClick={() => setIsAddStatusModalOpen(true)}
                className="flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
                title="Add Custom Task Status"
              >
                <Plus size={13} />
                <span>Custom Status</span>
              </button>
            )}
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

          {/* 5 View Mode Icon Buttons */}
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
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
          </button>
        </div>
      </div>

<<<<<<< HEAD
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
=======
      {/* Main View Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {viewMode === "grid" && (
          <TaskGridView
            tasks={visibleTasks}
            onUpdateStatus={handleUpdateTaskStatus}
            customStatuses={customStatuses}
          />
        )}

        {viewMode === "table" && (
          <TaskTableView
            tasks={visibleTasks}
            onUpdateStatus={handleUpdateTaskStatus}
            customStatuses={customStatuses}
          />
        )}

        {viewMode === "expanded" && (
          <TaskExpandedView
            tasks={visibleTasks}
            onUpdateStatus={handleUpdateTaskStatus}
            customStatuses={customStatuses}
          />
        )}

        {viewMode === "kanban" && (
          <div className="flex h-full gap-4 overflow-x-auto pb-4">
            {allStatuses.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={getColumnTasks(status)}
                onAddTask={() => handleOpenAddTask(status)}
                onDragStart={(id) => setDraggedId(id)}
                onDrop={handleDrop}
                customStatuses={customStatuses}
              />
            ))}

            {/* + New Status column button */}
            {isLeader && (
              <div className="flex min-w-[64px] flex-col items-center justify-start pt-12">
                <button
                  type="button"
                  onClick={() => setIsAddStatusModalOpen(true)}
                  className="flex flex-col items-center gap-1 rounded-xl p-4 text-slate-400 transition-colors hover:bg-white hover:text-slate-600 hover:shadow-sm"
                  title="Add Custom Task Status"
                >
                  <Plus size={18} />
                  <span className="text-[10px] font-medium text-center">New<br />Status</span>
                </button>
              </div>
            )}
          </div>
        )}

        {viewMode === "calendar" && (
          <TaskCalendarView
            tasks={visibleTasks}
            onUpdateStatus={handleUpdateTaskStatus}
            onAddTask={() => handleOpenAddTask("To Do")}
            customStatuses={customStatuses}
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
        customStatuses={customStatuses}
      />

      {/* Add Custom Task Status Modal */}
      <AddCustomStatusModal
        isOpen={isAddStatusModalOpen}
        onClose={() => setIsAddStatusModalOpen(false)}
        type="task"
        onAddStatus={handleAddCustomStatus}
      />
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
    </div>
  );
}
