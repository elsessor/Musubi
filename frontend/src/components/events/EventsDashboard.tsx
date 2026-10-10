"use client";

import {
  BookOpen,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Columns3,
  GripVertical,
  LayoutGrid,
  Plus,
  Rows,
  SlidersHorizontal,
  Table,
  Users
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Event, EventStatus } from "./types";
import { isEventScheduledOnDay } from "@/utils/calendarSchedule";
import { CreateEventCard, EventCard } from "./EventCard";
import { AddCustomStatusModal } from "./AddCustomStatusModal";
import { getStatusTheme, type CustomStatusConfig, type StatusThemeColor } from "./statusUtils";
import { CustomSelect } from "@/components/ui/CustomSelect";

import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { eventStatusSettings, updateEventFirestore, type EventStatusSettings } from "@/services/events.service";

type StatusFilter = EventStatus | "All";
type ViewMode = "grid" | "table" | "expanded" | "kanban" | "calendar";

const DEFAULT_EVENT_STATUSES: EventStatus[] = ["Active", "Planning", "Completed", "Cancelled", "Archived"];

const VIEW_MODES: { mode: ViewMode; title: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { mode: "grid", title: "Grid View", icon: LayoutGrid },
  { mode: "table", title: "Table View", icon: Table },
  { mode: "expanded", title: "Expanded View", icon: Rows },
  { mode: "kanban", title: "Kanban Columns", icon: Columns3 },
  { mode: "calendar", title: "Calendar View", icon: Calendar }
];

function buildCalendarDays(currentDate: Date, events: Event[]) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay();

  const lastDateOfMonth = new Date(year, month + 1, 0).getDate();
  const lastDateOfPrevMonth = new Date(year, month, 0).getDate();

  const days: { dayNumber: number; month: "prev" | "current" | "next"; isToday: boolean; matchingEvents: Event[] }[] = [];

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    days.push({
      dayNumber: lastDateOfPrevMonth - i,
      month: "prev",
      isToday: false,
      matchingEvents: []
    });
  }

  const today = new Date();

  for (let d = 1; d <= lastDateOfMonth; d++) {
    const isToday =
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === d;

    const cellDate = new Date(year, month, d);
    const matchingEvents = events.filter((event) => isEventScheduledOnDay(event, cellDate));

    days.push({
      dayNumber: d,
      month: "current",
      isToday,
      matchingEvents
    });
  }

  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      dayNumber: i,
      month: "next",
      isToday: false,
      matchingEvents: []
    });
  }

  return days;
}

type EventsDashboardProps = {
  events: Event[];
  organizationId?: string | null;
  isLeader?: boolean;
  onSelectEvent: (event: Event) => void;
  onNewEvent: (initialStatus?: EventStatus) => void;
  onUpdateEvent?: (updatedEvent: Event) => void;
  committees?: { id: string; name: string }[];
};

