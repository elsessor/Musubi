"use client";

import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { EventsTasksView } from "@/components/events/EventsTasksView";
import { getFirebaseDb } from "@/firebase/config";
import { useLogout } from "@/hooks/useLogout";
import { useAuthStore } from "@/store/authStore";
import type { AuthUserProfile } from "@/types/auth";
import { getDashboardNavItems } from "@/utils/routes";

function formatGreetingDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function buildDashboardUser(profile: AuthUserProfile | null) {
  const role = profile?.role ?? "Student Leader";
  return {
    name: profile?.fullName ?? "User",
    role,
    roleLabel: profile?.position ?? role,
    organizationName: "",
    academicYear: "AY 2025–2026",
    greetingDate: formatGreetingDate()
  };
}

export function EventsPage() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const logout = useLogout();
  const [dashboardUser, setDashboardUser] = useState(() => buildDashboardUser(profile));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      const uid = profile?.uid ?? firebaseUser?.uid;
      if (!uid) {
        if (!cancelled) { setDashboardUser(buildDashboardUser(profile)); setLoading(false); }
        return;
      }
      try {
        const snapshot = await getDoc(doc(getFirebaseDb(), "users", uid));
        const data = snapshot.exists() ? snapshot.data() : null;
        const role =
          data?.role === "Admin" || data?.role === "Student Leader" || data?.role === "Organization Member"
            ? data.role : profile?.role ?? "Student Leader";
        const fullName = typeof data?.fullName === "string" ? data.fullName : profile?.fullName ?? "User";
        if (!cancelled) {
          setDashboardUser({
            name: fullName,
            role,
            roleLabel: typeof data?.position === "string" && data.position.trim() ? data.position : role,
            organizationName: typeof data?.organizationName === "string" ? data.organizationName : "",
            academicYear: "AY 2025–2026",
            greetingDate: formatGreetingDate()
          });
        }
      } catch {
        if (!cancelled) setDashboardUser(buildDashboardUser(profile));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadUser();
    return () => { cancelled = true; };
  }, [firebaseUser?.uid, profile]);

  useEffect(() => {
    if (!loading && dashboardUser.role === "Admin") {
      router.replace("/admin");
    }
  }, [dashboardUser.role, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef1f5] text-slate-500">
        Loading…
      </div>
    );
  }

  return (
    <DashboardLayout
      activeNavId="events"
      activities={[]}
      goals={[]}
      kpis={[]}
      navItems={getDashboardNavItems(dashboardUser.role)}
      notificationCount={2}
      onLogout={logout}
      user={dashboardUser}
    >
      <EventsTasksView />
    </DashboardLayout>
  );
}
