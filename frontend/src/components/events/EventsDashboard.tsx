"use client";

import { Calendar, LayoutGrid, List, Plus, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import type { Event, EventStatus } from "./types";
import { CreateEventCard, EventCard } from "./EventCard";

type StatusFilter = EventStatus | "All";

const STATUS_FILTERS: { label: string; key: StatusFilter }[] = [
  { label: "All Events", key: "All" },
  { label: "Active", key: "Active" },
  { label: "Planning", key: "Planning" },
  { label: "Completed", key: "Completed" },
  { label: "Cancelled", key: "Cancelled" },
  { label: "Archived", key: "Archived" }
];

const STATUS_DOT: Record<EventStatus, string> = {
  Active:    "bg-blue-500",
  Planning:  "bg-amber-400",
  Completed: "bg-emerald-500",
  Cancelled: "bg-rose-500",
  Archived:  "bg-slate-400"
};

type EventsDashboardProps = {
  events: Event[];
  onSelectEvent: (event: Event) => void;
  onNewEvent: () => void;
};

export function EventsDashboard({ events, onSelectEvent, onNewEvent }: EventsDashboardProps) {
  const [filter, setFilter] = useState<StatusFilter>("All");

  const activeCount    = events.filter((e) => e.status === "Active").length;
  const planningCount  = events.filter((e) => e.status === "Planning").length;
  const completedCount = events.filter((e) => e.status === "Completed").length;

  const visible = filter === "All" ? events : events.filter((e) => e.status === filter);

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
        <button
          type="button"
          onClick={onNewEvent}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-700"
        >
          <Plus size={15} />
          New Event
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Committee filter */}
          <button type="button" className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
            <SlidersHorizontal size={12} />
            All Committees
          </button>

          {/* Status filter pills */}
          <div className="flex flex-wrap items-center gap-1">
            {STATUS_FILTERS.map(({ label, key }) => {
              const count = key === "All" ? events.length : events.filter((e) => e.status === key).length;
              const isActive = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-slate-900 text-white shadow"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {key !== "All" && (
                    <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-white/70" : STATUS_DOT[key as EventStatus]}`} />
                  )}
                  {label}
                  <span className={`${isActive ? "text-white/70" : "text-slate-400"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* View toggles */}
        <div className="flex items-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          {[
            { icon: LayoutGrid, title: "Grid" },
            { icon: List, title: "List" },
            { icon: Calendar, title: "Calendar" }
          ].map(({ icon: Icon, title }) => (
            <button
              key={title}
              type="button"
              title={title}
              className="px-2.5 py-2 text-slate-500 transition-colors first:rounded-l-xl last:rounded-r-xl hover:bg-slate-100 hover:text-slate-700"
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      {/* Event grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((event) => (
          <EventCard key={event.id} event={event} onClick={onSelectEvent} />
        ))}
        <CreateEventCard onClick={onNewEvent} />
      </div>

      {visible.length === 0 && (
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
    </div>
  );
}
