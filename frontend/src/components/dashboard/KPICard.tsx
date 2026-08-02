import type { DashboardKPI } from "@/types/dashboard";
import { BriefcaseIcon, ClockIcon, TargetIcon, UsersIcon } from "@/components/dashboard/DashboardIcons";

type KPICardProps = DashboardKPI;

const accentStyles: Record<DashboardKPI["accent"], string> = {
  blue: "bg-blue-50 text-blue-600",
  purple: "bg-violet-50 text-violet-600",
  green: "bg-emerald-50 text-emerald-600",
  orange: "bg-amber-50 text-amber-600"
};

const iconMap = {
  target: TargetIcon,
  briefcase: BriefcaseIcon,
  users: UsersIcon,
  clock: ClockIcon
} as const;

export function KPICard({ label, value, icon, accent }: KPICardProps) {
  const Icon = iconMap[icon];

  return (
    <article className="rounded-[20px] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
      <div className={`flex size-10 items-center justify-center rounded-2xl ${accentStyles[accent]}`}>
        <Icon className="size-5" />
      </div>
      <div className="mt-5">
        <p className="text-[28px] font-semibold leading-none text-slate-900">{value}</p>
        <p className="mt-2 text-sm font-medium text-slate-500">{label}</p>
      </div>
    </article>
  );
}