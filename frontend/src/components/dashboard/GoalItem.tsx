import { getStatusTheme } from "@/components/events/statusUtils";
import type { DashboardGoal } from "@/types/dashboard";
import { cn } from "@/utils/cn";

type GoalItemProps = DashboardGoal;


export function GoalItem({ title, dueDate, progress, status, customStatuses }: GoalItemProps) {
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
            getStatusTheme(status, customStatuses).badge
          )}
        >
          {status}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full transition-all", getStatusTheme(status, customStatuses).dot)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}