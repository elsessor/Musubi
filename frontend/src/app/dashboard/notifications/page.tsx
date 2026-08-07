"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useLogout } from "@/hooks/useLogout";
import { useAuthStore } from "@/store/authStore";
import { getDashboardNavItems } from "@/utils/routes";
import { Bell, CheckCircle2 } from "lucide-react";

export default function NotificationsPage() {
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
      activeNavId="notifications"
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
            Updates &amp; Alerts
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            Stay updated with system activity, assigned tasks, and organization approvals.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/80">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
            <CheckCircle2 className="size-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">You&apos;re all caught up!</h3>
          <p className="mt-1 text-sm text-slate-500">There are no new unread notifications at this time.</p>
        </div>
      </section>
    </DashboardLayout>
  );
}
