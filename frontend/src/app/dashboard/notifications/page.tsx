"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Bot, CheckCheck, Clock, Sparkles, UserCheck } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useLogout } from "@/hooks/useLogout";
import { useAuthStore } from "@/store/authStore";
import { getDashboardNavItems } from "@/utils/routes";
import {
  subscribeNotificationsFirestore,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationRecord
} from "@/services/notifications.service";

function greetingDate() {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());
}

export default function NotificationsPage() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const authLoading = useAuthStore((state) => state.loading);
  const logout = useLogout();

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !profile) router.replace("/sign-in");
  }, [authLoading, profile, router]);

  useEffect(() => {
    if (!firebaseUser || !profile) return;
    setLoading(true);

    const unsubscribe = subscribeNotificationsFirestore(firebaseUser, profile.organizationId, (realtimeNotifs) => {
      setNotifications(realtimeNotifs);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [firebaseUser, profile]);

  if (authLoading || !profile) {
    return <div className="flex min-h-screen items-center justify-center bg-[#eef2f8] text-sm text-slate-500">Loading notifications...</div>;
  }

  const unreadCount = notifications.filter((n) => n.unread).length;

  const user = {
    id: profile.uid,
    name: profile.fullName,
    role: profile.role,
    roleLabel: profile.position ?? profile.role,
    organizationName: profile.organizationName ?? "",
    academicYear: "AY 2025–2026",
    greetingDate: greetingDate()
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    void markNotificationAsRead(firebaseUser, id);
  };

  const handleMarkAllAsRead = () => {
    const unreadIds = notifications.filter((n) => n.unread).map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    void markAllNotificationsAsRead(firebaseUser, unreadIds);
  };

  return (
    <DashboardLayout
      activeNavId="notifications"
      activities={[]}
      goals={[]}
      kpis={[]}
      navItems={getDashboardNavItems(profile.role)}
      notificationCount={unreadCount}
      onLogout={logout}
      user={user}
    >
      <section className="mx-auto w-full max-w-[1680px] text-[#12213a]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[21px] font-bold tracking-[-0.02em]">Notifications</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "You're all caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#244775] shadow-sm transition hover:bg-slate-50"
            >
              <CheckCheck className="size-4" />
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl border border-[#dce3ed] bg-white p-10 text-center text-sm text-slate-500">
            Fetching real-time notifications...
          </div>
        ) : notifications.length > 0 ? (
          <div className="mt-6 space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleMarkAsRead(notif.id)}
                className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 shadow-sm transition-all ${
                  notif.unread
                    ? "border-blue-200 bg-blue-50/50 ring-1 ring-blue-100"
                    : "border-[#dce3ed] bg-white hover:border-slate-300"
                }`}
              >
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                    notif.type === "ai"
                      ? "bg-violet-100 text-violet-600"
                      : notif.type === "task"
                      ? "bg-emerald-100 text-emerald-600"
                      : notif.type === "organization"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {notif.type === "ai" ? (
                    <Bot size={19} />
                  ) : notif.type === "task" ? (
                    <Sparkles size={19} />
                  ) : notif.type === "organization" ? (
                    <UserCheck size={19} />
                  ) : (
                    <Bell size={19} />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{notif.title}</h4>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                      <Clock size={12} />
                      {notif.time}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">{notif.description}</p>
                </div>
                {notif.unread && (
                  <span className="mt-1 size-2.5 shrink-0 rounded-full bg-blue-600" title="Unread" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Bell className="size-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">No notifications yet</h3>
            <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">
              Updates about your tasks, organization changes, and AI atomization will appear here in real time.
            </p>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
