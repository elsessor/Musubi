"use client";

import { Award, Briefcase, CheckCircle, Clock3, Target, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
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
import { useAuthStore } from "@/store/authStore";
import { useDashboardUIStore } from "@/store/dashboardUIStore";
import { useNavigationLoading } from "@/app/navigationLoading";
import { DashboardContentSkeleton } from "@/components/ui/RouteSkeleton";

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
  clock: Clock3,
  check: CheckCircle,
  award: Award
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
  const sidebarCollapsed = useDashboardUIStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useDashboardUIStore((state) => state.toggleSidebar);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const profilePicture = useAuthStore((state) => state.profile?.profilePicture ?? null);
  const { navigating } = useNavigationLoading();

  useEffect(() => {
    if (!logoutConfirmOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLogoutConfirmOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [logoutConfirmOpen]);

  const requestLogoutConfirmation = () => setLogoutConfirmOpen(true);
  const confirmLogout = () => {
    setLogoutConfirmOpen(false);
    void onLogout();
  };

  return (
    <div className="h-screen overflow-hidden bg-[#eef1f5] text-slate-900">
      {mobileSidebarOpen ? <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/45 md:hidden" onClick={() => setMobileSidebarOpen(false)} type="button" /> : null}
      <Sidebar
        activeNavId={activeNavId}
        mobileOpen={mobileSidebarOpen}
        collapsed={sidebarCollapsed}
        onLogout={requestLogoutConfirmation}
        onNavigate={() => setMobileSidebarOpen(false)}
        onToggleCollapse={toggleSidebar}
        navItems={navItems}
        role={user.role}
        roleLabel={user.roleLabel}
        userName={user.name}
        profilePicture={profilePicture}
      />

      <div className={cn("flex h-full min-w-0 flex-col overflow-hidden transition-all duration-300", sidebarCollapsed ? "md:ml-20" : "md:ml-64")}>
        <TopHeader
          academicYear={user.academicYear}
          greetingDate={user.greetingDate}
          name={user.name}
          notificationCount={notificationCount}
          organizationName={user.organizationName}
          role={user.role}
          userId={user.id}
          onLogout={requestLogoutConfirmation}
          onMenuToggle={() => setMobileSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {navigating ? <DashboardContentSkeleton /> : children ?? <>
          {kpis.length > 0 ? (
            <section className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-4">
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

      {logoutConfirmOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setLogoutConfirmOpen(false);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            aria-describedby="logout-dialog-description"
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <h2 id="logout-dialog-title" className="text-lg font-bold text-slate-900">Log out?</h2>
            <p id="logout-dialog-description" className="mt-2 text-sm leading-relaxed text-slate-600">
              Are you sure you want to log out of your account?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                autoFocus
                onClick={() => setLogoutConfirmOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                Log out
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
