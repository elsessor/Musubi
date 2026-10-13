"use client";

import { Calendar, ChevronRight, ChevronLeft, ListChecks } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { getStatusTheme, type CustomStatusConfig } from "@/components/events/statusUtils";
import type { Task } from "@/components/events/types";

type MemberActiveSubtaskItem = Task & {
  eventTitle?: string;
  customStatuses?: CustomStatusConfig[];
};

type MemberActiveSubtasksProps = {
  subtasks: MemberActiveSubtaskItem[];
};

export function MemberActiveSubtasks({ subtasks }: MemberActiveSubtasksProps) {
  const [page, setPage] = useState(1);

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(subtasks.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleSubtasks = subtasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const pageStart = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => pageStart + index);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col h-full justify-between">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600" aria-hidden="true"><ListChecks className="size-4" /></span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Active Sub-Tasks
            </h2>
            {subtasks.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white shadow-xs">
                {subtasks.length}
              </span>
            )}
          </div>
          <Link
            href="/dashboard/events"
            className="group inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            View All
            <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {subtasks.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-slate-700">No active sub-tasks assigned</p>
            <p className="mt-1 text-xs text-slate-400">
              When tasks are assigned to you, they will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleSubtasks.map((task) => {
              const statusBadgeClasses = getStatusTheme(task.status || "Pending", task.customStatuses).badge;

              return (
                <div
                  key={task.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 transition-colors hover:bg-slate-50/50 rounded-xl px-2 -mx-2"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1">
                      {task.title || task.description}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {task.eventTitle && (
                        <span className="font-medium text-slate-600 truncate max-w-[240px]">
                          @ {task.eventTitle}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <Calendar size={12} />
                        {task.dueDate || task.deadline || "TBD"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {typeof task.matchPercentage === "number" && task.matchPercentage > 0 && (
                      <span className="text-xs font-bold text-blue-600">
                        {task.matchPercentage}%
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusBadgeClasses}`}
                    >
                      {task.status || "Pending"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-auto border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-slate-500">
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, subtasks.length)} of {subtasks.length}
          </span>
          <nav aria-label="Active sub-tasks pagination" className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous page"
              disabled={currentPage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex size-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>
            {pages.map((number) => (
              <button
                key={number}
                type="button"
                aria-label={`Page ${number}`}
                aria-current={currentPage === number ? "page" : undefined}
                onClick={() => setPage(number)}
                className={`flex size-7 items-center justify-center rounded-lg text-xs font-semibold transition cursor-pointer ${
                  currentPage === number
                    ? "bg-blue-600 text-white shadow-xs"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {number}
              </button>
            ))}
            <button
              type="button"
              aria-label="Next page"
              disabled={currentPage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex size-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
