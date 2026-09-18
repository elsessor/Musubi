"use client";

import { useEffect, useState } from "react";
import { Award, Briefcase, CheckCircle2, Circle, Users } from "lucide-react";
import {
  type AdminDashboardData,
  INITIAL_ADMIN_DATA,
  subscribeAdminDashboardData
} from "@/services/admin.service";
import { useAuthStore } from "@/store/authStore";

export function AdminDashboardView() {
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const [data, setData] = useState<AdminDashboardData>(INITIAL_ADMIN_DATA);

  useEffect(() => {
    const unsubscribe = subscribeAdminDashboardData(firebaseUser, (updatedData) => {
      setData(updatedData);
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [firebaseUser]);

  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date());

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header Section */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          University Campus · {todayFormatted}
        </p>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Organizations */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 transition hover:shadow-md">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-purple-100/70 text-purple-600 mb-4">
            <Briefcase className="size-5" />
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">
            {data.stats.totalOrgs}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Organizations</p>
        </div>

        {/* Card 2: Total Members */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 transition hover:shadow-md">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-100/70 text-blue-600 mb-4">
            <Users className="size-5" />
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">
            {data.stats.totalMembers}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Total Members</p>
        </div>

        {/* Card 3: Student Leaders */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 transition hover:shadow-md">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-100/70 text-amber-600 mb-4">
            <Award className="size-5" />
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">
            {data.stats.studentLeaders}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Student Leaders</p>
        </div>

        {/* Card 4: Setup Complete */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 transition hover:shadow-md">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-100/70 text-emerald-600 mb-4">
            <CheckCircle2 className="size-5" />
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">
            {data.stats.setupComplete}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Setup Complete</p>
        </div>
      </div>

      {/* Middle Grid: Organizations & Recent Members */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Box: ORGANIZATIONS */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              ORGANIZATIONS
            </h2>
            <span className="text-xs font-semibold text-slate-400">
              {data.organizations.length} total
            </span>
          </div>

          <div className="space-y-4">
            {data.organizations.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between gap-3 py-1 transition hover:bg-slate-50/50 rounded-xl px-2"
              >
                <div>
                  <p className="font-bold text-slate-900 text-sm">{org.name}</p>
                  <p className="mt-0.5 text-xs text-slate-400 font-medium">
                    {org.type} · {org.memberCount} members · {org.goalCount} goals
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-600 ring-1 ring-emerald-200/70">
                  {org.status === "active" ? "Complete" : org.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Box: RECENT MEMBERS */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              RECENT MEMBERS
            </h2>
            <span className="text-xs font-semibold text-slate-400">
              {data.stats.totalMembers} total
            </span>
          </div>

          <div className="space-y-3.5">
            {data.members.length > 0 ? (
              data.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 py-0.5 transition hover:bg-slate-50/50 rounded-xl px-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1c2e4a] text-xs font-bold text-white shadow-sm">
                      {member.initials}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{member.name}</p>
                      <p className="text-xs text-slate-400 font-medium">
                        {member.organizationName}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-3 py-0.5 text-xs font-bold ring-1 ${
                      member.role === "Leader"
                        ? "bg-purple-50 text-purple-600 ring-purple-200/70"
                        : member.role === "Admin"
                        ? "bg-rose-50 text-rose-600 ring-rose-200/70"
                        : "bg-slate-100 text-slate-600 ring-slate-200"
                    }`}
                  >
                    {member.role}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-medium">
                No recent members found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: RECENT ACTIVITY */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
        <div className="border-b border-slate-100 pb-4 mb-4">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            RECENT ACTIVITY
          </h2>
        </div>

        <div className="space-y-4">
          {data.activities.length > 0 ? (
            data.activities.map((act) => (
              <div
                key={act.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1.5 transition hover:bg-slate-50/50 rounded-xl px-2"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <Circle className="size-3.5 text-slate-300 fill-slate-100 shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {act.actorName}
                      <span className="mx-1 text-slate-400 font-semibold text-xs">→</span>
                      <span className="font-extrabold uppercase text-slate-900 text-xs tracking-wider mx-1">
                        {act.action}
                      </span>
                      <span className="text-blue-600 font-bold hover:underline cursor-pointer">
                        {act.targetTitle}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {act.targetType} · {act.date}
                    </p>
                  </div>
                </div>

                <span className="font-mono text-xs font-medium text-slate-400 shrink-0 self-end sm:self-auto">
                  {act.logCode}
                </span>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">
              No recent activity recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