export function EventsDashboard({
  events,
  organizationId,
  isLeader = true,
  onSelectEvent: selectEvent,
  onNewEvent,
  onUpdateEvent,
  committees = []
}: EventsDashboardProps) {
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const showToast = useToastStore((state) => state.showToast);
  const [settingsError, setSettingsError] = useState("");
  const [settingsReady, setSettingsReady] = useState(false);
  const saveQueue = useRef(Promise.resolve());
  const pendingSaves = useRef(0);
  function onSelectEvent(event: Event) { selectEvent({ ...event, eventCustomStatuses: customStatuses }); }
  const [filter, setFilter] = useState<StatusFilter>("All");
  const [selectedCommittee, setSelectedCommittee] = useState<string>("All");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date());

  // Organization status settings are shared with every event panel.
  const [customStatuses, setCustomStatuses] = useState<CustomStatusConfig[]>([]);
  const [isAddStatusModalOpen, setIsAddStatusModalOpen] = useState(false);
  const [draggedStatusPill, setDraggedStatusPill] = useState<string | null>(null);
  const [dragOverStatusPill, setDragOverStatusPill] = useState<string | null>(null);

  // Trello-style card drag and drop state
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dragOverCardTarget, setDragOverCardTarget] = useState<{ status: string; cardId: string | null; position: "before" | "after" } | null>(null);
  const didDragRef = useRef(false);

  const [statusOrder, setStatusOrder] = useState<string[]>(DEFAULT_EVENT_STATUSES);

  useEffect(() => {
    let cancelled = false;
    setSettingsReady(false);
    setCustomStatuses([]);
    setStatusOrder(DEFAULT_EVENT_STATUSES);
    async function refresh() {
      if (!firebaseUser || pendingSaves.current) return;
      try {
        let saved = await eventStatusSettings(firebaseUser, organizationId);
        if (!saved.configured && isLeader && !cancelled) {
          // Preserve status colors saved by the earlier browser-only version.
          let legacy: CustomStatusConfig[] = [];
          try {
            const parsed = JSON.parse(localStorage.getItem("musubi_custom_event_statuses") || "[]");
            if (Array.isArray(parsed)) legacy = parsed;
          } catch {}
          if (legacy.length) {
            const known = [...DEFAULT_EVENT_STATUSES, ...legacy.map((status) => status.name)];
            let order = known;
            try {
              const storedOrder = JSON.parse(localStorage.getItem("musubi_event_status_order") || "[]");
              if (Array.isArray(storedOrder)) order = Array.from(new Set([...storedOrder.filter((status) => known.includes(status)), ...known]));
            } catch {}
            saved = await eventStatusSettings(firebaseUser, organizationId, { customStatuses: legacy, statusOrder: order });
            try {
              localStorage.removeItem("musubi_custom_event_statuses");
              localStorage.removeItem("musubi_event_status_order");
            } catch {}
          }
        }
        if (!cancelled && !pendingSaves.current) {
          setCustomStatuses(saved.customStatuses);
          setStatusOrder(saved.statusOrder);
          setSettingsReady(true);
          setSettingsError("");
        }
      } catch (error) {
        if (!cancelled) setSettingsError(error instanceof Error ? error.message : "Unable to load status colors.");
      }
    }
    void refresh();
    const interval = window.setInterval(() => { if (!document.hidden) void refresh(); }, 120000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [firebaseUser, organizationId, isLeader]);

  function persistSettings(custom: CustomStatusConfig[], order: string[]) {
    if (!isLeader || !settingsReady) return;
    pendingSaves.current += 1;
    const configured = new Set([...DEFAULT_EVENT_STATUSES, ...custom.map((status) => status.name)]);
    const settings: EventStatusSettings = { customStatuses: custom, statusOrder: order.filter((status) => configured.has(status)) };
    saveQueue.current = saveQueue.current.then(async () => {
      try {
        await eventStatusSettings(firebaseUser, organizationId, settings);
        setSettingsError("");
      } catch (error) {
        setSettingsError(error instanceof Error ? error.message : "Status colors could not be saved. Please try again.");
      } finally { pendingSaves.current -= 1; }
    });
  }

  // Synchronize statusOrder with customStatuses and defaultStatuses
  useEffect(() => {
    setStatusOrder((prev) => {
      const known = Array.from(new Set([...DEFAULT_EVENT_STATUSES, ...customStatuses.map((status) => status.name), ...events.map((event) => event.status)]));
      const filtered = prev.filter((status) => known.includes(status));
      const updated = [...filtered, ...known.filter((status) => !filtered.includes(status))];
      if (updated.length === prev.length && updated.every((status, index) => status === prev[index])) return prev;
      return updated;
    });
  }, [customStatuses, events]);

  function handleReorderStatusOrder(newOrder: string[]) {
    if (!isLeader || !settingsReady) return;
    setStatusOrder(newOrder);
    persistSettings(customStatuses, newOrder);
  }

  function handleAddCustomStatus(statusName: string, color: StatusThemeColor, insertIndex?: number) {
    if (!isLeader || !settingsReady) return;
    if (
      customStatuses.some((cs) => cs.name.toLowerCase() === statusName.toLowerCase()) ||
      DEFAULT_EVENT_STATUSES.some((ds) => ds.toLowerCase() === statusName.toLowerCase())
    ) {
      return;
    }
    const updated = [...customStatuses, { name: statusName, color }];
    setCustomStatuses(updated);
    const updatedOrder = [...statusOrder];
    const idx = typeof insertIndex === "number" ? insertIndex : updatedOrder.length;
    updatedOrder.splice(idx, 0, statusName);
    setStatusOrder(updatedOrder);
    persistSettings(updated, updatedOrder);
  }

  function handleDeleteCustomStatus(statusName: string) {
    if (!isLeader || !settingsReady) return;
    const updated = customStatuses.filter((cs) => cs.name.toLowerCase() !== statusName.toLowerCase());
    const updatedOrder = statusOrder.filter((st) => st.toLowerCase() !== statusName.toLowerCase());
    setCustomStatuses(updated);
    setStatusOrder(updatedOrder);
    persistSettings(updated, updatedOrder);
    if (filter === statusName) {
      setFilter("All");
    }
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

  // Card Drag & Drop (Trello-style)
  function handleCardDragStart(e: React.DragEvent, event: Event) {
    if (!isLeader) return;
    e.stopPropagation();
    e.dataTransfer.setData("text/plain", event.id);
    e.dataTransfer.effectAllowed = "move";
    setDraggedCardId(event.id);
    didDragRef.current = true;
  }

  function handleCardDragEnd() {
    setDraggedCardId(null);
    setDragOverColumn(null);
    setDragOverCardTarget(null);
    setTimeout(() => {
      didDragRef.current = false;
    }, 150);
  }

  function handleColumnDragOver(e: React.DragEvent, status: string) {
    if (!isLeader || !draggedCardId) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  }

  function handleCardDragOver(e: React.DragEvent, status: string, targetCardId: string) {
    if (!isLeader || !draggedCardId) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";

    if (draggedCardId === targetCardId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? "before" : "after";

    setDragOverColumn(status);
    setDragOverCardTarget({ status, cardId: targetCardId, position });
  }

  function handleCardDrop(e: React.DragEvent, targetStatus: string) {
    if (!isLeader || !draggedCardId) return;
    e.preventDefault();
    e.stopPropagation();

    const targetCard = events.find((ev) => ev.id === draggedCardId);
    if (!targetCard) {
      handleCardDragEnd();
      return;
    }

    const previousStatus = targetCard.status;
    const isCompleted = targetStatus === "Completed";
    const statusChanged = previousStatus !== targetStatus;

    if (!statusChanged && !dragOverCardTarget?.cardId) {
      handleCardDragEnd();
      return;
    }

    const updatedEvent: Event = {
      ...targetCard,
      status: targetStatus as EventStatus,
      progress: isCompleted ? 100 : targetCard.progress
    };

    // Optimistically notify parent
    onUpdateEvent?.(updatedEvent);

    // Persist to Firestore
    void updateEventFirestore(firebaseUser, targetCard.id, {
      status: targetStatus,
      ...(isCompleted ? { progress: 100 } : {})
    })
      .then(() => {
        showToast({
          title: "Event moved",
          description: `"${targetCard.title}" moved to ${targetStatus}.`,
          tone: "success"
        });
      })
      .catch((err) => {
        console.error("Failed to move event:", err);
        // Rollback
        onUpdateEvent?.(targetCard);
        showToast({
          title: "Failed to move event",
          description: err instanceof Error ? err.message : "Please try again.",
          tone: "error"
        });
      });

    handleCardDragEnd();
  }

  function handleCardClick(event: Event) {
    if (didDragRef.current) return;
    onSelectEvent(event);
  }

  const activeCount    = events.filter((e) => e.status === "Active").length;
  const planningCount  = events.filter((e) => e.status === "Planning").length;
  const completedCount = events.filter((e) => e.status === "Completed").length;

  const fetchedNames = committees.map((c) => c.name);
  const eventNames = events.map((e) => e.committee).filter((c): c is string => Boolean(c));
  const allCommitteeNames = Array.from(new Set([...fetchedNames, ...eventNames]));

  const allStatusFilters: { label: string; key: StatusFilter }[] = [
    { label: "All Events", key: "All" },
    ...statusOrder.map((st) => ({ label: st, key: st as EventStatus }))
  ];

  const visible = events.filter((e) => {
    const matchesStatus = filter === "All" || e.status === filter;
    const matchesCommittee =
      selectedCommittee === "All" ||
      (e.committee || "").toLowerCase() === selectedCommittee.toLowerCase();
    return matchesStatus && matchesCommittee;
  });

  return (
    <div className="flex flex-col gap-4">
      {settingsError ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{settingsError}</p> : null}
      {/* Summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <span className="font-semibold text-slate-800">
            <span className="mr-1.5 text-base font-bold">{events.length}</span>
            <span className="text-slate-500">Total</span>
          </span>
          {[
            { label: "Active",    count: activeCount },
            { label: "Planning",  count: planningCount },
            { label: "Completed", count: completedCount }
          ].map(({ label, count }) => (
            <span key={label} className="flex items-center gap-1.5 text-sm text-slate-600">
              <span className={`h-2 w-2 rounded-full ${getStatusTheme(label, customStatuses).dot}`} />
              <span className="font-semibold text-slate-900">{count}</span>
              {label}
            </span>
          ))}
        </div>
        {isLeader && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNewEvent()}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-700"
            >
              <Plus size={15} />
              New Event
            </button>
          </div>
        )}
      </div>

      {/* Filter bar & View toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2">
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
            buttonClassName="h-8 rounded-xl bg-white border-slate-200 px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            dropdownClassName="w-48 shadow-xl border-slate-200/90 rounded-2xl"
          />

          {/* Status filter pills */}
          <div className="flex flex-wrap items-center gap-1">
            {allStatusFilters.map(({ label, key }) => {
              const count = key === "All" ? events.length : events.filter((e) => e.status === key).length;
              const isActive = filter === key;
              const theme = getStatusTheme(key, customStatuses);
              const isPillDraggable = isLeader && settingsReady && key !== "All";
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
                  onClick={() => setFilter(key)}
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

            {/* + Add / Manage Custom Status Button for Leaders */}
            {isLeader && (
              <button
                type="button"
                disabled={!settingsReady}
                onClick={() => setIsAddStatusModalOpen(true)}
                className="flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
                title="Add or rearrange custom event statuses"
              >
                <Plus size={13} />
                <span>Custom Status</span>
              </button>
            )}
          </div>
        </div>

        {/* 5 View Mode Toggles */}
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
      </div>

      {/* 1. Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((event) => (
            <EventCard key={event.id} event={event} onClick={onSelectEvent} customStatuses={customStatuses} />
          ))}
          {isLeader && <CreateEventCard onClick={() => onNewEvent()} />}
        </div>
      )}

      {/* 2. Table View */}
      {viewMode === "table" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">EVENT</th>
                <th className="px-4 py-3.5">COMMITTEE</th>
                <th className="px-4 py-3.5">STATUS</th>
                <th className="px-4 py-3.5">PROGRESS</th>
                <th className="px-4 py-3.5">START DATE</th>
                <th className="px-4 py-3.5">END DATE</th>
                <th className="px-4 py-3.5">MEMBERS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {visible.map((event) => {
                const theme = getStatusTheme(event.status, customStatuses);
                return (
                  <tr
                    key={event.id}
                    onClick={() => onSelectEvent(event)}
                    className="group cursor-pointer transition hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition">
                        {event.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{event.description}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 border border-violet-200">
                        {event.committee || "General"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${theme.badge}`}
                      >
                        {event.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${theme.dot}`}
                            style={{ width: `${event.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">{event.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs font-medium text-slate-600">{event.startDate}</td>
                    <td className="px-4 py-4 text-xs font-medium text-slate-600">{event.endDate}</td>
                    <td className="px-4 py-4 text-xs font-medium text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Users size={13} className="text-slate-400" />
                        {event.memberCount}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Expanded View */}
      {viewMode === "expanded" && (
        <div className="space-y-4">
          {visible.map((event) => {
            const theme = getStatusTheme(event.status, customStatuses);
            return (
              <article
                key={event.id}
                onClick={() => onSelectEvent(event)}
                className={`overflow-hidden rounded-2xl border border-slate-200 border-l-4 ${theme.border} bg-white p-5 shadow-sm transition hover:shadow-md cursor-pointer`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <BookOpen size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{event.title}</h3>
                      <p className="mt-0.5 text-xs text-slate-500">{event.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {event.committee && (
                      <span className="rounded-full bg-violet-50 px-3 py-0.5 text-[11px] font-semibold text-violet-700 border border-violet-200">
                        {event.committee}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-3 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${theme.badge}`}
                    >
                      {event.status}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-medium">
                    <span>Progress</span>
                    <span className="font-semibold text-slate-800">{event.progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${theme.dot}`} style={{ width: `${event.progress}%` }} />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>📅 {event.startDate} – {event.endDate}</span>
                  <span className="flex items-center gap-1">👥 {event.memberCount} members</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* 4. Kanban View (Trello-Style Drag & Drop Board) */}
      {viewMode === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start min-h-[580px] scrollbar-thin">
          {statusOrder.map((status) => {
            const statusEvents = visible.filter((e) => e.status === status);
            const theme = getStatusTheme(status, customStatuses);
            const isColDraggable = isLeader && settingsReady;
            const isDraggingCol = draggedStatusPill === status;
            const isDragOverCol = dragOverStatusPill === status;
            const isCardOverThisCol = dragOverColumn === status && Boolean(draggedCardId);

            return (
              <div
                key={status}
                onDragOver={(e) => handleColumnDragOver(e, status)}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    if (dragOverColumn === status) setDragOverColumn(null);
                  }
                }}
                onDrop={(e) => handleCardDrop(e, status)}
                className={`flex flex-col w-[308px] min-w-[308px] max-w-[320px] shrink-0 rounded-2xl bg-slate-100/90 border border-slate-200/80 p-3 transition-all duration-200 shadow-2xs ${
                  isDraggingCol ? "opacity-30 scale-95 border-dashed border-blue-400" : ""
                } ${
                  isDragOverCol ? "ring-2 ring-indigo-500 bg-indigo-50/50" : ""
                } ${
                  isCardOverThisCol ? "ring-2 ring-blue-500/80 bg-blue-50/50 shadow-md" : ""
                }`}
              >
                {/* Column Header (Draggable to rearrange lists) */}
                <div
                  draggable={isColDraggable}
                  onDragStart={(e) => {
                    if (!isColDraggable || draggedCardId) return;
                    e.dataTransfer.setData("text/plain", status);
                    setDraggedStatusPill(status);
                  }}
                  onDragOver={(e) => {
                    if (!isLeader || draggedCardId) return;
                    e.preventDefault();
                    if (draggedStatusPill && draggedStatusPill !== status) {
                      setDragOverStatusPill(status);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverStatusPill === status) setDragOverStatusPill(null);
                  }}
                  onDrop={(e) => {
                    if (!isColDraggable || draggedCardId) return;
                    e.preventDefault();
                    handleDropStatusPill(status);
                  }}
                  onDragEnd={() => {
                    setDraggedStatusPill(null);
                    setDragOverStatusPill(null);
                  }}
                  title={isColDraggable ? "Drag column header to rearrange list" : undefined}
                  className={`group/header flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition select-none ${theme.headerTone} ${
                    isColDraggable ? "cursor-grab active:cursor-grabbing hover:brightness-95" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isColDraggable && (
                      <GripVertical size={13} className="text-slate-400 opacity-60 group-hover/header:opacity-100 shrink-0" />
                    )}
                    <span className={`h-2 w-2 rounded-full shrink-0 ${theme.dot}`} />
                    <span className="truncate uppercase tracking-wider">{status}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-slate-700 shadow-2xs">
                      {statusEvents.length}
                    </span>
                    {isLeader && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNewEvent(status as EventStatus);
                        }}
                        className="rounded-lg p-1 text-slate-500 opacity-0 group-hover/header:opacity-100 hover:bg-white hover:text-slate-900 transition"
                        title={`Add event in ${status}`}
                      >
                        <Plus size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Cards List (Scrollable, Trello cards) */}
                <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[60px] p-0.5 mt-2.5 scrollbar-thin">
                  {statusEvents.map((event) => {
                    const isDraggingThisCard = draggedCardId === event.id;
                    const isTargetCard = dragOverCardTarget?.cardId === event.id;
                    const showBeforePlaceholder = isTargetCard && dragOverCardTarget?.position === "before" && !isDraggingThisCard;
                    const showAfterPlaceholder = isTargetCard && dragOverCardTarget?.position === "after" && !isDraggingThisCard;
                    const completedTasks = event.tasks.filter((t) => t.status === "Completed").length;
                    const hasTasks = event.tasks.length > 0;

                    return (
                      <div key={event.id} className="flex flex-col gap-2.5">
                        {/* Insertion Placeholder (Before) */}
                        {showBeforePlaceholder && (
                          <div className="h-16 w-full rounded-xl border-2 border-dashed border-blue-400 bg-blue-100/60 flex items-center justify-center text-xs font-semibold text-blue-600 animate-pulse transition-all">
                            Drop here
                          </div>
                        )}

                        {/* Card */}
                        <article
                          draggable={isLeader}
                          onDragStart={(e) => handleCardDragStart(e, event)}
                          onDragEnd={handleCardDragEnd}
                          onDragOver={(e) => handleCardDragOver(e, status, event.id)}
                          onClick={() => handleCardClick(event)}
                          className={`group/card relative overflow-hidden rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs transition-all duration-150 select-none ${
                            isDraggingThisCard
                              ? "opacity-30 scale-[0.97] rotate-1 border-2 border-dashed border-blue-400 shadow-xl"
                              : "hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 cursor-pointer active:scale-[0.99]"
                          }`}
                        >
                          {/* Top colored accent line */}
                          <div className={`h-1 w-full rounded-full ${theme.dot} mb-2.5`} />

                          {/* Header row: title + grip handle on hover */}
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-bold text-slate-800 leading-snug group-hover/card:text-blue-600 transition-colors">
                              {event.title}
                            </h4>
                            {isLeader && (
                              <GripVertical
                                size={14}
                                className="text-slate-400 opacity-0 group-hover/card:opacity-60 hover:opacity-100 transition-opacity shrink-0 cursor-grab active:cursor-grabbing"
                              />
                            )}
                          </div>

                          {/* Optional description snippet */}
                          {event.description && (
                            <p className="mt-1 line-clamp-2 text-[11px] text-slate-500 leading-relaxed">
                              {event.description}
                            </p>
                          )}

                          {/* Committee tag pill */}
                          {event.committee && (
                            <div className="mt-2.5">
                              <span className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">
                                {event.committee}
                              </span>
                            </div>
                          )}

                          {/* Progress bar */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1">
                              <span>{event.progress}% done</span>
                              {hasTasks && (
                                <span className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                                  <CheckSquare size={11} className="text-slate-400" />
                                  {completedTasks}/{event.tasks.length}
                                </span>
                              )}
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${theme.dot}`}
                                style={{ width: `${event.progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Footer: Date & Members */}
                          <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-slate-500 pt-2 border-t border-slate-100">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} className="text-slate-400" />
                              {event.startDate}
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-slate-600">
                              <Users size={12} className="text-slate-400" />
                              {event.memberCount}
                            </span>
                          </div>
                        </article>

                        {/* Insertion Placeholder (After) */}
                        {showAfterPlaceholder && (
                          <div className="h-16 w-full rounded-xl border-2 border-dashed border-blue-400 bg-blue-100/60 flex items-center justify-center text-xs font-semibold text-blue-600 animate-pulse transition-all">
                            Drop here
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Empty state when no events in this status */}
                  {statusEvents.length === 0 && (
                    <div
                      className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-9 px-3 text-center transition-all ${
                        isCardOverThisCol
                          ? "border-blue-400 bg-blue-100/50 text-blue-600 font-semibold text-xs"
                          : "border-slate-200/90 bg-white/40 text-slate-400 text-xs"
                      }`}
                    >
                      {isCardOverThisCol ? "Drop event here" : "No events"}
                    </div>
                  )}
                </div>

                {/* Trello-Style Column Footer: + Add an event button */}
                {isLeader && (
                  <button
                    type="button"
                    onClick={() => onNewEvent(status as EventStatus)}
                    className="mt-2.5 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs transition-all w-full text-left"
                  >
                    <Plus size={14} className="text-slate-400" />
                    <span>Add an event</span>
                  </button>
                )}
              </div>
            );
          })}

          {/* End of Board: + Add Custom Status Column (Trello "+ Add another list") */}
          {isLeader && (
            <div className="w-[280px] min-w-[280px] shrink-0">
              <button
                type="button"
                onClick={() => setIsAddStatusModalOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white/70 px-4 py-4 text-xs font-bold text-slate-600 hover:border-blue-400 hover:bg-blue-50/60 hover:text-blue-700 transition-all shadow-2xs"
              >
                <Plus size={16} />
                <span>Add another status list</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. Calendar View */}
      {viewMode === "calendar" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-4">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
              className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {calendarDate.toLocaleString("en-US", { month: "long", year: "numeric" })}
              </h3>
              <button type="button" onClick={() => setCalendarDate(new Date())} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                Today
              </button>
            </div>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
              className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/50 py-2.5 text-center text-[11px] font-semibold text-slate-500">
            <div>SUN</div>
            <div>MON</div>
            <div>TUE</div>
            <div>WED</div>
            <div>THU</div>
            <div>FRI</div>
            <div>SAT</div>
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {buildCalendarDays(calendarDate, visible).map((day, idx) => {
              const isCurrentMonth = day.month === "current";
              const isToday = day.isToday;

              return (
                <div key={idx} className={`min-h-[90px] p-2 transition ${isCurrentMonth ? "bg-white" : "bg-slate-50/40 text-slate-400"}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span
                      className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isToday
                          ? "bg-blue-600 text-white font-bold shadow-sm"
                          : isCurrentMonth
                          ? "text-slate-700"
                          : "text-slate-400"
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                  </div>

                  {day.matchingEvents.map((evt) => {
                    const theme = getStatusTheme(evt.status, customStatuses);
                    return (
                      <button
                        key={evt.id}
                        onClick={() => onSelectEvent(evt)}
                        className={`mt-1 block w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-semibold ${theme.bg} ${theme.text}`}
                      >
                        {evt.title}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {visible.length === 0 && viewMode !== "calendar" && (
        <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Calendar size={32} className="text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No events match this filter</p>
          <button
            type="button"
            onClick={() => setFilter("All")}
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Add & Manage Custom Event Status Modal */}
      <AddCustomStatusModal
        isOpen={isAddStatusModalOpen}
        onClose={() => setIsAddStatusModalOpen(false)}
        type="event"
        customStatuses={customStatuses}
        statusOrder={statusOrder}
        defaultStatuses={DEFAULT_EVENT_STATUSES}
        onAddStatus={handleAddCustomStatus}
        onReorderStatusOrder={handleReorderStatusOrder}
        onDeleteStatus={handleDeleteCustomStatus}
      />
    </div>
  );
}
