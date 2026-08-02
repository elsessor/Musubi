import type { DashboardActivity } from "@/types/dashboard";
import {
  CheckIcon,
  ClockIcon,
  SparkIcon,
  TargetIcon,
  UsersIcon
} from "@/components/dashboard/DashboardIcons";
import { cn } from "@/utils/cn";

type ActivityFeedProps = {
  activities: DashboardActivity[];
};

const iconMap = {
  check: CheckIcon,
  users: UsersIcon,
  goal: TargetIcon,
  spark: SparkIcon,
  assign: UsersIcon,
  edit: ClockIcon
} as const;

const toneStyles: Record<DashboardActivity["icon"], string> = {
  check: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  users: "bg-violet-50 text-violet-600 ring-violet-100",
  goal: "bg-blue-50 text-blue-600 ring-blue-100",
  spark: "bg-amber-50 text-amber-600 ring-amber-100",
  assign: "bg-violet-50 text-violet-600 ring-violet-100",
  edit: "bg-slate-100 text-slate-500 ring-slate-200"
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="space-y-5">
      {activities.map((activity, index) => {
        const Icon = iconMap[activity.icon];

        return (
          <div className="flex gap-4" key={activity.id}>
            <div className="relative flex flex-col items-center">
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-full ring-4",
                  toneStyles[activity.icon]
                )}
              >
                <Icon className="size-4" />
              </div>
              {index < activities.length - 1 ? (
                <span className="mt-2 h-full w-px flex-1 bg-slate-100" />
              ) : null}
            </div>
            <div className="pb-4 pt-0.5">
              <p className="text-[15px] font-medium text-slate-900">{activity.title}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">{activity.time}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}