"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/utils/cn";

export type KPICardProps = {
  icon: LucideIcon;
  value: number;
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
    <article className="min-h-[172px] rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 lg:min-h-[207px] lg:p-8">
      <div className={cn("flex size-11 items-center justify-center rounded-full", accentStyles[color])}>
        <Icon className="size-5" />
      </div>
      <div className="mt-5 lg:mt-6">
        <p className="text-[32px] font-semibold leading-none tracking-tight text-slate-900">{value}</p>
        <p className="mt-2 text-sm font-medium text-slate-500">{label}</p>
      </div>
    </article>
  );
}
