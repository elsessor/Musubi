"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Bell, CheckCheck, Clock, Megaphone, Sparkles, X } from "lucide-react";
import type { NotificationRecord } from "@/services/notifications.service";
import { useAuthStore } from "@/store/authStore";

type NotificationPanelProps = {
  notifications: NotificationRecord[];
  onClose: () => void;
  onRead: (id: string) => void;
  onReadAll: () => void;
};

export function NotificationPanel({ notifications, onClose, onRead, onReadAll }: NotificationPanelProps) {
  const role = useAuthStore((state) => state.profile?.role);
  const isLeader = role === "Student Leader" || role === "Admin";
  const [tab, setTab] = useState<"all" | "unread">("all");
  const closeRef = useRef<HTMLButtonElement>(null);
  const unreadCount = notifications.filter((item) => item.unread).length;
  const filtered = notifications.filter((item) => tab === "all" || item.unread);
  const groups = [
    { title: "New", items: filtered.filter((item) => item.unread) },
    { title: "Earlier", items: filtered.filter((item) => !item.unread) }
  ];

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <section
      id="header-notifications"
      role="dialog"
      aria-labelledby="header-notifications-title"
      className="absolute right-3 top-full z-40 mt-2 flex max-h-[min(640px,calc(100dvh-112px))] w-[calc(100vw-24px)] max-w-[380px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-xl sm:right-0 sm:mt-3 sm:w-[380px]"
    >
      <div className="shrink-0 px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="header-notifications-title" className="text-xl font-extrabold">Notifications</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close notifications" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2" aria-label="Notification filters">
          {(["all", "unread"] as const).map((value) => (
            <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)} className={`rounded-full px-4 py-2 text-sm font-bold transition ${tab === value ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-100"}`}>
              {value === "all" ? "All" : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>
        <button type="button" onClick={onReadAll} disabled={unreadCount === 0} className="my-3 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline disabled:cursor-default disabled:text-slate-400 disabled:no-underline">
          <CheckCheck className="size-4" /> Mark all as read
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Bell className="mx-auto mb-3 size-8 text-slate-300" />
            <p className="text-sm font-semibold">{tab === "unread" ? "You're all caught up" : "No notifications yet"}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">Your organization updates, task reminders, and announcements will appear here.</p>
          </div>
        ) : groups.map((group) => group.items.length > 0 && (
          <div key={group.title}>
            <h3 className="px-2 pb-2 pt-3 text-sm font-bold">{group.title}</h3>
            {group.items.map((item) => {
              const appearance = item.type === "announcement"
                ? { Icon: isLeader ? Bell : Megaphone, color: "bg-violet-50 text-violet-600" }
                : isLeader
                ? { Icon: Sparkles, color: "bg-blue-50 text-blue-600" }
                : item.nudgeCategory === "deadline"
                ? { Icon: AlertCircle, color: "bg-rose-50 text-rose-600" }
                : item.nudgeCategory === "followup"
                ? { Icon: Clock, color: "bg-amber-50 text-amber-600" }
                : { Icon: Bell, color: "bg-blue-50 text-blue-600" };
              const Icon = appearance.Icon;
              return (
                <button key={item.id} type="button" onClick={() => onRead(item.id)} aria-label={`${item.title}${item.unread ? ", unread. Mark as read" : ""}`} className="flex w-full items-start gap-2 rounded-xl px-2 py-3 text-left transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 sm:gap-3">
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-2xl sm:size-10 ${appearance.color}`}><Icon className="size-5" /></span>
                  <span className="min-w-0 flex-1 break-words">
                    <span className={`block text-sm leading-5 ${item.unread ? "font-bold" : "font-semibold"}`}>{item.title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">{item.description}</span>
                    <span className={`mt-1 block text-xs ${item.unread ? "font-semibold text-blue-600" : "text-slate-400"}`}>{item.time}</span>
                  </span>
                  {item.unread && <span className="mt-4 size-2.5 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-slate-100 p-3">
        <Link href="/dashboard/notifications" onClick={onClose} className="block rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-200">See all notifications</Link>
      </div>
    </section>
  );
}
