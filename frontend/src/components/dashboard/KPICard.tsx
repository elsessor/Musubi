"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/utils/cn";

export type KPICardProps = {
  icon: LucideIcon;
  value: number | string;
  label: string;
  color: "blue" | "purple" | "green" | "amber";
};

const accentStyles: Record<KPICardProps["color"], string> = {
  blue: "bg-blue-50 text-blue-600",
  purple: "bg-violet-50 text-violet-600",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600"
};

export function KPICard({ label, value, icon: Icon, color }: KPICardProps) {
  return (
    <article className="min-h-[132px] min-w-0 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:min-h-[172px] sm:p-6 lg:min-h-[207px] lg:p-8">
      <div className={cn("flex size-9 items-center justify-center rounded-full sm:size-11", accentStyles[color])}>
        <Icon className="size-4 sm:size-5" />
      </div>
      <div className="mt-3 sm:mt-5 lg:mt-6">
        <p className="break-words text-2xl font-semibold leading-none tracking-tight text-slate-900 sm:text-[32px]">{value}</p>
        <p className="mt-2 break-words text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
      </div>
    </article>
  );
}
