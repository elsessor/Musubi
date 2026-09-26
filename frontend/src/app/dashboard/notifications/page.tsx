"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bell,
  Bot,
  Calendar,
  CheckCheck,
  ChevronRight,
  Clock,
  HelpCircle,
  Megaphone,
  Pin,
  Sparkles,
  Tag,
  UserCheck,
  X
} from "lucide-react";
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

type NotificationTab = "all" | "announcements" | "nudges" | "ratings";

function greetingDate() {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());
}

function formatDisplayDate(raw?: string | null) {
  if (!raw) return "Recent";
  if (typeof raw === "string" && raw.includes("T") && !isNaN(Date.parse(raw))) {
    try {
      const d = new Date(raw);
      return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
    } catch {
      return raw;
    }
  }
  return raw;
}

export default function NotificationsPage() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const authLoading = useAuthStore((state) => state.loading);
  const logout = useLogout();

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NotificationTab>("all");
  const [selectedNotif, setSelectedNotif] = useState<NotificationRecord | null>(null);

  useEffect(() => {
    if (!authLoading && !profile) router.replace("/sign-in");
  }, [authLoading, profile, router]);

  useEffect(() => {
    if (!profile) return;
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

  const isLeader = profile.role === "Student Leader" || profile.role === "Admin";

  const unreadCount = notifications.filter((n) => n.unread).length;
  const announcementsCount = notifications.filter((n) => n.type === "announcement").length;
  const activityCount = notifications.filter((n) => n.type !== "announcement").length;
  const nudgesCount = notifications.filter((n) => n.type === "nudge" || n.type === "task").length;
  const ratingsCount = notifications.filter((n) => n.type === "system").length;

  const filteredNotifs = notifications.filter((n) => {
    if (isLeader) {
      if (activeTab === "announcements") return n.type === "announcement";
      if (activeTab === ("activity" as any) || activeTab === "nudges") return n.type !== "announcement";
      return true;
    }
    if (activeTab === "announcements") return n.type === "announcement";
    if (activeTab === "nudges") return n.type === "nudge" || n.type === "task";
    if (activeTab === "ratings") return n.type === "system";
    return true;
  });

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
        {/* Header Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-[21px] font-bold tracking-[-0.02em] text-slate-900">Notifications</h1>
            {unreadCount > 0 ? (
              <span className="inline-flex items-center rounded-full bg-[#2563eb] px-2.5 py-0.5 text-xs font-bold text-white shadow-2xs">
                {unreadCount} new
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="text-xs font-bold text-[#2563eb] hover:text-blue-700 transition self-start sm:self-auto"
          >
            Mark all as read
          </button>
        </div>

        {/* Filter Tabs Pill Bar (Student Leader vs Member View) */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
              activeTab === "all"
                ? "bg-[#1e3a5f] text-white shadow-2xs"
                : "bg-[#f0f4f8] text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            All <span className="ml-1 opacity-80">{notifications.length}</span>
          </button>

          {isLeader ? (
            <>
              <button
                type="button"
                onClick={() => setActiveTab("activity" as any)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                  activeTab === ("activity" as any)
                    ? "bg-[#1e3a5f] text-white shadow-2xs"
                    : "bg-[#f0f4f8] text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                Activity <span className="ml-1 opacity-80">{activityCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("announcements")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                  activeTab === "announcements"
                    ? "bg-[#1e3a5f] text-white shadow-2xs"
                    : "bg-[#f0f4f8] text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                Announcements <span className="ml-1 opacity-80">{announcementsCount}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveTab("announcements")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                  activeTab === "announcements"
                    ? "bg-[#1e3a5f] text-white shadow-2xs"
                    : "bg-[#f0f4f8] text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                Announcements <span className="ml-1 opacity-80">{announcementsCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("nudges")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                  activeTab === "nudges"
                    ? "bg-[#1e3a5f] text-white shadow-2xs"
                    : "bg-[#f0f4f8] text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                Nudges <span className="ml-1 opacity-80">{nudgesCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("ratings")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                  activeTab === "ratings"
                    ? "bg-[#1e3a5f] text-white shadow-2xs"
                    : "bg-[#f0f4f8] text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                Ratings <span className="ml-1 opacity-80">{ratingsCount}</span>
              </button>
            </>
          )}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="mt-6 rounded-2xl border border-[#dce3ed] bg-white p-10 text-center text-sm text-slate-500">
            Fetching real-time notifications...
          </div>
        ) : filteredNotifs.length > 0 ? (
          <div className="mt-6 space-y-3">
            {filteredNotifs.map((notif) => {
              const isAnnouncement = notif.type === "announcement";
              const isDeadlineAlert = notif.nudgeCategory === "deadline";
              const isFollowup = notif.nudgeCategory === "followup";

              // ── Student Leader View Rendering (Matching Picture 2) ──────────────────────────
              if (isLeader) {
                if (isAnnouncement) {
                  return (
                    <div
                      key={notif.id}
                      onClick={() => {
                        handleMarkAsRead(notif.id);
                        setSelectedNotif(notif);
                      }}
                      className="group flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs transition hover:border-slate-300 hover:shadow-md cursor-pointer"
                    >
                      <div className="flex items-center gap-4 min-w-0 pr-4">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                          <Bell className="size-5" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center rounded-full bg-violet-100/80 px-2.5 py-0.5 text-[11px] font-bold text-violet-700">
                              Announcement
                            </span>
                            {notif.isPinned && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-600 border border-rose-200/60">
                                <span>📌</span> Pinned
                              </span>
                            )}
                            <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                              {notif.targetAudience || "All Members"}
                            </span>
                            {notif.unread && (
                              <span className="size-2 rounded-full bg-blue-600 shrink-0" title="Unread" />
                            )}
                          </div>
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition truncate">
                            {notif.title}
                          </h3>
                          <p className="text-xs font-medium text-slate-400">
                            Posted {formatDisplayDate(notif.createdAt || notif.time)}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition shrink-0" />
                    </div>
                  );
                }

                // Activity Notification Item for Leader
                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      handleMarkAsRead(notif.id);
                      setSelectedNotif(notif);
                    }}
                    className="group flex items-start gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs transition hover:border-slate-300 hover:shadow-md cursor-pointer"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mt-0.5">
                      <Sparkles className="size-5" />
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center rounded-full bg-blue-100/80 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                          Activity
                        </span>
                        {notif.unread && (
                          <span className="size-2 rounded-full bg-blue-600 shrink-0" title="Unread" />
                        )}
                      </div>

                      <p className="text-sm font-semibold text-slate-800 leading-snug">
                        {notif.title.includes(":") || notif.title.includes("alert") || notif.title.includes("due")
                          ? notif.title
                          : isDeadlineAlert
                          ? `Deadline approaching: '${notif.title}' is due soon. Consider following up with team members.`
                          : isFollowup
                          ? `Sub task '${notif.title}' has been pending. No progress logged.`
                          : `${notif.title} ${notif.description ? `- ${notif.description}` : ""}`}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-slate-400 font-medium pt-0.5">
                        <span>{formatDisplayDate(notif.time || notif.createdAt)}</span>
                        <span className="inline-flex items-center gap-1 font-bold text-blue-600">
                          <Calendar className="size-3.5" />
                          {notif.description.replace(/^@\s*/, "") || "Task Activity"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              // ── Organization Member View Rendering (Modern elevated card layout) ───────────────
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    handleMarkAsRead(notif.id);
                    setSelectedNotif(notif);
                  }}
                  className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4.5 sm:p-5 shadow-2xs transition-all duration-200 hover:border-blue-200 hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1 pr-3">
                    {/* Left Icon Badge */}
                    {isAnnouncement ? (
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 border border-violet-100 shadow-2xs group-hover:bg-violet-100/80 group-hover:scale-105 transition-all">
                        <Megaphone className="size-5" />
                      </div>
                    ) : isDeadlineAlert ? (
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 shadow-2xs group-hover:bg-rose-100/80 group-hover:scale-105 transition-all">
                        <AlertCircle className="size-5" />
                      </div>
                    ) : isFollowup ? (
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 shadow-2xs group-hover:bg-amber-100/80 group-hover:scale-105 transition-all">
                        <Clock className="size-5" />
                      </div>
                    ) : (
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs group-hover:bg-blue-100/80 group-hover:scale-105 transition-all">
                        <Bell className="size-5" />
                      </div>
                    )}

                    {/* Content Details */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* Badge / Header Row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {isAnnouncement ? (
                          <>
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-700 border border-violet-200/70">
                              <Bell className="size-3" /> Announcement
                            </span>
                            {notif.isPinned && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-extrabold text-rose-600 border border-rose-200/80">
                                <span>📌</span> Pinned
                              </span>
                            )}
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 border border-slate-200/60">
                              {notif.targetAudience || "All Members"}
                            </span>
                          </>
                        ) : isDeadlineAlert ? (
                          <>
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-600 border border-rose-200/70">
                              <AlertCircle className="size-3 text-rose-500" /> Deadline Alert
                            </span>
                            {notif.description?.includes("@") && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                <Tag className="size-3 text-slate-500" />
                                {notif.description.match(/@[^\s,]+/)?.[0] || notif.description}
                              </span>
                            )}
                          </>
                        ) : isFollowup ? (
                          <>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200/70">
                              <Clock className="size-3 text-amber-600" /> Follow-up
                            </span>
                            {notif.description?.includes("@") && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                <Tag className="size-3 text-slate-500" />
                                {notif.description.match(/@[^\s,]+/)?.[0] || notif.description}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200/70">
                            <Sparkles className="size-3" /> Notification
                          </span>
                        )}

                        {notif.unread && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                            NEW
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                        {notif.title}
                      </h3>

                      {/* Meta Footer */}
                      <p className="text-xs font-medium text-slate-400 flex items-center gap-2 flex-wrap">
                        {notif.authorName && (
                          <span>From <strong className="text-slate-600 font-semibold">{notif.authorName}</strong></span>
                        )}
                        {notif.authorName && (notif.createdAt || notif.time) && <span>•</span>}
                        <span>{formatDisplayDate(notif.createdAt || notif.time)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center size-8 rounded-full bg-slate-50 border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-all shrink-0">
                    <ChevronRight className="size-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Bell className="size-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">No notifications yet</h3>
            <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">
              Updates about your announcements, tasks, and organization changes will appear here in real time.
            </p>
          </div>
        )}
      </section>

      {/* Selected Notification Detail Modal */}
      {selectedNotif && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedNotif(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedNotif.isPinned && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 text-[11px] font-bold text-rose-600">
                      <span>📌</span> Pinned
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-700 border border-violet-200">
                    {selectedNotif.type === "announcement" ? "Announcement" : "System Alert"}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 leading-snug">
                  {selectedNotif.title}
                </h2>
                <p className="text-xs font-medium text-slate-400">
                  {selectedNotif.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition shrink-0"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap border border-slate-100 max-h-80 overflow-y-auto">
              {selectedNotif.content || selectedNotif.description || selectedNotif.title}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
