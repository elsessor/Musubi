"use client";

import {
  AlertOctagon,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Columns3,
  Filter,
  GripVertical,
  LayoutGrid,
  Plus,
  RotateCcw,
  Rows,
  Search,
  SlidersHorizontal,
  Table,
  Trash2,
  Users,
  XCircle
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Event, EventStatus, Task, TaskPriority, TaskStatus } from "./types";
import type { OrganizationMember } from "@/services/auth.service";
import { AddTaskModal, mapOrgMemberToItem, type OrgMemberItem } from "./AddTaskModal";
import { AddCustomStatusModal } from "./AddCustomStatusModal";
import { EventStatusModal } from "./EventStatusModal";
import { KanbanColumn } from "./KanbanColumn";
import { ReassignTaskModal } from "./ReassignTaskModal";
import { TaskDetailModal } from "./TaskDetailModal";
import { TaskGridView } from "./TaskGridView";
import { TaskTableView } from "./TaskTableView";
import { TaskExpandedView } from "./TaskExpandedView";
import { TaskCalendarView } from "./TaskCalendarView";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

import { useAuthStore } from "@/store/authStore";
import { updateEventFirestore } from "@/services/events.service";
import { getStatusTheme, type CustomStatusConfig, type StatusThemeColor } from "./statusUtils";

const DEFAULT_STATUSES: TaskStatus[] = ["To Do", "In Progress", "In Review", "Completed"];

type ViewMode = "grid" | "table" | "expanded" | "kanban" | "calendar";

const VIEW_MODES: { mode: ViewMode; title: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { mode: "grid", title: "Grid View", icon: LayoutGrid },
  { mode: "table", title: "Table View", icon: Table },
  { mode: "expanded", title: "Expanded View", icon: Rows },
  { mode: "kanban", title: "Kanban Columns", icon: Columns3 },
  { mode: "calendar", title: "Calendar View", icon: Calendar }
];

type KanbanBoardProps = {
  event: Event;
  members?: OrganizationMember[];
  onBack: () => void;
  onUpdateEvent?: (updatedEvent: Event) => void;
  onDeleteEvent?: () => void | Promise<void>;
  committees?: { id: string; name: string }[];
  isLeader?: boolean;
};

