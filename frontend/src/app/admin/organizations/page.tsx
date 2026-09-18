"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AdminOrganizationsView } from "@/components/admin/AdminOrganizationsView";
import { useAuthStore } from "@/store/authStore";
import { useLogout } from "@/hooks/useLogout";
import { getDashboardNavItems } from "@/utils/routes";

export default function AdminOrganizationsPage() {
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
        Loading organizations...
      </div>
    );
  }

  const user = {
    name: profile.fullName,
    role: "Admin" as const,
    roleLabel: profile.position ?? "Administrator",
    organizationName: "University Campus",
    academicYear: "",
    greetingDate: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    }).format(new Date())
  };

  return (
    <DashboardLayout
      activeNavId="organizations"
      activities={[]}
      goals={[]}
      kpis={[]}
      navItems={getDashboardNavItems("Admin")}
      notificationCount={0}
      onLogout={logout}
      user={user}
    >
      <AdminOrganizationsView />
    </DashboardLayout>
  );
}
