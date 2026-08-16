"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AdminOrgRequestsView } from "@/components/admin/AdminOrgRequestsView";
import { getOrganizationRequests } from "@/services/auth.service";
import { useLogout } from "@/hooks/useLogout";
import { useAuthStore } from "@/store/authStore";
import { getDashboardNavItems } from "@/utils/routes";

export default function AdminOrgRequestsPage() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const loading = useAuthStore((state) => state.loading);
  const logout = useLogout();
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const [pendingCount, setPendingCount] = useState(2);

  useEffect(() => {
    if (!loading && (!profile || profile.role !== "Admin")) {
      router.replace(profile ? "/dashboard" : "/sign-in");
    }
  }, [loading, profile, router]);

  useEffect(() => {
    if (!profile || profile.role !== "Admin" || !firebaseUser) return;
    void getOrganizationRequests(firebaseUser)
      .then((records) => {
        const count = records.filter((r) => r.status === "pending").length;
        setPendingCount(count);
      })
      .catch(() => {});
  }, [firebaseUser, profile]);

  if (loading || !profile || profile.role !== "Admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef1f5] text-slate-500">
        Loading organization requests...
      </div>
    );
  }

  const navItems = getDashboardNavItems("Admin").map((item) =>
    item.id === "org-requests" ? { ...item, badge: pendingCount || undefined } : item
  );

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
      activeNavId="org-requests"
      activities={[]}
      goals={[]}
      kpis={[]}
      navItems={navItems}
      notificationCount={0}
      onLogout={logout}
      user={user}
    >
      <AdminOrgRequestsView />
    </DashboardLayout>
  );
}