export function KanbanBoard({
  event,
  onBack,
  onUpdateEvent,
  onDeleteEvent,
  committees = [],
  members = [],
  isLeader = true
}: KanbanBoardProps) {
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const [currentEvent, setCurrentEvent] = useState<Event>(event);
  const [tasks, setTasks] = useState<Task[]>(event.tasks || []);

  const realRoster = Array.isArray(members) && members.length > 0 ? members.map(mapOrgMemberToItem) : undefined;
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "All">("All");
  const [selectedCommittee, setSelectedCommittee] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Modals state
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [reassignTaskTarget, setReassignTaskTarget] = useState<Task | null>(null);
  const [statusModalTarget, setStatusModalTarget] = useState<"Completed" | "Cancelled" | null>(null);
  const [selectedDetailTask, setSelectedDetailTask] = useState<Task | null>(null);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);

  // Custom task statuses state & localStorage (scoped per event)
  const [customStatuses, setCustomStatuses] = useState<CustomStatusConfig[]>([]);
  const [isAddStatusModalOpen, setIsAddStatusModalOpen] = useState(false);
  const [draggedStatusPill, setDraggedStatusPill] = useState<string | null>(null);
  const [dragOverStatusPill, setDragOverStatusPill] = useState<string | null>(null);

  const [statusOrder, setStatusOrder] = useState<string[]>(DEFAULT_STATUSES);

  // Sync state if event prop changes
  useEffect(() => {
    setCurrentEvent(event);
    setTasks(event.tasks || []);

    const loadedCustom = Array.isArray(event.customStatuses) && event.customStatuses.length > 0
      ? event.customStatuses
      : (() => {
          try {
            const saved = localStorage.getItem(`musubi_custom_task_statuses_${event.id}`);
            return saved ? JSON.parse(saved) : [];
          } catch {
            return [];
          }
        })();
    setCustomStatuses(loadedCustom);

    const loadedOrder = Array.isArray(event.statusOrder) && event.statusOrder.length > 0
      ? event.statusOrder
      : (() => {
          try {
            const saved = localStorage.getItem(`musubi_task_status_order_${event.id}`);
            return saved ? JSON.parse(saved) : DEFAULT_STATUSES;
          } catch {
            return DEFAULT_STATUSES;
          }
        })();
    setStatusOrder(loadedOrder);
  }, [event]);

  // Synchronize statusOrder with customStatuses and defaultStatuses
  useEffect(() => {
    setStatusOrder((prev) => {
      const existing = new Set(prev);
      const missingDefaults = DEFAULT_STATUSES.filter((st) => !existing.has(st));
      const missingCustom = customStatuses.filter((cs) => !existing.has(cs.name)).map((cs) => cs.name);
      const validCustomNames = new Set(customStatuses.map((cs) => cs.name));
      const filtered = prev.filter(
        (st) => DEFAULT_STATUSES.includes(st as TaskStatus) || validCustomNames.has(st)
      );

      if (missingDefaults.length === 0 && missingCustom.length === 0 && filtered.length === prev.length) {
        return prev;
      }
      const updated = [...filtered, ...missingDefaults, ...missingCustom];
      try {
        if (currentEvent?.id) {
          localStorage.setItem(`musubi_task_status_order_${currentEvent.id}`, JSON.stringify(updated));
        }
      } catch {}
      return updated;
    });
  }, [customStatuses, currentEvent?.id]);

  function handleReorderStatusOrder(newOrder: string[]) {
    setStatusOrder(newOrder);
    try {
      if (currentEvent?.id) {
        localStorage.setItem(`musubi_task_status_order_${currentEvent.id}`, JSON.stringify(newOrder));
      }
    } catch {}
    const updatedEvent = { ...currentEvent, statusOrder: newOrder };
    setCurrentEvent(updatedEvent);
    if (onUpdateEvent) onUpdateEvent(updatedEvent);
    void updateEventFirestore(firebaseUser, currentEvent.id, { statusOrder: newOrder }).catch((err) => {
      console.error("Failed to update status order in Firestore:", err);
    });
  }

  function handleAddCustomStatus(statusName: string, color: StatusThemeColor, insertIndex?: number) {
    if (
      customStatuses.some((cs) => cs.name.toLowerCase() === statusName.toLowerCase()) ||
      DEFAULT_STATUSES.some((ds) => ds.toLowerCase() === statusName.toLowerCase())
    ) {
      return;
    }
    const updated = [...customStatuses, { name: statusName, color }];
    setCustomStatuses(updated);
    const updatedOrder = [...statusOrder];
    const idx = typeof insertIndex === "number" ? insertIndex : updatedOrder.length;
    updatedOrder.splice(idx, 0, statusName);
    setStatusOrder(updatedOrder);
    try {
      if (currentEvent?.id) {
        localStorage.setItem(`musubi_custom_task_statuses_${currentEvent.id}`, JSON.stringify(updated));
        localStorage.setItem(`musubi_task_status_order_${currentEvent.id}`, JSON.stringify(updatedOrder));
      }
    } catch {}

    const updatedEvent = { ...currentEvent, customStatuses: updated, statusOrder: updatedOrder };
    setCurrentEvent(updatedEvent);
    if (onUpdateEvent) onUpdateEvent(updatedEvent);
    void updateEventFirestore(firebaseUser, currentEvent.id, { customStatuses: updated, statusOrder: updatedOrder }).catch((err) => {
      console.error("Failed to update custom statuses in Firestore:", err);
    });
  }

  function handleDeleteCustomStatus(statusName: string) {
    const updated = customStatuses.filter((cs) => cs.name.toLowerCase() !== statusName.toLowerCase());
    const updatedOrder = statusOrder.filter((st) => st.toLowerCase() !== statusName.toLowerCase());
    setCustomStatuses(updated);
    setStatusOrder(updatedOrder);
    try {
      if (currentEvent?.id) {
        localStorage.setItem(`musubi_custom_task_statuses_${currentEvent.id}`, JSON.stringify(updated));
        localStorage.setItem(`musubi_task_status_order_${currentEvent.id}`, JSON.stringify(updatedOrder));
      }
    } catch {}
    if (statusFilter === statusName) {
      setStatusFilter("All");
    }

    const updatedEvent = { ...currentEvent, customStatuses: updated, statusOrder: updatedOrder };
    setCurrentEvent(updatedEvent);
    if (onUpdateEvent) onUpdateEvent(updatedEvent);
    void updateEventFirestore(firebaseUser, currentEvent.id, { customStatuses: updated, statusOrder: updatedOrder }).catch((err) => {
      console.error("Failed to update custom statuses in Firestore:", err);
    });
  }

  function handleDropStatusPill(targetStatusName: string) {
    if (!draggedStatusPill || draggedStatusPill === targetStatusName) {
      setDraggedStatusPill(null);
      setDragOverStatusPill(null);
      return;
    }
    const fromIdx = statusOrder.indexOf(draggedStatusPill);
    const toIdx = statusOrder.indexOf(targetStatusName);
    if (fromIdx !== -1 && toIdx !== -1) {
      const updated = [...statusOrder];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      handleReorderStatusOrder(updated);
    }
    setDraggedStatusPill(null);
    setDragOverStatusPill(null);
  }

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

  function handleUpdateTaskStatus(taskId: string, targetStatus: TaskStatus) {
    const updatedTasks = tasks.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t));
    syncEvent(updatedTasks);
  }

  function handleUpdateTaskPriority(taskId: string, newPriority: TaskPriority) {
    const updatedTasks = tasks.map((t) => (t.id === taskId ? { ...t, priority: newPriority } : t));
    syncEvent(updatedTasks);
  }

  function handleUpdateTask(updatedTask: Task) {
    const updatedTasks = tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    syncEvent(updatedTasks);
    setSelectedDetailTask(null);
  }

  function handleDeleteTask(taskId: string) {
    const updatedTasks = tasks.filter((task) => task.id !== taskId);
    const updatedProgress = updatedTasks.length
      ? Math.round((updatedTasks.filter((task) => task.status === "Completed").length / updatedTasks.length) * 100)
      : 0;
    syncEvent(updatedTasks, undefined, updatedProgress);
    setSelectedDetailTask(null);
  }

  function handleDrop(targetStatus: TaskStatus) {
    if (!draggedId) return;
    handleUpdateTaskStatus(draggedId, targetStatus);
    setDraggedId(null);
  }

  const fetchedNames = committees.map((c) => c.name);
  const taskNames = tasks.map((t) => (t as any).committee).filter((c): c is string => Boolean(c));
  const allCommitteeNames = Array.from(
    new Set([...fetchedNames, ...taskNames, ...(currentEvent.committee ? [currentEvent.committee] : [])])
  );

  const allStatuses: TaskStatus[] = statusOrder as TaskStatus[];

  const allTaskFilters: { label: string; key: TaskStatus | "All" }[] = [
    { label: "All Tasks", key: "All" },
    ...statusOrder.map((st) => ({ label: st, key: st as TaskStatus }))
  ];

  const visibleTasks = tasks.filter((t) => {
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    const matchesSearch =
      (t.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesCommittee =
      selectedCommittee === "All" ||
      ((t as any).committee || currentEvent.committee || "").toLowerCase() === selectedCommittee.toLowerCase();
    return matchesStatus && matchesSearch && matchesCommittee;
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
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-slate-700 hover:text-blue-600 font-bold transition-colors"
          >
            <ChevronLeft size={16} />
            Events &amp; Tasks
          </button>
          <span>/</span>
          <span className="font-extrabold text-slate-900">{currentEvent.title}</span>
        </div>

        {/* Event Lifecycle Header Buttons */}
        <div className="flex items-center gap-2">
          {isLeader && onDeleteEvent && (
            <button
              type="button"
              onClick={() => setConfirmDeleteEvent(true)}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
            >
              <Trash2 size={14} /> Delete Event
            </button>
          )}
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
              <span
                className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-extrabold ${
                  currentEvent.status === "Completed"
                    ? "bg-emerald-100 text-emerald-800"
                    : currentEvent.status === "Cancelled"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                }`}
              >
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
              const isPillDraggable = isLeader && key !== "All";
              const isDraggingThis = draggedStatusPill === key;
              const isDragOverThis = dragOverStatusPill === key;

              return (
                <button
                  key={key}
                  type="button"
                  draggable={isPillDraggable}
                  onDragStart={(e) => {
                    if (!isPillDraggable) return;
                    e.dataTransfer.setData("text/plain", key);
                    setDraggedStatusPill(key);
                  }}
                  onDragOver={(e) => {
                    if (!isLeader) return;
                    e.preventDefault();
                    if (draggedStatusPill && draggedStatusPill !== key && key !== "All") {
                      setDragOverStatusPill(key);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverStatusPill === key) setDragOverStatusPill(null);
                  }}
                  onDrop={(e) => {
                    if (!isPillDraggable) return;
                    e.preventDefault();
                    handleDropStatusPill(key);
                  }}
                  onDragEnd={() => {
                    setDraggedStatusPill(null);
                    setDragOverStatusPill(null);
                  }}
                  onClick={() => setStatusFilter(key)}
                  title={isPillDraggable ? "Drag to rearrange status order" : undefined}
                  className={`group flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? key === "All" ? "bg-slate-900 text-white shadow" : `${theme.active} shadow-sm`
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  } ${isPillDraggable ? "cursor-grab active:cursor-grabbing" : ""} ${
                    isDraggingThis ? "opacity-30 scale-95 border-dashed border-blue-400" : ""
                  } ${isDragOverThis ? "ring-2 ring-blue-500 scale-105 bg-blue-50/80" : ""}`}
                >
                  {isPillDraggable && (
                    <GripVertical size={11} className="-ml-1 text-slate-300 transition-opacity group-hover:text-slate-500" />
                  )}
                  {key !== "All" && (
                    <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-white" : theme.dot}`} />
                  )}
                  {label}
                  <span className={`${isActive ? "text-white/80" : "text-slate-400"}`}>{count}</span>
                </button>
              );
            })}

            {/* + Add Custom Status Button for Leaders */}
            {isLeader && (
              <button
                type="button"
                onClick={() => setIsAddStatusModalOpen(true)}
                className="flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
                title="Add or rearrange custom task statuses"
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
            onClick={() => setShowAddTaskModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
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
            onUpdatePriority={handleUpdateTaskPriority}
            onSelectTask={(task) => setSelectedDetailTask(task)}
            customStatuses={customStatuses}
          />
        )}

        {viewMode === "table" && (
          <TaskTableView
            tasks={visibleTasks}
            onUpdateStatus={handleUpdateTaskStatus}
            onUpdatePriority={handleUpdateTaskPriority}
            onSelectTask={(task) => setSelectedDetailTask(task)}
            customStatuses={customStatuses}
          />
        )}

        {viewMode === "expanded" && (
          <TaskExpandedView
            tasks={visibleTasks}
            onUpdateStatus={handleUpdateTaskStatus}
            onUpdatePriority={handleUpdateTaskPriority}
            onSelectTask={(task) => setSelectedDetailTask(task)}
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
                onAddTask={() => setShowAddTaskModal(true)}
                onDragStart={(id) => setDraggedId(id)}
                onDrop={handleDrop}
                onReassignTask={(t) => setReassignTaskTarget(t)}
                onSelectTask={(task) => setSelectedDetailTask(task)}
                onUpdatePriority={handleUpdateTaskPriority}
                customStatuses={customStatuses}
                isLeader={isLeader}
                onColumnDragStart={(st) => setDraggedStatusPill(st)}
                onColumnDragOver={(e, st) => {
                  e.preventDefault();
                  if (draggedStatusPill && draggedStatusPill !== st) {
                    setDragOverStatusPill(st);
                  }
                }}
                onColumnDrop={(st) => handleDropStatusPill(st)}
                isColumnDragging={draggedStatusPill === status}
                isColumnDragOver={dragOverStatusPill === status}
                draggedStatusPill={draggedStatusPill}
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
            onUpdatePriority={handleUpdateTaskPriority}
            onSelectTask={(task) => setSelectedDetailTask(task)}
            onAddTask={() => setShowAddTaskModal(true)}
            customStatuses={customStatuses}
          />
        )}
      </div>

      {/* Completion summary footer */}
      <p className="mt-2 text-center text-xs font-semibold text-slate-500">
        {completedCount} of {tasks.length} tasks completed ({currentEvent.progress}% overall)
      </p>

      {/* Task Detail Modal */}
      {selectedDetailTask && (
        <TaskDetailModal
          task={selectedDetailTask}
          onClose={() => setSelectedDetailTask(null)}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          customStatuses={customStatuses}
          committees={committees}
          roster={realRoster}
        />
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <AddTaskModal
          eventName={currentEvent.title}
          members={members}
          onClose={() => setShowAddTaskModal(false)}
          onAddTask={handleAddTask}
          committees={committees}
          customStatuses={customStatuses}
          roster={realRoster}
        />
      )}

      {/* Reassign Task Modal */}
      {reassignTaskTarget && (
        <ReassignTaskModal
          task={reassignTaskTarget}
          members={members}
          onClose={() => setReassignTaskTarget(null)}
          onConfirmReassign={handleReassignConfirm}
          roster={realRoster}
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

      {/* Add & Manage Custom Task Status Modal */}
      <AddCustomStatusModal
        isOpen={isAddStatusModalOpen}
        onClose={() => setIsAddStatusModalOpen(false)}
        type="task"
        customStatuses={customStatuses}
        statusOrder={statusOrder}
        defaultStatuses={DEFAULT_STATUSES}
        onAddStatus={handleAddCustomStatus}
        onReorderStatusOrder={handleReorderStatusOrder}
        onDeleteStatus={handleDeleteCustomStatus}
      />

      {confirmDeleteEvent && onDeleteEvent && (
        <ConfirmDeleteModal
          itemType="event"
          itemName={currentEvent.title}
          isDeleting={isDeletingEvent}
          onCancel={() => setConfirmDeleteEvent(false)}
          onConfirm={async () => {
            setIsDeletingEvent(true);
            try {
              await onDeleteEvent();
              setConfirmDeleteEvent(false);
            } catch (error) {
              console.error("Failed to delete event:", error);
            } finally {
              setIsDeletingEvent(false);
            }
          }}
        />
      )}
    </div>
  );
}
