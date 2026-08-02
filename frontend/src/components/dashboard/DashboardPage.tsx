"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { dashboardActivities, dashboardGoals, dashboardKpis, dashboardNavItems, dashboardUser } from "@/components/dashboard/dashboard.mock";
import { useLogout } from "@/hooks/useLogout";
import { useAuthStore } from "@/store/authStore";

export function DashboardPage() {
  const profile = useAuthStore((state) => state.profile);
  const logout = useLogout();

  const displayName = profile?.fullName ?? dashboardUser.name;

  return (
    <DashboardLayout
      activeNavId="dashboard"
      activities={dashboardActivities}
      goals={dashboardGoals}
      kpis={dashboardKpis}
      navItems={dashboardNavItems}
      notificationCount={2}
      onLogout={logout}
      user={{
        ...dashboardUser,
        name: displayName
      }}
    />
  );
}