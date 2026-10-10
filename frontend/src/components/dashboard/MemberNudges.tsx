"use client";

import { AlertCircle, Clock, ChevronRight, Bell } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { checkAndDispatchDueNudges } from "@/services/notifications.service";
import { useToastStore } from "@/store/toastStore";

export type NudgeItem = {
  id: string;
  type: "Deadline Alert" | "Follow-up" | "Reminder" | (string & {});
  title: string;
  date: string;
  eventTitle?: string;
  taskId?: string;
  eventId?: string;
};

type MemberNudgesProps = {
  nudges: NudgeItem[];
};

export function MemberNudges({ nudges }: MemberNudgesProps) {
  const [checking, setChecking] = useState(false);

  async function handleCheckAndDispatch() {
    setChecking(true);
    try {
      const res = await checkAndDispatchDueNudges();
      if (res.success) {
        useToastStore.getState().showToast({
          title: "Nudges Evaluated",
          description: `Checked deadlines. ${res.processedCount || 0} email nudge(s) dispatched.`,
          tone: "success"
        });
      } else {
        useToastStore.getState().showToast({
          title: "Check Failed",
          description: res.error || "Could not check due nudges.",
          tone: "error"
        });
      }
    } catch (e: any) {
      useToastStore.getState().showToast({
        title: "Error",
        description: e.message || "Failed to trigger nudges check.",
        tone: "error"
      });
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Nudges
          </h2>
          {nudges.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white shadow-xs">
              {nudges.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCheckAndDispatch}
            disabled={checking}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
            title="Check and dispatch due 3-day and 1-day prior nudges"
          >
            <Bell size={12} className="text-blue-600" />
            {checking ? "Checking..." : "Check Nudges"}
          </button>
          <Link
            href="/dashboard/notifications"
            className="group inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            View All
            <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {nudges.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
            <Bell size={18} />
          </div>
          <p className="text-sm font-semibold text-slate-700">No active nudges</p>
          <p className="mt-1 text-xs text-slate-400">
            You&apos;re all caught up! Deadline alerts and follow-ups will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {nudges.map((nudge) => {
            const isDeadline = nudge.type === "Deadline Alert" || nudge.type.includes("1 Day");
            const isFollowUp = nudge.type === "Follow-up" || nudge.type.includes("3 Days");

            const cardClasses = isDeadline
              ? "bg-rose-50/60 border-rose-100 hover:border-rose-200"
              : isFollowUp
              ? "bg-amber-50/40 border-amber-100 hover:border-amber-200"
              : "bg-blue-50/40 border-blue-100 hover:border-blue-200";

            const badgeTextClasses = isDeadline
              ? "text-rose-600"
              : isFollowUp
              ? "text-amber-600"
              : "text-blue-600";

            const Icon = isDeadline ? AlertCircle : Clock;

            return (
              <div
                key={nudge.id}
                className={`rounded-xl border p-3.5 transition-all hover:shadow-xs ${cardClasses}`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Icon size={14} className={badgeTextClasses} />
                  <span className={badgeTextClasses}>{nudge.type}</span>
                  <span className="text-slate-300">•</span>
                </div>
                <h4 className="mt-1 text-xs font-semibold text-slate-800 leading-snug">
                  {nudge.title}
                </h4>
                {nudge.eventTitle && (
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                    @ {nudge.eventTitle}
                  </p>
                )}
                <p className="mt-1 text-[11px] font-medium text-slate-400">
                  {nudge.date}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
