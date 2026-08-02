import type { DashboardGoal } from "@/types/dashboard";
import { cn } from "@/utils/cn";

type GoalItemProps = DashboardGoal;

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

export function GoalItem({ title, dueDate, progress, status }: GoalItemProps) {
  return (
    <div className="space-y-3 py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-medium text-slate-900">{title}</h3>
          <p className="mt-1 text-xs font-medium text-slate-500">{dueDate}</p>
        </div>
        <span
          className={cn(
            "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
            statusStyles[status]
          )}
        >
          {status}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full transition-all", progressStyles[status])}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}