"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useLogout } from "@/hooks/useLogout";
import { useAuthStore } from "@/store/authStore";
import { getDashboardNavItems } from "@/utils/routes";
import { BarChart2, TrendingUp, Users, Calendar } from "lucide-react";

export default function AnalyticsPage() {
  const profile = useAuthStore((state) => state.profile);
  const logout = useLogout();

  const userRole = profile?.role ?? "Student Leader";

  const user = {
    name: profile?.fullName ?? "User",
    role: userRole,
    roleLabel: profile?.position ?? userRole,
    organizationName: "",
    academicYear: "AY 2025–2026",
    greetingDate: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    }).format(new Date())
  };

  return (
    <DashboardLayout
      activeNavId="analytics"
      activities={[]}
      goals={[]}
      kpis={[]}
      navItems={getDashboardNavItems(userRole)}
      notificationCount={0}
      onLogout={logout}
      user={user}
    >
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.16em] text-blue-600">
            Performance & Insights
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Organization Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track event engagement, task completion rates, and organizational growth metrics.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <BarChart2 className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Task Completion Rate</p>
                <p className="text-2xl font-black text-slate-900">94.2%</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Calendar className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Events Organized</p>
                <p className="text-2xl font-black text-slate-900">12</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Users className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Volunteers</p>
                <p className="text-2xl font-black text-slate-900">48</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/80">
          <TrendingUp className="mx-auto size-12 text-slate-300 mb-3" />
          <h3 className="text-base font-extrabold text-slate-900">Analytics Visualizations Coming Soon</h3>
          <p className="mt-1 text-sm text-slate-500">Detailed charts and exportable reports will be available here.</p>
        </div>
      </section>
    </DashboardLayout>
  );
}
