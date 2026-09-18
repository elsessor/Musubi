"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Clock } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useLogout } from "@/hooks/useLogout";
import { useAuthStore } from "@/store/authStore";
import { getDashboardNavItems } from "@/utils/routes";

function greetingDate() {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());
}

export default function NotificationsPage() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const authLoading = useAuthStore((state) => state.loading);
  const logout = useLogout();

  useEffect(() => {
    if (!authLoading && !profile) router.replace("/sign-in");
  }, [authLoading, profile, router]);

  if (authLoading || !profile) {
    return <div className="flex min-h-screen items-center justify-center bg-[#eef2f8] text-sm text-slate-500">Loading notifications...</div>;
  }

  const user = {
    name: profile.fullName,
    role: profile.role,
    roleLabel: profile.position ?? profile.role,
    organizationName: "",
    academicYear: "AY 2025–2026",
    greetingDate: greetingDate()
  };

  const sampleNotifications = [
    {
      id: "1",
      title: "New Task Assigned",
      description: "You have been assigned to 'Culture Week Booth Setup'",
      time: "10 minutes ago",
      unread: true
    },
    {
      id: "2",
      title: "AI Atomization Completed",
      description: "12 subtasks were generated for 'Campus Culture Week'",
      time: "2 hours ago",
      unread: true
    },
    {
      id: "3",
      title: "Organization Update",
      description: "Your organization details were updated by admin.",
      time: "Yesterday",
      unread: false
    }
  ];

  return (
    <DashboardLayout
      activeNavId="notifications"
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
          <h1 className="text-[21px] font-bold tracking-[-0.02em]">Notifications</h1>
        </div>

        <div className="mt-6 space-y-3">
          {sampleNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`flex items-start gap-4 rounded-2xl border p-4 shadow-sm transition-all ${
                notif.unread
                  ? "border-blue-200 bg-blue-50/40"
                  : "border-[#dce3ed] bg-white"
              }`}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Bell size={18} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">{notif.title}</h4>
                  <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                    <Clock size={12} />
                    {notif.time}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{notif.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </DashboardLayout>
  );
}
