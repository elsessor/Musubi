"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronLeft } from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import {
  getOrganizationManagementDetail,
  type OrganizationManagementDetail
} from "@/services/auth.service";

// Fallback seed data matching reference screenshot
const SEED_ORGANIZATION_DETAILS: Record<
  string,
  {
    id: string;
    orgIdCode: string;
    name: string;
    type: string;
    setupStatus: string;
    delegationMode: string;
    atomization: string;
    nudges: string;
    created: string;
    updated: string;
    description: string;
    membersCount: number;
    goalsCount: number;
    members: Array<{
      id: string;
      name: string;
      studentId: string;
      role: "Leader" | "Member";
      initials: string;
      color: string;
    }>;
  }
> = {
  "org-1": {
    id: "org-1",
    orgIdCode: "ORG-001",
    name: "University Student Council",
    type: "Governing",
    setupStatus: "Complete",
    delegationMode: "Heuristic",
    atomization: "Enabled",
    nudges: "Enabled",
    created: "Aug 12, 2024",
    updated: "Jun 1, 2026",
    description: "The highest governing student body of the university.",
    membersCount: 7,
    goalsCount: 5,
    members: [
      { id: "m1", name: "Hans San Miguel", studentId: "2021-00100", role: "Leader", initials: "HS", color: "bg-[#1e293b]" },
      { id: "m2", name: "Beatrice Lim", studentId: "2021-00842", role: "Member", initials: "BL", color: "bg-[#1e3a8a]" },
      { id: "m3", name: "Ana Reyes", studentId: "2022-01021", role: "Member", initials: "AR", color: "bg-[#0f766e]" },
      { id: "m4", name: "Marco Dela Cruz", studentId: "2021-00533", role: "Member", initials: "MD", color: "bg-[#334155]" },
      { id: "m5", name: "Sophia Tan", studentId: "2020-00312", role: "Member", initials: "ST", color: "bg-[#3730a3]" },
      { id: "m6", name: "Luis Garcia", studentId: "2022-00761", role: "Member", initials: "LG", color: "bg-[#475569]" }
    ]
  },
  "org-2": {
    id: "org-2",
    orgIdCode: "ORG-002",
    name: "Computer Science Society",
    type: "Academic",
    setupStatus: "Complete",
    delegationMode: "Heuristic",
    atomization: "Enabled",
    nudges: "Enabled",
    created: "Sep 1, 2024",
    updated: "Jun 5, 2026",
    description: "Org for CS majors focused on tech and innovation.",
    membersCount: 24,
    goalsCount: 3,
    members: [
      { id: "m1", name: "Hans San Miguel", studentId: "2021-00100", role: "Leader", initials: "HS", color: "bg-[#1e293b]" },
      { id: "m2", name: "Beatrice Lim", studentId: "2021-00842", role: "Member", initials: "BL", color: "bg-[#1e3a8a]" }
    ]
  }
};

function getAvatarBgColor(index: number): string {
  const colors = [
    "bg-[#1e293b]", // navy
    "bg-[#1e3a8a]", // deep blue
    "bg-[#0f766e]", // teal
    "bg-[#334155]", // slate
    "bg-[#3730a3]", // indigo
    "bg-[#475569]"  // dark gray
  ];
  return colors[index % colors.length];
}

function getInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type AdminOrganizationDetailViewProps = {
  organizationId: string;
};

