"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart2, TrendingUp, Users, CheckCircle2, Zap } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useLogout } from "@/hooks/useLogout";
import { useAuthStore } from "@/store/authStore";
import { getDashboardNavItems } from "@/utils/routes";

function greetingDate() {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());
}

export default function AnalyticsPage() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const authLoading = useAuthStore((state) => state.loading);
  const logout = useLogout();

  useEffect(() => {
    if (!authLoading && !profile) router.replace("/sign-in");
  }, [authLoading, profile, router]);

  if (authLoading || !profile) {
    return <div className="flex min-h-screen items-center justify-center bg-[#eef2f8] text-sm text-slate-500">Loading analytics...</div>;
  }

  const user = {
    name: profile.fullName,
    role: profile.role,
    roleLabel: profile.position ?? profile.role,
    organizationName: "",
    academicYear: "AY 2025–2026",
    greetingDate: greetingDate()
  };

  return (
    <DashboardLayout
      activeNavId="analytics"
      activities={[]}
      goals={[]}
      kpis={[]}
      navItems={getDashboardNavItems(profile.role)}
      notificationCount={2}
      onLogout={logout}
      user={user}
    >
      <section className="mx-auto w-full max-w-[1680px] text-[#12213a]">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[21px] font-bold tracking-[-0.02em]">Analytics &amp; Workload</h1>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Task Completion Rate" value="87.5%" change="+4.2%" icon={CheckCircle2} color="text-emerald-500" />
          <StatCard title="Active Workload" value="24 Tasks" change="Normal" icon={BarChart2} color="text-blue-500" />
          <StatCard title="Team Engagement" value="92%" change="+8.1%" icon={Users} color="text-violet-500" />
          <StatCard title="AI Atomizations" value="18 Goals" change="124 subtasks" icon={Zap} color="text-amber-500" />
        </div>

        <div className="mt-6 rounded-2xl border border-[#dce3ed] bg-white p-8 text-center text-slate-500 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <TrendingUp size={24} />
          </div>
          <h3 className="mt-3 text-base font-bold text-slate-900">Analytics Overview</h3>
          <p className="mt-1 text-xs text-slate-500">Real-time organizational telemetry &amp; task velocity stats are active.</p>
        </div>
      </section>
    </DashboardLayout>
  );
}

function StatCard({ title, value, change, icon: Icon, color }: { title: string; value: string; change: string; icon: any; color: string }) {
  return (
    <div className="rounded-2xl border border-[#dce3ed] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">{title}</span>
        <Icon className={`size-5 ${color}`} />
      </div>
      <p className="mt-3 text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="mt-1 text-[11px] font-medium text-slate-400">{change}</p>
    </div>
  );
}
