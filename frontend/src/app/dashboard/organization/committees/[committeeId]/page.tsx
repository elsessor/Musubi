"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList, Search } from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AddCommitteeMembersModal } from "@/components/dashboard/AddCommitteeMembersModal";
import { MemberProfileModal } from "@/components/dashboard/MemberProfileModal";
import { useLogout } from "@/hooks/useLogout";
import {
  addOrganizationCommitteeMembers,
  getOrganization,
  getOrganizationCommittees,
  getOrganizationMembers,
  type OrganizationCommitteeRecord,
  type OrganizationMember,
  type OrganizationRecord
} from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";
import { getDashboardNavItems } from "@/utils/routes";

function dateLabel() {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());
}

export default function CommitteePage() {
  const params = useParams<{ committeeId: string }>();
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const authLoading = useAuthStore((state) => state.loading);
  const logout = useLogout();

  const [profileMember, setProfileMember] = useState<OrganizationMember | null>(null);
  const [committee, setCommittee] = useState<OrganizationCommitteeRecord | null>(null);
  const [organization, setOrganization] = useState<OrganizationRecord | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [addMembersOpen, setAddMembersOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !profile) router.replace("/sign-in");
  }, [authLoading, profile, router]);

  useEffect(() => {
    if (!firebaseUser || !profile?.organizationId || !params.committeeId) return;
    setLoading(true);
    void Promise.all([
      getOrganization(firebaseUser, profile.organizationId),
      getOrganizationMembers(firebaseUser, profile.organizationId),
      getOrganizationCommittees(firebaseUser, profile.organizationId)
    ])
      .then(([org, organizationMembers, committees]) => {
        setOrganization(org);
        setMembers(organizationMembers);
        setCommittee(committees.find((item) => item.id === params.committeeId) ?? null);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load committee."))
      .finally(() => setLoading(false));
  }, [firebaseUser, params.committeeId, profile?.organizationId]);

  const committeeMembers = useMemo(() => {
    return members
      .filter((member) => member.committeeId === committee?.id)
      .filter((member) => `${member.name} ${member.position} ${member.role} ${member.skills.join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  }, [committee?.id, members, query]);

  async function addMembers(memberIds: string[]) {
    if (!firebaseUser || !profile?.organizationId || !committee) return;
    await addOrganizationCommitteeMembers(firebaseUser, profile.organizationId, committee.id, memberIds);
    setMembers((current) => current.map((member) => (memberIds.includes(member.id) ? { ...member, committeeId: committee.id, committeeName: committee.name } : member)));
    setAddMembersOpen(false);
  }

  if (authLoading || !profile) {
    return <div className="flex min-h-screen items-center justify-center bg-[#eef2f8] text-sm text-slate-500">Loading committee...</div>;
  }

  const user = {
    id: profile.uid,
    name: profile.fullName,
    role: profile.role,
    roleLabel: profile.position ?? profile.role,
    organizationName: organization?.name ?? profile.organizationName ?? "",
    academicYear: "AY 2025–2026",
    greetingDate: dateLabel()
  };

  return (
    <DashboardLayout activeNavId="organization" activities={[]} goals={[]} kpis={[]} navItems={getDashboardNavItems(profile.role)} notificationCount={2} onLogout={logout} user={user}>
      <section className="mx-auto w-full max-w-[1680px] text-[#12213a]">
        <Link href="/dashboard/organization" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2868ed] hover:text-blue-700">
          <ArrowLeft className="size-4" />
          Back to organization
        </Link>
        {loading ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading committee...</div>
        ) : error ? (
          <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 p-8 text-center text-sm text-rose-700">{error}</div>
        ) : !committee ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <ClipboardList className="mx-auto size-7 text-slate-400" />
            <h1 className="mt-3 text-lg font-bold">Committee not found</h1>
          </div>
        ) : (
          <>
            <div className="mt-5 rounded-2xl border border-[#dce3ed] bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-[#2868ed]">{organization?.name}</p>
              <h1 className="mt-1 text-2xl font-extrabold">{committee.name}</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-500">{committee.description || "No description provided."}</p>
              <p className="mt-4 text-sm">
                Committee head: <span className="font-bold">{members.find((member) => member.id === committee.headMemberUID)?.name || "Not assigned"}</span>
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold">Committee members ({committeeMembers.length})</h2>
              {profile.role === "Student Leader" ? (
                <button type="button" onClick={() => setAddMembersOpen(true)} className="rounded-xl bg-[#213f68] px-4 py-2 text-sm font-semibold text-white">
                  Add members
                </button>
              ) : null}
            </div>
            <label className="mt-4 flex h-10 max-w-xl items-center gap-3 rounded-xl border border-[#dce3ed] bg-white px-3">
              <Search className="size-4 text-slate-500" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-[13px] outline-none" placeholder="Search members, roles, or skills..." />
            </label>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-[#dce3ed] bg-white">
              <table className="min-w-[1180px] w-full border-collapse text-left">
                <thead className="bg-[#e8eef7] text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Member Name</th>
                    <th className="px-3 py-3 font-semibold">Role</th>
                    <th className="px-3 py-3 font-semibold">Committee</th>
                    <th className="px-3 py-3 font-semibold">Skills</th>
                    <th className="px-3 py-3 font-semibold">Workload</th>
                    <th className="px-3 py-3 font-semibold">Reliability</th>
                    <th className="px-3 py-3 font-semibold">Availability</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {committeeMembers.map((member) => {
                    const initials = member.name
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase() || "?";
                    const isYou =
                      (profile?.uid && member.id === profile.uid) ||
                      (firebaseUser?.uid && member.id === firebaseUser.uid) ||
                      (profile?.fullName && member.name.trim().toLowerCase() === profile.fullName.trim().toLowerCase());
                    return (
                      <tr key={member.id} className={`border-t border-[#dfe5ee] text-[13px] transition ${isYou ? "bg-blue-50/70 hover:bg-blue-50/90 font-medium" : "hover:bg-slate-50/60"}`}>
                        <td className="px-4 py-3 font-semibold">
                          <div className="flex items-center gap-3">
                            <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${isYou ? "bg-[#2563eb] ring-2 ring-blue-300" : "bg-[#213f68]"}`}>{initials}</span>
                            <span className={isYou ? "text-[#1d4ed8] font-extrabold" : "text-slate-900"}>{member.name}</span>
                            {isYou ? (
                              <span className="rounded-full bg-[#2563eb] px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                                You
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-500">{member.position || member.role}</td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] text-violet-700">{committee.name}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex max-w-[410px] flex-wrap gap-1">
                            {member.skills.length ? (
                              <>
                                {member.skills.slice(0, 4).map((skill) => (
                                  <span key={skill} className="rounded bg-[#e8eef7] px-2 py-0.5 text-[11px] text-[#214574]">
                                    {skill}
                                  </span>
                                ))}
                                {member.skills.length > 4 ? (
                                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">+{member.skills.length - 4}</span>
                                ) : null}
                              </>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 rounded bg-slate-100">
                              <div className="h-full rounded bg-emerald-500" style={{ width: "0%" }} />
                            </div>
                            <span className="text-[11px] text-slate-500">0%</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[11px] font-semibold">-</td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-600">
                            <i className="size-1 rounded-full bg-current" />
                            Available
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" onClick={() => setProfileMember(member)} className="text-[12px] font-medium text-[#2868ed] hover:text-blue-700">
                            View Profile
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!committeeMembers.length ? <p className="p-8 text-center text-sm text-slate-500">No members are assigned to this committee.</p> : null}
            </div>
          </>
        )}
      </section>
      {profileMember ? (
        <MemberProfileModal
          member={{
            initials: profileMember.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "?",
            name: profileMember.name,
            role: profileMember.position || profileMember.role,
            committee: committee?.name || "Not assigned",
            skills: profileMember.skills,
            workload: 0,
            reliability: "-",
            availability: "Available"
          }}
          onClose={() => setProfileMember(null)}
        />
      ) : null}
      {addMembersOpen && committee ? (
        <AddCommitteeMembersModal members={members.filter((member) => member.committeeId !== committee.id)} onClose={() => setAddMembersOpen(false)} onAdd={addMembers} />
      ) : null}
    </DashboardLayout>
  );
}