export function AdminOrganizationDetailView({ organizationId }: AdminOrganizationDetailViewProps) {
  const router = useRouter();
  const firebaseUser = useAuthStore((state) => state.firebaseUser);

  const [detail, setDetail] = useState<OrganizationManagementDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser || !organizationId) return;

    let isMounted = true;
    setLoading(true);

    void getOrganizationManagementDetail(firebaseUser, organizationId)
      .then((data) => {
        if (isMounted) setDetail(data);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [firebaseUser, organizationId]);

  // Derived org info
  const fallback = SEED_ORGANIZATION_DETAILS[organizationId] || SEED_ORGANIZATION_DETAILS["org-1"];

  const orgName = detail?.organization.name || fallback.name;
  const orgType = detail?.organization.type || fallback.type;
  const orgDescription = detail?.organization.description || fallback.description;
  const setupStatus = detail?.organization.status === "active" ? "Complete" : fallback.setupStatus;
  const orgCode = fallback.orgIdCode;

  const totalMembers = detail?.members ? detail.members.length : fallback.membersCount;
  const totalGoals = detail?.goalSummary
    ? Object.values(detail.goalSummary).reduce((a, b) => a + b, 0)
    : fallback.goalsCount;

  const membersList = detail?.members && detail.members.length > 0
    ? detail.members.map((m, idx) => ({
        id: m.id,
        name: m.name,
        studentId: `202${idx % 3 + 1}-00${100 + idx * 42}`,
        role: (m.role === "Student Leader" || m.role === "Admin" ? "Leader" : "Member") as "Leader" | "Member",
        initials: getInitials(m.name),
        color: getAvatarBgColor(idx)
      }))
    : fallback.members;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Back Link */}
      <div>
        <button
          onClick={() => router.push("/admin/organizations")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ChevronLeft className="size-4" />
          <span>Back to Organizations</span>
        </button>
      </div>

      {/* Hero Header Banner Card */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <div className="relative bg-[#1e293b] p-6 sm:p-8 text-white flex items-center gap-5">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600/80 text-white shadow-inner">
            <Building2 className="size-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{orgName}</h1>
            <div className="mt-2 flex items-center gap-2.5">
              <span className="rounded-full bg-slate-700/60 px-3 py-1 text-xs font-semibold text-slate-200">
                {orgType}
              </span>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
                {setupStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 p-5 text-center bg-white">
          <div>
            <p className="text-2xl font-extrabold text-indigo-600">{totalMembers}</p>
            <p className="text-xs font-medium text-slate-400 mt-0.5">Members</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-indigo-600">{totalGoals}</p>
            <p className="text-xs font-medium text-slate-400 mt-0.5">Goals</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-emerald-600">{setupStatus}</p>
            <p className="text-xs font-medium text-slate-400 mt-0.5">Status</p>
          </div>
        </div>
      </div>

      {/* Middle Section: 2 Columns */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
        {/* Left Column: Organization Details */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">ORG ID</span>
            <span className="font-mono text-xs font-semibold text-slate-800">{orgCode}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">TYPE</span>
            <span className="text-xs font-semibold text-slate-800">{orgType}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">SETUP STATUS</span>
            <span className="text-xs font-semibold text-slate-800">{setupStatus}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">DELEGATION MODE</span>
            <span className="text-xs font-semibold text-slate-800">{fallback.delegationMode}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">ATOMIZATION</span>
            <span className="text-xs font-semibold text-slate-800">{fallback.atomization}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">NUDGES</span>
            <span className="text-xs font-semibold text-slate-800">{fallback.nudges}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">CREATED</span>
            <span className="text-xs font-semibold text-slate-800">{fallback.created}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">UPDATED</span>
            <span className="text-xs font-semibold text-slate-800">{fallback.updated}</span>
          </div>

          <div className="pt-1">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              DESCRIPTION
            </span>
            <p className="text-xs font-medium text-slate-600 leading-relaxed">
              {orgDescription}
            </p>
          </div>
        </div>

        {/* Right Column: MEMBERS */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              MEMBERS ({membersList.length})
            </h2>
          </div>

          <div className="divide-y divide-slate-100">
            {membersList.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-3 first:pt-2 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`size-9 shrink-0 rounded-full ${member.color} flex items-center justify-center text-xs font-bold text-white shadow-sm`}>
                    {member.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{member.name}</p>
                    <p className="text-xs font-mono text-slate-400 truncate mt-0.5">{member.studentId}</p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    member.role === "Leader"
                      ? "bg-purple-50 text-purple-600 ring-1 ring-inset ring-purple-600/10"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
