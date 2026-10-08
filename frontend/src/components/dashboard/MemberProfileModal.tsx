"use client";

import { getStatusTheme, type CustomStatusConfig } from "@/components/events/statusUtils";
import { X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { AvailabilityBadge } from "./AvailabilityBadge";
import { MemberAvatar } from "./MemberAvatar";

export type MemberProfile = {
  id?: string;
  initials: string;
  name: string;
  profilePicture?: string | null;
  role: string;
  committee: string;
  skills: string[];
  workload: number;
  reliability: string;
  availability: string;
  assignedTasks?: Array<{
    id: string;
    eventId?: string;
    dueDate?: string;
    deadline?: string;
    completedAt?: string | null;
    title: string;
    eventTitle?: string;
    customStatuses?: CustomStatusConfig[];
    status: string;
    matchPercentage?: number;
    performanceReview?: { rating: number; reviewerUID?: string; reviewedAt?: string } | null;
  }>;
};

export function MemberProfileModal({
  member,
  onClose
}: {
  member: MemberProfile;
  onClose: () => void;
}) {
  const viewerUID = useAuthStore((state) => state.firebaseUser?.uid || state.profile?.uid);
  const viewerRole = useAuthStore((state) => state.profile?.role);
  const canViewPerformance = viewerRole === "Student Leader" || viewerRole === "Admin" || Boolean(viewerUID && viewerUID === member.id);
  const workloadColor =
    member.workload >= 80 ? "bg-rose-500" : member.workload >= 50 ? "bg-amber-400" : "bg-emerald-500";
  const assignedTasks = member.assignedTasks ?? [];
  const visibleTasks = assignedTasks.slice(0, 3);
  const remainingTaskCount = Math.max(0, assignedTasks.length - visibleTasks.length);
  const returnTo = typeof window === "undefined" ? "/dashboard/organization?tab=members" : window.location.pathname + window.location.search;
  const fullProfileHref = viewerUID === member.id ? `/dashboard/profile?${new URLSearchParams({ returnTo })}`
    : `/dashboard/organization/member-profile?${new URLSearchParams({ memberId: member.id || "", returnTo })}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-profile-title"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <MemberAvatar member={member} className="size-12 rounded-2xl shadow-sm" fallbackClassName="rounded-2xl text-base" />
            <div>
              <h2 id="member-profile-title" className="text-base font-bold text-slate-900 leading-tight">
                {member.name}
              </h2>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">{member.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="space-y-4 p-6 overflow-y-auto">
          {/* Committee */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Committee</p>
            <p className="mt-1 text-xs font-bold text-violet-700 bg-violet-50 border border-violet-100 px-3 py-1 rounded-full inline-block">
              {member.committee}
            </p>
          </div>

          {/* Onboarding Skills */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Onboarding Skills</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {member.skills && member.skills.length > 0 ? (
                member.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-[#f0f4f8] border border-blue-100/60 px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs font-medium text-slate-400">No skills listed.</span>
              )}
            </div>
          </div>

          {/* Realtime Stats Bar */}
          <div className={`grid ${canViewPerformance ? "grid-cols-3" : "grid-cols-1"} gap-3 rounded-2xl bg-slate-50/90 border border-slate-100 p-4 text-center`}>
            {canViewPerformance && <><div>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div className="h-1.5 w-12 rounded-full bg-slate-200 overflow-hidden">
                  <div className={`h-full rounded-full ${workloadColor}`} style={{ width: `${member.workload}%` }} />
                </div>
                <span className="text-xs font-extrabold text-slate-900">{member.workload}%</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Workload</p>
            </div>

            <div>
              <p className="text-xs font-extrabold text-blue-600 mb-1">{member.reliability}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reliability</p>
            </div></>}

            <div>
              <AvailabilityBadge value={member.availability} className="text-xs" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Availability</p>
            </div>
          </div>

          {/* Member Assigned Subtasks */}
          {assignedTasks.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Assigned Sub-tasks ({assignedTasks.length})
                </p>
                {remainingTaskCount > 0 && <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">+{remainingTaskCount} more</span>}
              </div>
              <div className="space-y-2">
                {visibleTasks.map((task) => (
                  <div
                    key={`${task.eventTitle || ""}:${task.id}`}
                    className="p-3 rounded-xl border border-slate-200/80 bg-white text-xs space-y-1"
                  >
                    <p className="font-bold text-slate-900">{task.title}</p>
                    {canViewPerformance && task.performanceReview && <p className="text-[11px] text-slate-500">Leader performance rating: {task.performanceReview.rating}/5</p>}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">• {task.eventTitle || "Campus Event"}</span>
                      <span
                        className={`font-bold rounded-full px-2 py-0.5 text-[10px] ${
                          getStatusTheme(task.status, task.customStatuses).badge
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {member.id && <div className="flex justify-end border-t border-slate-100 p-4">
          <Link href={fullProfileHref} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">View full profile</Link>
        </div>}
      </div>
    </div>
  );
}
