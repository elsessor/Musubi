"use client";

import { Check, Clock3, Target, Users, Zap } from "lucide-react";

import type { DashboardActivity } from "@/types/dashboard";
import { cn } from "@/utils/cn";

type RecentActivityProps = {
  activities: DashboardActivity[];
};

const iconMap = {
  check: Check,
  users: Users,
  goal: Target,
  spark: Zap,
  assign: Users,
  edit: Clock3
} as const;

const toneStyles: Record<DashboardActivity["icon"], string> = {
  check: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  users: "bg-violet-50 text-violet-600 ring-violet-100",
  goal: "bg-blue-50 text-blue-600 ring-blue-100",
  spark: "bg-amber-50 text-amber-600 ring-amber-100",
  assign: "bg-violet-50 text-violet-600 ring-violet-100",
  edit: "bg-slate-100 text-slate-500 ring-slate-200"
};

function ActivityItem({ title, time, icon }: DashboardActivity) {
  const Icon = iconMap[icon];

  return (
    <div className="flex gap-4">
      <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-full ring-4", toneStyles[icon])}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 pb-4 pt-0.5">
        <p className="text-[15px] font-medium leading-6 text-slate-900">{title}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{time}</p>
      </div>
    </div>
  );
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <article className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
        Recent Activity
      </h2>

      {activities.length > 0 ? (
        <div className="mt-5 space-y-1">
          {activities.map((activity) => (
            <ActivityItem key={activity.id} {...activity} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-700">No activity yet</p>
          <p className="mt-1 text-sm text-slate-500">Activity updates will appear here as work happens.</p>
        </div>
      )}
    </article>
  );
}