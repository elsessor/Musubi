"use client";

import { Briefcase, Clock3, Target, UserCheck } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import { KPICard } from "@/components/dashboard/KPICard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { RecentGoals } from "@/components/dashboard/RecentGoals";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopHeader } from "@/components/dashboard/TopHeader";
import type {
  DashboardActivity,
  DashboardGoal,
  DashboardKPI,
  DashboardNavItem,
  DashboardUser
} from "@/types/dashboard";
import { cn } from "@/utils/cn";

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

const kpiIconMap = {
  target: Target,
  briefcase: Briefcase,
  users: UserCheck,
  clock: Clock3
} as const;

export function DashboardLayout({
  user,
  navItems,
  kpis,
  goals,
  activities,
  activeNavId,
  notificationCount,
  onLogout,
  children
}: DashboardLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen overflow-hidden bg-[#eef1f5] text-slate-900">
      {mobileSidebarOpen ? <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/45 md:hidden" onClick={() => setMobileSidebarOpen(false)} type="button" /> : null}
      <Sidebar
        activeNavId={activeNavId}
        mobileOpen={mobileSidebarOpen}
        collapsed={sidebarCollapsed}
        onLogout={onLogout}
        onNavigate={() => setMobileSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        navItems={navItems}
        role={user.role}
        roleLabel={user.roleLabel}
        userName={user.name}
      />

      <div className={cn("flex h-full min-w-0 flex-col overflow-hidden transition-all duration-300", sidebarCollapsed ? "md:ml-20" : "md:ml-[354px]")}>
        <TopHeader
          academicYear={user.academicYear}
          greetingDate={user.greetingDate}
          name={user.name}
          notificationCount={notificationCount}
          organizationName={user.organizationName}
          role={user.role}
          userId={user.id}
          onLogout={onLogout}
          onMenuToggle={() => setMobileSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children ?? <>
          {kpis.length > 0 ? (
            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {kpis.map((kpi) => (
                <KPICard
                  key={kpi.id}
                  color={kpi.accent === "orange" ? "amber" : kpi.accent}
                  icon={kpiIconMap[kpi.icon]}
                  label={kpi.label}
                  value={kpi.value}
                />
              ))}
            </section>
          ) : (
            <section className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/60">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                KPI Overview
              </p>
              <p className="mt-2 text-sm text-slate-500">
                KPI data will appear here once it is connected to a live source.
              </p>
            </section>
          )}

          <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
            <RecentGoals goals={goals} />
            <RecentActivity activities={activities} />
          </section>
          </>}
        </main>
      </div>
    </div>
  );
}
