"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useDashboardUser } from "@/hooks/useDashboardUser";
import { useLogout } from "@/hooks/useLogout";
import { getDashboardNavItems } from "@/utils/routes";

export function DashboardPage() {
  const router = useRouter();
  const logout = useLogout();
  const { dashboardUser, loading } = useDashboardUser();

  useEffect(() => {
    if (!loading && dashboardUser.role === "Admin") {
      router.replace("/admin");
    }
  }, [dashboardUser.role, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef1f5] text-slate-500 font-semibold text-sm">
        Loading dashboard...
      </div>
    );
  }

  return (
    <DashboardLayout
      activeNavId="dashboard"
      activities={[]}
      goals={[]}
      kpis={[]}
      navItems={getDashboardNavItems(dashboardUser.role)}
      notificationCount={2}
      onLogout={logout}
      user={dashboardUser}
    />
  );
}
