"use client";

import { Calendar, Plus, Users } from "lucide-react";
import type { Event } from "./types";
import { getStatusTheme, type CustomStatusConfig } from "./statusUtils";

type EventCardProps = {
  event: Event;
  onClick: (event: Event) => void;
  customStatuses?: CustomStatusConfig[];
};

export function EventCard({ event, onClick, customStatuses }: EventCardProps) {
  const theme = getStatusTheme(event.status, customStatuses);
  const taskCount = event.tasks.length;

  return (
    <button
      type="button"
      onClick={() => onClick(event)}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm ring-1 ring-slate-100 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-blue-200 focus-visible:outline-2 focus-visible:outline-blue-500"
    >
      {/* Top row: icon + committee badge + status badge */}
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </span>
        <div className="flex items-center gap-1.5">
          {event.committee && (
            <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">
              {event.committee}
            </span>
          )}
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${theme.badge}`}>
            {event.status}
          </span>
        </div>
      </div>

      {/* Title + description */}
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">{event.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{event.description}</p>
      </div>

      {/* Meta: date + members */}
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          {event.startDate}
        </span>
        <span className="flex items-center gap-1">
          <Users size={12} />
          {event.memberCount}
        </span>
        {taskCount > 0 && (
          <span className="ml-auto text-xs text-slate-400">{taskCount} tasks</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${theme.dot} transition-all`}
            style={{ width: `${event.progress}%` }}
          />
        </div>
        <p className="mt-1.5 text-right text-xs font-medium text-slate-500">{event.progress}%</p>
      </div>
    </button>
  );
}

type CreateEventCardProps = {
  onClick: () => void;
};

export function CreateEventCard({ onClick }: CreateEventCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 p-8 text-slate-400 transition-all hover:border-blue-300 hover:bg-blue-50/40 hover:text-blue-500 focus-visible:outline-2 focus-visible:outline-blue-500"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-current transition-transform group-hover:scale-110">
        <Plus size={20} />
      </span>
      <span className="text-sm font-medium">Create New Event</span>
    </button>
  );
}
