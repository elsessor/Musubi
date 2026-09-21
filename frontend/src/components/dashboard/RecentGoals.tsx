"use client";

import Link from "next/link";
import type { DashboardGoal } from "@/types/dashboard";
import { cn } from "@/utils/cn";

type RecentGoalsProps = {
  goals: DashboardGoal[];
};

const statusStyles: Record<DashboardGoal["status"], string> = {
  "In Progress": "border-blue-200 bg-blue-50 text-blue-600",
  Completed: "border-emerald-200 bg-emerald-50 text-emerald-600",
  Pending: "border-amber-200 bg-amber-50 text-amber-600"
};

const progressStyles: Record<DashboardGoal["status"], string> = {
  "In Progress": "bg-blue-500",
  Completed: "bg-emerald-500",
  Pending: "bg-amber-500"
};

function GoalRow({ title, dueDate, progress, status }: DashboardGoal) {
  return (
    <div className="space-y-3 py-5 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-medium text-slate-900">{title}</h3>
          <p className="mt-1 text-xs font-medium text-slate-500">{dueDate}</p>
        </div>
        <span
          className={cn(
            "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
            statusStyles[status]
          )}
        >
          {status}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className={cn("h-full rounded-full", progressStyles[status])} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export function RecentGoals({ goals }: RecentGoalsProps) {
  return (
    <article className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Recent Goals
        </h2>
        <Link className="text-sm font-semibold text-blue-600 transition hover:text-blue-700" href="/dashboard/events">
          View All →
        </Link>
      </div>

      {goals.length > 0 ? (
        <div className="mt-4 divide-y divide-slate-100">
          {goals.map((goal) => (
            <GoalRow key={goal.id} {...goal} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-700">No goals yet</p>
          <p className="mt-1 text-sm text-slate-500">Goals will appear here once they are created.</p>
        </div>
      )}
    </article>
  );
}