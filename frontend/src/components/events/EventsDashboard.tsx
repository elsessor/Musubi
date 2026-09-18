"use client";

import {
  BookOpen,
  Calendar,
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
import { useEffect, useState } from "react";
import type { Event, EventStatus } from "./types";
import { CreateEventCard, EventCard } from "./EventCard";
import { AddCustomStatusModal } from "./AddCustomStatusModal";
import { getStatusTheme, type CustomStatusConfig, type StatusThemeColor } from "./statusUtils";

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

  const today = new Date(2026, 7, 21); // Aug 21, 2026

  for (let d = 1; d <= lastDateOfMonth; d++) {
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
    const matchingEvents = events.filter((e) => {
      if (d === 20 && e.title.includes("Culture")) return true;
      if (d === 5 && e.title.includes("Orientation")) return true;
      if (d === 28 && e.title.includes("Sports")) return true;
      return false;
    });

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
  isLeader?: boolean;
  onSelectEvent: (event: Event) => void;
  onNewEvent: () => void;
  committees?: { id: string; name: string }[];
};

export function EventsDashboard({ events, isLeader = true, onSelectEvent, onNewEvent, committees = [] }: EventsDashboardProps) {
  const [filter, setFilter] = useState<StatusFilter>("All");
  const [selectedCommittee, setSelectedCommittee] = useState<string>("All");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [calendarDate, setCalendarDate] = useState<Date>(new Date(2026, 7, 1)); // Aug 2026

  // Custom event statuses stored in state & localStorage
  const [customStatuses, setCustomStatuses] = useState<CustomStatusConfig[]>([]);
  const [isAddStatusModalOpen, setIsAddStatusModalOpen] = useState(false);
  const [draggedStatusPill, setDraggedStatusPill] = useState<string | null>(null);
  const [dragOverStatusPill, setDragOverStatusPill] = useState<string | null>(null);

  const [statusOrder, setStatusOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("musubi_event_status_order");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return DEFAULT_EVENT_STATUSES;
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("musubi_custom_event_statuses");
      if (saved) {
        setCustomStatuses(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // Synchronize statusOrder with customStatuses and defaultStatuses
  useEffect(() => {
    setStatusOrder((prev) => {
      const existing = new Set(prev);
      const missingDefaults = DEFAULT_EVENT_STATUSES.filter((st) => !existing.has(st));
      const missingCustom = customStatuses.filter((cs) => !existing.has(cs.name)).map((cs) => cs.name);
      const validCustomNames = new Set(customStatuses.map((cs) => cs.name));
      const filtered = prev.filter(
        (st) => DEFAULT_EVENT_STATUSES.includes(st as EventStatus) || validCustomNames.has(st)
      );

      if (missingDefaults.length === 0 && missingCustom.length === 0 && filtered.length === prev.length) {
        return prev;
      }
      const updated = [...filtered, ...missingDefaults, ...missingCustom];
      try {
        localStorage.setItem("musubi_event_status_order", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [customStatuses]);

  function handleReorderStatusOrder(newOrder: string[]) {
    setStatusOrder(newOrder);
    try {
      localStorage.setItem("musubi_event_status_order", JSON.stringify(newOrder));
    } catch {}
  }

  function handleAddCustomStatus(statusName: string, color: StatusThemeColor) {
    if (
      customStatuses.some((cs) => cs.name.toLowerCase() === statusName.toLowerCase()) ||
      DEFAULT_EVENT_STATUSES.some((ds) => ds.toLowerCase() === statusName.toLowerCase())
    ) {
      return;
    }
    const updated = [...customStatuses, { name: statusName, color }];
    setCustomStatuses(updated);
    const updatedOrder = [...statusOrder, statusName];
    setStatusOrder(updatedOrder);
    try {
      localStorage.setItem("musubi_custom_event_statuses", JSON.stringify(updated));
      localStorage.setItem("musubi_event_status_order", JSON.stringify(updatedOrder));
    } catch {}
  }

  function handleDeleteCustomStatus(statusName: string) {
    const updated = customStatuses.filter((cs) => cs.name.toLowerCase() !== statusName.toLowerCase());
    const updatedOrder = statusOrder.filter((st) => st.toLowerCase() !== statusName.toLowerCase());
    setCustomStatuses(updated);
    setStatusOrder(updatedOrder);
    try {
      localStorage.setItem("musubi_custom_event_statuses", JSON.stringify(updated));
      localStorage.setItem("musubi_event_status_order", JSON.stringify(updatedOrder));
    } catch {}
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
      {/* Summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <span className="font-semibold text-slate-800">
            <span className="mr-1.5 text-base font-bold">{events.length}</span>
            <span className="text-slate-500">Total</span>
          </span>
          {[
            { label: "Active",    count: activeCount,    dot: "bg-blue-500" },
            { label: "Planning",  count: planningCount,  dot: "bg-amber-400" },
            { label: "Completed", count: completedCount, dot: "bg-emerald-500" }
          ].map(({ label, count, dot }) => (
            <span key={label} className="flex items-center gap-1.5 text-sm text-slate-600">
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              <span className="font-semibold text-slate-900">{count}</span>
              {label}
            </span>
          ))}
        </div>
        {isLeader && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onNewEvent}
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
            {allStatusFilters.map(({ label, key }) => {
              const count = key === "All" ? events.length : events.filter((e) => e.status === key).length;
              const isActive = filter === key;
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
                  onClick={() => setFilter(key)}
                  title={isPillDraggable ? "Drag to rearrange status order" : undefined}
                  className={`group flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-slate-900 text-white shadow"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  } ${isPillDraggable ? "cursor-grab active:cursor-grabbing" : ""} ${
                    isDraggingThis ? "opacity-30 scale-95 border-dashed border-blue-400" : ""
                  } ${isDragOverThis ? "ring-2 ring-blue-500 scale-105 bg-blue-50/80" : ""}`}
                >
                  {isPillDraggable && (
                    <GripVertical size={11} className="-ml-1 text-slate-300 transition-opacity group-hover:text-slate-500" />
                  )}
                  {key !== "All" && (
                    <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-white/70" : theme.dot}`} />
                  )}
                  {label}
                  <span className={`${isActive ? "text-white/70" : "text-slate-400"}`}>{count}</span>
                </button>
              );
            })}

            {/* + Add / Manage Custom Status Button for Leaders */}
            {isLeader && (
              <button
                type="button"
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
          {isLeader && <CreateEventCard onClick={onNewEvent} />}
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

      {/* 4. Kanban View */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statusOrder.map((status) => {
            const statusEvents = visible.filter((e) => e.status === status);
            const theme = getStatusTheme(status, customStatuses);
            const isColDraggable = isLeader;
            const isDraggingCol = draggedStatusPill === status;
            const isDragOverCol = dragOverStatusPill === status;

            return (
              <div
                key={status}
                className={`flex flex-col gap-3 transition-all ${
                  isDraggingCol ? "opacity-30 scale-95" : ""
                } ${isDragOverCol ? "ring-2 ring-blue-500 rounded-2xl p-1 bg-blue-50/40" : ""}`}
              >
                <div
                  draggable={isColDraggable}
                  onDragStart={(e) => {
                    if (!isColDraggable) return;
                    e.dataTransfer.setData("text/plain", status);
                    setDraggedStatusPill(status);
                  }}
                  onDragOver={(e) => {
                    if (!isLeader) return;
                    e.preventDefault();
                    if (draggedStatusPill && draggedStatusPill !== status) {
                      setDragOverStatusPill(status);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverStatusPill === status) setDragOverStatusPill(null);
                  }}
                  onDrop={(e) => {
                    if (!isColDraggable) return;
                    e.preventDefault();
                    handleDropStatusPill(status);
                  }}
                  onDragEnd={() => {
                    setDraggedStatusPill(null);
                    setDragOverStatusPill(null);
                  }}
                  title={isColDraggable ? "Drag column header to rearrange" : undefined}
                  className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-bold ${theme.headerTone} ${
                    isColDraggable ? "cursor-grab active:cursor-grabbing hover:brightness-95" : ""
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {isColDraggable && (
                      <GripVertical size={13} className="text-slate-400 opacity-60" />
                    )}
                    <span>{status}</span>
                  </div>
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold">{statusEvents.length}</span>
                </div>

                <div className="space-y-3">
                  {statusEvents.map((event) => (
                    <article
                      key={event.id}
                      onClick={() => onSelectEvent(event)}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow cursor-pointer"
                    >
                      <div className={`h-1 w-full rounded-full ${theme.dot} mb-3`} />
                      <h4 className="text-sm font-bold text-slate-900">{event.title}</h4>
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1">
                          <span>{event.progress}% done</span>
                          <span>👥 {event.memberCount}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${theme.dot}`} style={{ width: `${event.progress}%` }} />
                        </div>
                      </div>
                      <p className="mt-3 text-[11px] font-medium text-slate-500">📅 {event.startDate}</p>
                    </article>
                  ))}

                  {statusEvents.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center text-xs text-slate-400 font-medium">
                      No events
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Calendar View */}
      {viewMode === "calendar" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
              className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100"
            >
              <ChevronLeft size={16} />
            </button>
            <h3 className="text-base font-bold text-slate-900">
              {calendarDate.toLocaleString("en-US", { month: "long", year: "numeric" })}
            </h3>
            <button
              type="button"
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
