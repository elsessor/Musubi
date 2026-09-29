"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AdminOrganizationDetailView } from "@/components/admin/AdminOrganizationDetailView";
import { useAuthStore } from "@/store/authStore";
import { useLogout } from "@/hooks/useLogout";
import { getDashboardNavItems } from "@/utils/routes";

export function OrganizationDetailClient() {
  const params = useParams<{ organizationId: string }>();
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const authLoading = useAuthStore((state) => state.loading);
  const logout = useLogout();

  const [activeOrgId, setActiveOrgId] = useState<string>("");

  useEffect(() => {
    let orgId = params?.organizationId;
    if (!orgId || orgId === "index" || orgId === "detail" || orgId === "org-1") {
      if (typeof window !== "undefined") {
        const parts = window.location.pathname.split("/").filter(Boolean);
        const orgIdx = parts.indexOf("organizations");
        if (orgIdx !== -1 && parts[orgIdx + 1] && parts[orgIdx + 1] !== "index" && parts[orgIdx + 1] !== "detail") {
          orgId = parts[orgIdx + 1];
        }
      }
    }
    setActiveOrgId(orgId || "org-1");
  }, [params]);

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
        Loading organization details...
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
      <AdminOrganizationDetailView organizationId={activeOrgId} />
    </DashboardLayout>
  );
}
