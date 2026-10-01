"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronLeft, Users } from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import {
  getOrganizationManagementDetail,
  type OrganizationManagementDetail
} from "@/services/auth.service";

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
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return "—";
  }
}

type AdminOrganizationDetailViewProps = {
  organizationId: string;
  onBack?: () => void;
};

export function AdminOrganizationDetailView({ organizationId, onBack }: AdminOrganizationDetailViewProps) {
  const router = useRouter();
  const firebaseUser = useAuthStore((state) => state.firebaseUser);

  const [detail, setDetail] = useState<OrganizationManagementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push("/admin/organizations");
    }
  };

  useEffect(() => {
    if (!firebaseUser || !organizationId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError("");

    void getOrganizationManagementDetail(firebaseUser, organizationId)
      .then((data) => {
        if (isMounted) setDetail(data);
      })
      .catch((err) => {
        if (isMounted) setError(err instanceof Error ? err.message : "Failed to load organization details.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [firebaseUser, organizationId]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl py-12 text-center text-sm font-semibold text-slate-500">
        Loading organization details...
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div>
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ChevronLeft className="size-4" />
            <span>Back to Organizations</span>
          </button>
        </div>
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-semibold text-rose-600">{error || "Organization not found."}</p>
        </div>
      </div>
    );
  }

  const org = detail.organization;
  const orgName = org.name || "Untitled Organization";
  const orgType = org.type || "Academic";
  const orgDescription = org.description || "No description provided.";
  const setupStatus = org.status === "active" ? "Complete" : org.status === "pending" ? "Pending Approval" : "Inactive";
  const orgCode = `ORG-${org.id.slice(0, 6).toUpperCase()}`;

  const totalMembers = detail.members ? detail.members.length : 0;
  const totalGoals = detail.goalSummary?.total ?? (detail.committees ? detail.committees.length : 0);

  const membersList = (detail.members || []).map((m, idx) => ({
    id: m.id,
    name: m.name || "Unnamed Member",
    position: m.position || m.role || "Member",
    role: (m.role === "Student Leader" || m.role === "Admin" ? "Leader" : "Member") as "Leader" | "Member",
    initials: getInitials(m.name),
    color: getAvatarBgColor(idx)
  }));

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Back Link */}
      <div>
        <button
          onClick={handleBack}
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
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                  org.status === "active"
                    ? "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 ring-amber-500/30"
                }`}
              >
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
            <p className="text-xs font-medium text-slate-400 mt-0.5">Goals / Committees</p>
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
            <span className="text-xs font-semibold text-slate-800">Heuristic</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">ATOMIZATION</span>
            <span className="text-xs font-semibold text-slate-800">Enabled</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">NUDGES</span>
            <span className="text-xs font-semibold text-slate-800">Enabled</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">CREATED</span>
            <span className="text-xs font-semibold text-slate-800">{formatDate(org.createdAt)}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">UPDATED</span>
            <span className="text-xs font-semibold text-slate-800">{formatDate(org.updatedAt)}</span>
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

          {membersList.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              <Users className="mx-auto size-6 text-slate-300 mb-2" />
              No members found in this organization.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {membersList.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-3 first:pt-2 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`size-9 shrink-0 rounded-full ${member.color} flex items-center justify-center text-xs font-bold text-white shadow-sm`}>
                      {member.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{member.name}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{member.position}</p>
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
          )}
        </div>
      </section>
    </div>
  );
}
