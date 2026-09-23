"use client";

import { Calendar, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Task } from "@/components/events/types";

type MemberActiveSubtaskItem = Task & {
  eventTitle?: string;
};

type MemberActiveSubtasksProps = {
  subtasks: MemberActiveSubtaskItem[];
};

export function MemberActiveSubtasks({ subtasks }: MemberActiveSubtasksProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Active Sub-Tasks
        </h2>
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
          {subtasks.map((task) => {
            const statusLower = (task.status || "to do").toLowerCase();
            const isInProgress = statusLower.includes("progress");
            const isCompleted = statusLower.includes("completed") || statusLower.includes("done");
            const isInReview = statusLower.includes("review");

            const statusBadgeClasses = isCompleted
              ? "bg-emerald-50 text-emerald-600 ring-emerald-200/80"
              : isInProgress
              ? "bg-blue-50 text-blue-600 ring-blue-200/80"
              : isInReview
              ? "bg-indigo-50 text-indigo-600 ring-indigo-200/80"
              : "bg-amber-50 text-amber-600 ring-amber-200/80";

            return (
              <div
                key={task.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 transition-colors hover:bg-slate-50/50 rounded-xl px-2 -mx-2"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
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
  );
}
