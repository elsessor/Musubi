"use client";

import {
  AlertOctagon,
  Calendar,
  ChevronLeft,
  Columns3,
  Filter,
  GripVertical,
  Edit3,
  LayoutGrid,
  Plus,
  Rows,
  Search,
  SlidersHorizontal,
  Star,
  Table,
  Users
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Event, EventStatus, Task, TaskPriority, TaskStatus } from "./types";
import type { OrganizationMember } from "@/services/auth.service";
import { AddTaskModal, mapOrgMemberToItem, type OrgMemberItem } from "./AddTaskModal";
import { AddCustomStatusModal } from "./AddCustomStatusModal";
import { EditEventModal } from "./EditEventModal";
import { KanbanColumn } from "./KanbanColumn";
import { ReassignTaskModal } from "./ReassignTaskModal";
import { TaskDetailModal } from "./TaskDetailModal";
import { TaskGridView } from "./TaskGridView";
import { TaskTableView } from "./TaskTableView";
import { TaskExpandedView } from "./TaskExpandedView";
import { TaskCalendarView } from "./TaskCalendarView";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

import { canUpdateTaskStatus } from "@/utils/taskAssignment";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { updateEventFirestore, updateTaskStatus, rateTaskInEvent } from "@/services/events.service";
import { TaskRatingModal } from "./TaskRatingModal";
import { getStatusTheme, type CustomStatusConfig, type StatusThemeColor } from "./statusUtils";

const DEFAULT_STATUSES: TaskStatus[] = ["To Do", "In Progress", "In Review", "Completed"];

type ViewMode = "grid" | "table" | "expanded" | "kanban" | "calendar";

