import type { ReactNode } from "react";

import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { GoalItem } from "@/components/dashboard/GoalItem";
import { KPICard } from "@/components/dashboard/KPICard";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopHeader } from "@/components/dashboard/TopHeader";
import type {
  DashboardActivity,
  DashboardGoal,
  DashboardKPI,
  DashboardNavItem,
  DashboardUser
} from "@/types/dashboard";

type DashboardLayoutProps = {
  user: DashboardUser;
  navItems: DashboardNavItem[];
  kpis: DashboardKPI[];
  goals: DashboardGoal[];
  activities: DashboardActivity[];
  activeNavId: string;
  notificationCount: number;
  onLogout: () => void;
  children?: ReactNode;
};

export function DashboardLayout({
  user,
  navItems,
  kpis,
  goals,
  activities,
  activeNavId,
  notificationCount,
  onLogout
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900">
      <Sidebar
        activeNavId={activeNavId}
        navItems={navItems}
        onLogout={onLogout}
        roleLabel={user.roleLabel}
        userName={user.name}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader
          academicYear={user.academicYear}
          greetingDate={user.greetingDate}
          name={user.name}
          notificationCount={notificationCount}
          organizationName={user.organizationName}
        />

        <main className="flex-1 px-6 py-5 lg:px-8 lg:py-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <KPICard key={kpi.id} {...kpi} />
            ))}
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[2fr_1fr]">
            <article className="rounded-[20px] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Recent Goals
                </h2>
                <a className="text-sm font-medium text-blue-600 transition hover:text-blue-700" href="#">
                  View All →
                </a>
              </div>

              <div className="mt-3 divide-y divide-slate-100">
                {goals.map((goal) => (
                  <GoalItem key={goal.id} {...goal} />
                ))}
              </div>
            </article>

            <article className="rounded-[20px] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Recent Activity
              </h2>

              <div className="mt-5">
                <ActivityFeed activities={activities} />
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}