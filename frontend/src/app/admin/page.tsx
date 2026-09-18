"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { AdminDashboardView } from "@/components/admin/AdminDashboardView";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AdminDashboardView } from "@/components/admin/AdminDashboardView";
import { useAuthStore } from "@/store/authStore";
import { useLogout } from "@/hooks/useLogout";
import { getDashboardNavItems } from "@/utils/routes";
import type { AuthUserProfile } from "@/types/auth";

function buildAdminUser(profile: AuthUserProfile | null) {
  return {
    name: profile?.fullName ?? "Administrator",
    role: "Admin" as const,
    roleLabel: "System Administrator",
    organizationName: "Campus Operations",
    academicYear: "AY 2025–2026",
    greetingDate: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    }).format(new Date())
  };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const authLoading = useAuthStore((state) => state.loading);
  const logout = useLogout();

  useEffect(() => {
    if (!authLoading) {
      if (!profile) {
        router.replace("/sign-in");
      } else if (profile.role !== "Admin") {
        router.replace("/dashboard");
      }
    }
  }, [authLoading, profile, router]);

  if (authLoading || !profile || profile.role !== "Admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef1f5] text-slate-500">
        Loading admin dashboard...
      </div>
    );
  }

  return (
    <DashboardLayout
      activeNavId="dashboard"
      activities={[]}
      goals={[]}
      kpis={[]}
      navItems={getDashboardNavItems("Admin")}
      notificationCount={0}
      onLogout={logout}
      user={buildAdminUser(profile)}
    >
      <AdminDashboardView />
    </DashboardLayout>
  );
}