const VIEW_MODES: { mode: ViewMode; title: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { mode: "grid", title: "Grid View", icon: LayoutGrid },
  { mode: "table", title: "Table View", icon: Table },
  { mode: "expanded", title: "Expandable list", icon: Rows },
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
  const profile = useAuthStore((state) => state.profile);
  const showToast = useToastStore((state) => state.showToast);
  const [currentEvent, setCurrentEvent] = useState<Event>(event);
  const [tasks, setTasks] = useState<Task[]>(event.tasks || []);

  const realRoster = Array.isArray(members) && members.length > 0 ? members.map(mapOrgMemberToItem) : undefined;
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumnStatus, setDragOverColumnStatus] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "All">("All");
  const [selectedCommittee, setSelectedCommittee] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const mobileFiltersRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const dialog = mobileFiltersRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, [mobileFiltersOpen]);

  // Modals state
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [reassignTaskTarget, setReassignTaskTarget] = useState<Task | null>(null);
  const [selectedDetailTask, setSelectedDetailTask] = useState<Task | null>(null);
  const [ratingTaskTarget, setRatingTaskTarget] = useState<Task | null>(null);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [editEventModalOpen, setEditEventModalOpen] = useState(false);

  // Custom task statuses state & localStorage (scoped per event)
  const [customStatuses, setCustomStatuses] = useState<CustomStatusConfig[]>([]);
  const [isAddStatusModalOpen, setIsAddStatusModalOpen] = useState(false);
  const [draggedStatusPill, setDraggedStatusPill] = useState<string | null>(null);
  const [dragOverStatusPill, setDragOverStatusPill] = useState<string | null>(null);

  const [statusOrder, setStatusOrder] = useState<string[]>(DEFAULT_STATUSES);

  function canEditTask(task: Task) {
    return canUpdateTaskStatus(task, firebaseUser?.uid ?? profile?.uid, profile?.fullName || firebaseUser?.displayName || "", profile?.role);
  }

  // Sync state if event prop changes
  useEffect(() => {
    setCurrentEvent(event);
    setTasks(event.tasks || []);

    const loadedCustom = Array.isArray(event.customStatuses)
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
      const known = Array.from(new Set([...DEFAULT_STATUSES, ...customStatuses.map((status) => status.name), ...tasks.map((task) => task.status)]));
      const filtered = prev.filter((status) => known.includes(status));
      const updated = [...filtered, ...known.filter((status) => !filtered.includes(status))];
      if (updated.length === prev.length && updated.every((status, index) => status === prev[index])) return prev;
      try {
        if (currentEvent?.id) {
          localStorage.setItem(`musubi_task_status_order_${currentEvent.id}`, JSON.stringify(updated));
        }
      } catch {}
      return updated;
    });
  }, [customStatuses, currentEvent?.id, tasks]);

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

  function syncEvent(updatedTasks: Task[], statusOverride?: EventStatus, progressOverride?: number, successMessage?: { title: string; description: string }) {
    if (!isLeader) return;
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
    const update = isLeader
      ? { status: finalStatus, progress: finalProgress, tasks: updatedTasks }
      : { tasks: updatedTasks };
    void updateEventFirestore(firebaseUser, event.id, update).then(() => {
      showToast({ ...(successMessage || { title: "Changes saved", description: "Your changes have been saved successfully." }), tone: "success" });
    }).catch((error) => {
      console.error("Failed to update event:", error);
      setCurrentEvent(currentEvent);
      setTasks(tasks);
      onUpdateEvent?.(currentEvent);
      showToast({ title: "Changes not saved", description: error instanceof Error ? error.message : "Please try again.", tone: "error" });
    });
  }

  async function handleAddTask(newTask: Task) {
    if (!isLeader) return;
    const updatedTasks = [newTask, ...tasks];
    const completedTasks = updatedTasks.filter((task) => task.status === "Completed").length;
    const updatedProgress = updatedTasks.length ? Math.round((completedTasks / updatedTasks.length) * 100) : currentEvent.progress;
    const updatedEvent = { ...currentEvent, tasks: updatedTasks, progress: updatedProgress };
    try {
      await updateEventFirestore(firebaseUser, event.id, { tasks: updatedTasks, progress: updatedProgress });
      setCurrentEvent(updatedEvent);
      setTasks(updatedTasks);
      onUpdateEvent?.(updatedEvent);
      showToast({ title: "Task created", description: `${newTask.title} is ready to manage in ${currentEvent.title}.`, tone: "success" });
    } catch (error) {
      console.error("Failed to create task:", error);
      showToast({ title: "Task not saved", description: "We couldn’t save the task. Please try again.", tone: "error" });
      throw error;
    }
    setShowAddTaskModal(false);
  }

  function handleReassignConfirm(taskId: string, newAssignee: OrgMemberItem) {
    if (!isLeader) return;
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

  function handleUpdateTaskStatus(taskId: string, targetStatus: TaskStatus) {
    const target = tasks.find((task) => task.id === taskId);
    if (!target || !canEditTask(target)) return;
    const updatedTasks = tasks.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t));
    if (isLeader) {
      syncEvent(updatedTasks);
      if (targetStatus === "Completed" || targetStatus === "Done") {
        setRatingTaskTarget({ ...target, status: targetStatus });
      }
      return;
    }
    const completed = updatedTasks.filter((task) => task.status === "Completed" || task.status === "Done").length;
    const updatedEvent = { ...currentEvent, tasks: updatedTasks, progress: updatedTasks.length ? Math.round(completed / updatedTasks.length * 100) : 0 };
    setTasks(updatedTasks);
    setCurrentEvent(updatedEvent);
    onUpdateEvent?.(updatedEvent);
    void updateTaskStatus(firebaseUser, event.id, taskId, targetStatus).then((savedTask) => {
      handleSavedTask(savedTask);
      showToast({ title: "Status updated", description: "Your task status has been saved successfully.", tone: "success" });
    }).catch((error) => {
      setTasks(tasks);
      setCurrentEvent(currentEvent);
      onUpdateEvent?.(currentEvent);
      showToast({ title: "Status not saved", description: error instanceof Error ? error.message : "Please try again.", tone: "error" });
    });
  }

  async function handleRateTask(taskId: string, rating: number, feedback: string) {
    try {
      const updatedTask = await rateTaskInEvent(firebaseUser, currentEvent.id, taskId, rating, feedback);
      handleSavedTask(updatedTask);
      showToast({ title: "Rating saved", description: "Member performance rating recorded successfully.", tone: "success" });
    } catch (error) {
      showToast({ title: "Rating not saved", description: error instanceof Error ? error.message : "Please try again.", tone: "error" });
      throw error;
    }
  }

  function handleSavedTask(updatedTask: Task) {
    const updatedTasks = tasks.map((task) => task.id === updatedTask.id ? updatedTask : task);
    const completed = updatedTasks.filter((task) => task.status === "Completed" || task.status === "Done").length;
    const updatedEvent = { ...currentEvent, tasks: updatedTasks, progress: updatedTasks.length ? Math.round(completed / updatedTasks.length * 100) : 0 };
    setTasks(updatedTasks);
    setCurrentEvent(updatedEvent);
    setSelectedDetailTask((selected) => selected?.id === updatedTask.id ? updatedTask : selected);
    onUpdateEvent?.(updatedEvent);
  }

  function handleUpdateTaskPriority(taskId: string, newPriority: TaskPriority) {
    if (!isLeader) return;
    const target = tasks.find((task) => task.id === taskId);
    if (!target || !canEditTask(target)) return;
    const updatedTasks = tasks.map((task) => task.id === taskId
      ? { ...task, priority: newPriority, priorityChangeRequest: null }
      : task);
    syncEvent(updatedTasks);
  }

  function handleUpdateTask(updatedTask: Task) {
    const original = tasks.find((task) => task.id === updatedTask.id);
    if (!original || !canEditTask(original)) return;
    if (!isLeader) {
      handleUpdateTaskStatus(updatedTask.id, updatedTask.status);
      setSelectedDetailTask(null);
      return;
    }
    const updatedTasks = tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    syncEvent(updatedTasks);
    setSelectedDetailTask(null);
  }

  function handleDeleteTask(taskId: string) {
    if (!isLeader) return;
    const deletedTask = tasks.find((task) => task.id === taskId);
    if (!deletedTask) return;
    const updatedTasks = tasks.filter((task) => task.id !== taskId);
    const updatedProgress = updatedTasks.length
      ? Math.round((updatedTasks.filter((task) => task.status === "Completed").length / updatedTasks.length) * 100)
      : 0;
    syncEvent(updatedTasks, undefined, updatedProgress, { title: "Subtask deleted", description: `${deletedTask.title || "The subtask"} has been deleted successfully.` });
    setSelectedDetailTask(null);
  }

  function handleDrop(targetStatus: TaskStatus) {
    if (!draggedId) return;
    const draggedTask = tasks.find((task) => task.id === draggedId);
    if (!draggedTask || !canEditTask(draggedTask)) {
      setDraggedId(null);
      setDragOverColumnStatus(null);
      return;
    }
    handleUpdateTaskStatus(draggedId, targetStatus);
    setDraggedId(null);
    setDragOverColumnStatus(null);
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
    <div className="flex min-h-full min-w-0 flex-col animate-in fade-in duration-200">
      {/* Breadcrumb Navigation */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-slate-700 hover:text-blue-600 font-bold transition-colors"
          >
            <ChevronLeft size={16} />
            Events &amp; Tasks
          </button>
          <span>/</span>
          <span className="min-w-0 truncate font-semibold text-slate-900">{currentEvent.title}</span>
        </div>


      </div>

      {/* Leader Unrated Tasks Review Banner */}
      {isLeader && (() => {
        const unrated = tasks.filter((t) => (t.status === "Completed" || t.status === "Done") && !t.performanceReview?.rating);
        if (unrated.length === 0) return null;
        return (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 border border-amber-200/90 p-3 text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center gap-2 font-semibold">
              <Star size={16} className="text-amber-500 fill-amber-400 shrink-0" />
              <span>
                You have <strong className="font-extrabold text-amber-950">{unrated.length}</strong> completed subtask{unrated.length > 1 ? "s" : ""} waiting for your leader performance rating.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setRatingTaskTarget(unrated[0])}
              className="rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white shadow-xs hover:bg-amber-700 transition cursor-pointer"
            >
              Review &amp; Rate Subtask
            </button>
          </div>
        );
      })()}

      {/* Event Header Summary Card */}
      <div className="mb-3 min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs sm:mb-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <h1 className="min-w-0 break-words text-base font-semibold tracking-tight text-slate-900 sm:text-xl">{currentEvent.title}</h1>
              {isLeader && (
                <button type="button" onClick={() => setEditEventModalOpen(true)} aria-label="Edit event details" className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-500 hover:bg-blue-50 hover:text-blue-600">
                  <Edit3 size={15} /> Edit
                </button>
              )}
              <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-extrabold ${getStatusTheme(currentEvent.status, currentEvent.eventCustomStatuses).badge}`}>
                {currentEvent.status}
              </span>
              {currentEvent.committee && (
                <span className={`${summaryExpanded ? "inline-flex" : "hidden sm:inline-flex"} rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600`}>
                  {currentEvent.committee} Committee
                </span>
              )}
            </div>

            <p className={`${summaryExpanded ? "block" : "hidden sm:block"} mt-1 max-w-2xl break-words text-xs leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6`}>{currentEvent.description}</p>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-semibold text-slate-500 sm:mt-3 sm:gap-4">
              <span className={`${summaryExpanded ? "flex" : "hidden sm:flex"} items-center gap-1.5`}>
                <Calendar size={13} className="text-slate-400" />
                {currentEvent.startDate} – {currentEvent.endDate}
              </span>
              <span className={`${summaryExpanded ? "flex" : "hidden sm:flex"} items-center gap-1.5`}>
                <Users size={13} className="text-slate-400" />
                {currentEvent.memberCount} members
              </span>
              <span className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-800">{tasks.length}</span> total tasks
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 sm:flex-col sm:items-end sm:border-l sm:border-slate-100 sm:pl-5 sm:text-right">
            <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:gap-0">
            <p className="text-sm font-semibold tracking-tight text-slate-900 sm:text-2xl">{currentEvent.progress}%</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Progress</p>
            </div>
          </div>
        </div>

        <button type="button" aria-expanded={summaryExpanded} onClick={() => setSummaryExpanded((value) => !value)} className="mt-1 min-h-11 text-xs font-semibold text-blue-600 sm:hidden">
          {summaryExpanded ? "Hide event details" : "Show event details"}
        </button>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 sm:mt-4 sm:h-2.5">
          <div
            className={`h-full rounded-full transition-all ${
              getStatusTheme(currentEvent.status, currentEvent.eventCustomStatuses).dot
            }`}
            style={{ width: `${currentEvent.progress}%` }}
          />
        </div>
      </div>

      {/* Filter bar & View toggles */}
      <div className="mb-4 space-y-3 sm:hidden">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMobileFiltersOpen(true)} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold">
            <Filter size={16} /> Filters{statusFilter !== "All" || selectedCommittee !== "All" ? ` (${Number(statusFilter !== "All") + Number(selectedCommittee !== "All")})` : ""}
          </button>
          <div className="min-w-0 flex-1">
            <CustomSelect value={viewMode} onChange={(value) => setViewMode(value as ViewMode)} options={[{ value: "grid", label: "Grid" }, { value: "table", label: "Table" }, { value: "expanded", label: "Expandable list" }, { value: "kanban", label: "Kanban" }, { value: "calendar", label: "Calendar" }]} buttonClassName="min-h-11 rounded-xl bg-white text-sm" dropdownClassName="[&_button]:min-h-11" portal />
          </div>
          {isLeader && <button type="button" onClick={() => setShowAddTaskModal(true)} className="flex min-h-11 items-center gap-1 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white"><Plus size={16} /> Task</button>}
        </div>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input aria-label="Search tasks" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks..." className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>
      <div className="mb-4 hidden min-w-0 flex-wrap items-center justify-between gap-3 sm:flex">
        <div className="flex flex-wrap items-center gap-2">
          {/* Committee filter */}
          <CustomSelect
            value={selectedCommittee}
            onChange={setSelectedCommittee}
            options={[
              { value: "All", label: "All Committees" },
              ...allCommitteeNames.map((commName) => ({
                value: commName,
                label: commName,
              })),
            ]}
            icon={<SlidersHorizontal size={13} className="text-slate-400" />}
            containerClassName="w-auto min-w-[150px]"
            buttonClassName="min-h-11 rounded-xl bg-white border-slate-200 px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:min-h-9"
            dropdownClassName="shadow-xl border-slate-200/90 rounded-2xl [&_button]:min-h-11"
            portal
          />

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

          {isLeader ? <button
            type="button"
            onClick={() => setShowAddTaskModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            Add Task
          </button> : null}
        </div>
      </div>

      {/* Main View Area */}
      <div className="min-w-0">
        {viewMode === "grid" && (
          <TaskGridView
            tasks={visibleTasks}
            onUpdateStatus={handleUpdateTaskStatus}
            onUpdatePriority={isLeader ? handleUpdateTaskPriority : undefined}
            onSelectTask={(task) => setSelectedDetailTask(task)}
            customStatuses={customStatuses}
            statusOrder={statusOrder}
          />
        )}

        {viewMode === "table" && (
          <TaskTableView
            tasks={visibleTasks}
            onUpdateStatus={handleUpdateTaskStatus}
            onUpdatePriority={isLeader ? handleUpdateTaskPriority : undefined}
            onSelectTask={(task) => setSelectedDetailTask(task)}
            customStatuses={customStatuses}
            statusOrder={statusOrder}
          />
        )}

        {viewMode === "expanded" && (
          <TaskExpandedView
            tasks={visibleTasks}
            onUpdateStatus={handleUpdateTaskStatus}
            onSelectTask={(task) => setSelectedDetailTask(task)}
            customStatuses={customStatuses}
            statusOrder={statusOrder}
          />
        )}

        {viewMode === "kanban" && (
          <div className="flex min-w-0 snap-x snap-proximity items-start gap-3 overflow-x-auto overscroll-x-contain pb-4 pt-1 sm:gap-4">
            {allStatuses.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={getColumnTasks(status)}
                onAddTask={isLeader ? () => setShowAddTaskModal(true) : undefined}
                onDragStart={(id) => setDraggedId(id)}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDragOverColumnStatus(null);
                }}
                onDrop={handleDrop}
                onTaskDragOver={(st) => setDragOverColumnStatus(st)}
                draggedTaskId={draggedId}
                dragOverColumnStatus={dragOverColumnStatus}
                onReassignTask={isLeader ? (task) => setReassignTaskTarget(task) : undefined}
                onSelectTask={(task) => setSelectedDetailTask(task)}
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
            onUpdatePriority={isLeader ? handleUpdateTaskPriority : undefined}
            onSelectTask={(task) => setSelectedDetailTask(task)}
            onAddTask={isLeader ? () => setShowAddTaskModal(true) : undefined}
            customStatuses={customStatuses}
          />
        )}
      </div>

      {/* Completion summary footer */}
      <p className="mt-2 text-center text-xs font-semibold text-slate-500">
        {completedCount} of {tasks.length} tasks completed ({currentEvent.progress}% overall)
      </p>

      {/* Task Detail Modal */}
      {editEventModalOpen && isLeader && (
        <EditEventModal event={currentEvent} committees={committees} onDelete={onDeleteEvent ? () => { setEditEventModalOpen(false); setConfirmDeleteEvent(true); } : undefined} onClose={() => setEditEventModalOpen(false)} onSave={async (details) => {
          if (!isLeader) throw new Error("Only a student leader can edit event details.");
          const completing = details.status === "Completed" && currentEvent.status !== "Completed";
          const updatedTasks = completing ? tasks.map((task) => ({ ...task, status: "Completed" as TaskStatus })) : tasks;
          const update = { ...details, ...(completing ? { tasks: updatedTasks, progress: 100 } : {}) };
          await updateEventFirestore(firebaseUser, currentEvent.id, update);
          setCurrentEvent((current) => ({ ...current, ...update }));
          if (completing) setTasks(updatedTasks);
          onUpdateEvent?.({ ...currentEvent, ...update });
          showToast({ title: "Event updated", description: "Your event details were saved.", tone: "success" });
        }} />
      )}
      {mobileFiltersOpen && (
        <dialog ref={mobileFiltersRef} onCancel={() => setMobileFiltersOpen(false)} aria-labelledby="mobile-task-filters-title" className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl backdrop:bg-slate-950/40">
          <div className="mb-5 flex items-center justify-between">
            <h2 id="mobile-task-filters-title" className="text-lg font-bold">Filter tasks</h2>
            <button type="button" onClick={() => setMobileFiltersOpen(false)} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-blue-600">Done</button>
          </div>
          <div className="space-y-4">
            <div className="space-y-2"><p className="text-sm font-semibold text-slate-600">Committee</p>
              <CustomSelect value={selectedCommittee} onChange={setSelectedCommittee} options={[{ value: "All", label: "All Committees" }, ...allCommitteeNames.map((name) => ({ value: name, label: name }))]} buttonClassName="min-h-11 rounded-xl bg-white" dropdownClassName="[&_button]:min-h-11" />
            </div>
            <div className="space-y-2"><p className="text-sm font-semibold text-slate-600">Status</p>
              <CustomSelect value={statusFilter} onChange={setStatusFilter} options={allTaskFilters.map(({ key, label }) => ({ value: key, label: `${label} (${key === "All" ? tasks.length : tasks.filter((task) => task.status === key).length})`, indicatorClass: key === "All" ? undefined : getStatusTheme(key, customStatuses).dot }))} buttonClassName="min-h-11 rounded-xl bg-white" dropdownClassName="[&_button]:min-h-11" />
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <button type="button" onClick={() => { setSelectedCommittee("All"); setStatusFilter("All"); setSearch(""); }} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold">Clear filters</button>
              {isLeader && <button type="button" onClick={() => { setMobileFiltersOpen(false); setIsAddStatusModalOpen(true); }} className="min-h-11 rounded-xl bg-blue-50 px-4 text-sm font-semibold text-blue-600">Manage statuses</button>}
            </div>
          </div>
        </dialog>
      )}
      {selectedDetailTask && (
        <TaskDetailModal
          eventId={currentEvent.id}
          task={selectedDetailTask}
          onClose={() => setSelectedDetailTask(null)}
          onUpdateTask={handleUpdateTask}
          onAttachmentsUpdated={handleSavedTask}
          onDeleteTask={handleDeleteTask}
          customStatuses={customStatuses}
          statusOrder={statusOrder}
          committees={committees}
          roster={realRoster}
          isLeader={isLeader}
          canEdit={canEditTask(selectedDetailTask)}
        />
      )}

      {/* Add Task Modal */}
      {isLeader && showAddTaskModal && (
        <AddTaskModal
          eventName={currentEvent.title}
          members={members}
          onClose={() => setShowAddTaskModal(false)}
          onAddTask={handleAddTask}
          committees={committees}
          customStatuses={customStatuses}
          statusOrder={statusOrder}
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

      {ratingTaskTarget && (
        <TaskRatingModal
          key={currentEvent.id}
          eventId={currentEvent.id}
          isOpen={Boolean(ratingTaskTarget)}
          onClose={() => setRatingTaskTarget(null)}
          tasks={tasks.filter((task) => (task.status === "Completed" || task.status === "Done") && !task.performanceReview?.rating)}
          initialTaskId={ratingTaskTarget.id}
          onRate={handleRateTask}
        />
      )}

      {isLeader && confirmDeleteEvent && onDeleteEvent && (
        <ConfirmDeleteModal
          key={currentEvent.title}
          itemType="event"
          itemName={currentEvent.title}
          requireNameConfirmation
          isDeleting={isDeletingEvent}
          onCancel={() => setConfirmDeleteEvent(false)}
          onConfirm={async () => {
            setIsDeletingEvent(true);
            try {
              await onDeleteEvent();
              showToast({ title: "Event deleted", description: "The event has been deleted successfully.", tone: "success" });
              setConfirmDeleteEvent(false);
            } catch (error) {
              showToast({ title: "Event not deleted", description: error instanceof Error ? error.message : "Please try again.", tone: "error" });
            } finally {
              setIsDeletingEvent(false);
            }
          }}
        />
      )}
    </div>
  );
}
