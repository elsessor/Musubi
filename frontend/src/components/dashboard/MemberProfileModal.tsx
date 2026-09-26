"use client";

import { X } from "lucide-react";

export type MemberProfile = {
  id?: string;
  initials: string;
  name: string;
  role: string;
  committee: string;
  skills: string[];
  workload: number;
  reliability: string;
  availability: string;
  assignedTasks?: Array<{
    id: string;
    title: string;
    eventTitle?: string;
    status: string;
    matchPercentage?: number;
  }>;
};

export function MemberProfileModal({
  member,
  onClose
}: {
  member: MemberProfile;
  onClose: () => void;
}) {
  const workloadColor =
    member.workload >= 80 ? "bg-rose-500" : member.workload >= 50 ? "bg-amber-400" : "bg-emerald-500";

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
            <span className="flex size-12 items-center justify-center rounded-2xl bg-[#1e3a5f] text-base font-bold font-mono text-white shadow-sm">
              {member.initials}
            </span>
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
          <div className="grid grid-cols-3 gap-3 rounded-2xl bg-slate-50/90 border border-slate-100 p-4 text-center">
            <div>
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
            </div>

            <div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                  member.availability === "Available"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    member.availability === "Available" ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                {member.availability}
              </span>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Availability</p>
            </div>
          </div>

          {/* Member Assigned Subtasks */}
          {member.assignedTasks && member.assignedTasks.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Active Sub-tasks ({member.assignedTasks.length})
              </p>
              <div className="space-y-2">
                {member.assignedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl border border-slate-200/80 bg-white text-xs space-y-1"
                  >
                    <p className="font-bold text-slate-900">{task.title}</p>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">• {task.eventTitle || "Campus Event"}</span>
                      <span
                        className={`font-bold rounded-full px-2 py-0.5 text-[10px] ${
                          task.status === "Completed" || task.status === "Done"
                            ? "bg-emerald-50 text-emerald-700"
                            : task.status === "In Progress"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-amber-50 text-amber-700"
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
      </div>
    </div>
  );
}
