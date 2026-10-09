"use client";

import { Calendar, Plus, Users } from "lucide-react";
import type { Event } from "./types";
import { getStatusTheme, type CustomStatusConfig } from "./statusUtils";

type EventCardProps = {
  event: Event;
  onClick: (event: Event) => void;
  customStatuses?: CustomStatusConfig[];
  compact?: boolean;
};

export function EventCard({ event, onClick, customStatuses, compact = false }: EventCardProps) {
  const theme = getStatusTheme(event.status, customStatuses ?? event.eventCustomStatuses);
  const taskCount = event.tasks.length;

  return (
    <button
      type="button"
      onClick={() => onClick(event)}
      className={`group flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-3 ${compact ? "sm:p-4" : "sm:p-5"} text-left shadow-sm ring-1 ring-slate-100 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-blue-200 focus-visible:outline-2 focus-visible:outline-blue-500`}
    >
      {/* Top row: icon + committee badge + status badge */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500 sm:size-9">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </span>
        <div className="flex min-w-0 max-w-full flex-wrap gap-1.5 sm:justify-end">
          {event.committee && (
            <span className="inline-flex max-w-full items-center break-words rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-200 sm:px-2.5 sm:text-xs">
              {event.committee}
            </span>
          )}
          <span className={`inline-flex max-w-full items-center break-words rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset sm:px-2.5 sm:text-xs ${theme.badge}`}>
            {event.status}
          </span>
        </div>
      </div>

      {/* Title + description */}
      <div className="mt-3 sm:mt-4">
        <h3 className="line-clamp-2 break-words text-xs font-semibold leading-5 text-slate-800 group-hover:text-blue-700 sm:text-sm">{event.title}</h3>
        {!compact && <p className="mt-1 hidden text-xs text-slate-500 sm:line-clamp-2">{event.description}</p>}
      </div>

      {/* Meta: date + members */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] text-slate-500 sm:mt-4 sm:text-xs">
        <span className="flex min-w-0 items-start gap-1 break-words">
          <Calendar size={12} className="shrink-0" />
          {event.startDate}
        </span>
        <span className="flex items-center gap-1">
          <Users size={12} />
          {event.memberCount}
        </span>
        {taskCount > 0 && (
          <span className="inline-flex rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 sm:ml-auto sm:bg-transparent sm:px-0 sm:text-xs sm:text-slate-400">{taskCount} tasks</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-auto w-full pt-3 sm:pt-4">
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
