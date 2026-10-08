"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ClipboardList, Plus, Search } from "lucide-react";

import { CommitteeHeader } from "@/components/dashboard/CommitteeHeader";
import { EditCommitteeModal, type EditCommitteeInput } from "@/components/dashboard/EditCommitteeModal";
import { OrganizationMemberTable } from "@/components/dashboard/OrganizationMemberTable";
import { fetchEvents, subscribeEventsFirestore } from "@/services/events.service";
import type { Event } from "@/components/events/types";
import type { MemberProfile } from "@/components/dashboard/MemberProfileModal";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AddCommitteeMembersModal } from "@/components/dashboard/AddCommitteeMembersModal";
import { MemberProfileModal } from "@/components/dashboard/MemberProfileModal";
import { useLogout } from "@/hooks/useLogout";
import {
  addOrganizationCommitteeMembers,
  getOrganization,
  getOrganizationCommittees,
  getOrganizationMembers,
  subscribeOrganizationMembersFirestore,
  updateOrganizationCommittee,
  type OrganizationCommitteeRecord,
  type OrganizationMember,
  type OrganizationRecord
} from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { getDashboardNavItems } from "@/utils/routes";

function dateLabel() {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());
}

export function CommitteeClient() {
  const searchParams = useSearchParams();
  const committeeId = searchParams.get("committeeId");
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const authLoading = useAuthStore((state) => state.loading);
  const logout = useLogout();
  const showToast = useToastStore((state) => state.showToast);

  const [profileMember, setProfileMember] = useState<MemberProfile | null>(null);
  const [committee, setCommittee] = useState<OrganizationCommitteeRecord | null>(null);
  const [organization, setOrganization] = useState<OrganizationRecord | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !profile) router.replace("/sign-in");
  }, [authLoading, profile, router]);

  useEffect(() => {
    if (!firebaseUser || !profile?.organizationId || !committeeId) return;
    setLoading(true);
    void Promise.all([
      getOrganization(firebaseUser, profile.organizationId),
      getOrganizationMembers(firebaseUser, profile.organizationId),
      getOrganizationCommittees(firebaseUser, profile.organizationId)
    ])
      .then(([org, organizationMembers, committees]) => {
        setOrganization(org);
        setMembers(organizationMembers);
        setCommittee(committees.find((item) => item.id === committeeId) ?? null);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load committee."))
      .finally(() => setLoading(false));
  }, [firebaseUser, committeeId, profile?.organizationId]);

  useEffect(() => {
    if (!firebaseUser || !profile?.organizationId) { setEvents([]); return; }
    const unsubscribe = subscribeEventsFirestore(firebaseUser, profile.organizationId, setEvents);
    return () => { if (typeof unsubscribe === "function") unsubscribe(); };
  }, [firebaseUser, profile?.organizationId]);

  useEffect(() => {
    if (!firebaseUser || !profile?.organizationId) return;
    return subscribeOrganizationMembersFirestore(profile.organizationId, setMembers, firebaseUser);
  }, [firebaseUser, profile?.organizationId]);

  const committeeRows = useMemo(() => members
    .filter((member) => member.committeeId === committee?.id)
    .map((member) => {
      return {
        id: member.id,
        initials: member.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?",
        name: member.name,
        profilePicture: member.profilePicture,
        role: member.position || member.role,
        committee: committee?.name || "Not assigned",
        skills: member.skills,
        workload: member.workload ?? 0,
        reliability: member.reliability ?? "?",
        availability: member.availability || "Available",
        assignedTasks: member.assignedTasks
      };
    }), [members, committee?.id, committee?.name]);

  const committeeMembers = useMemo(() => {
    const search = query.trim().toLowerCase();
    return committeeRows.filter((member) => [member.name, member.role, ...member.skills].some((value) => value.toLowerCase().includes(search)));
  }, [committeeRows, query]);

  async function addMembers(memberIds: string[]) {
    if (!firebaseUser || !profile?.organizationId || !committee) return;
    await addOrganizationCommitteeMembers(firebaseUser, profile.organizationId, committee.id, memberIds);
    setMembers((current) => current.map((member) => (memberIds.includes(member.id) ? { ...member, committeeId: committee.id, committeeName: committee.name } : member)));
    setAddMembersOpen(false);
    showToast({ title: "Members added", description: "The selected members have been added to the committee.", tone: "success" });
  }

  async function editCommittee(input: EditCommitteeInput) {
    if (!firebaseUser || !profile?.organizationId || !committee || profile.role !== "Student Leader") {
      throw new Error("Only this organization's student leader can edit committees.");
    }
    const memberIds = members.filter((member) => member.committeeId === committee.id).map((member) => member.id);
    if (input.headMemberId && !memberIds.includes(input.headMemberId)) memberIds.push(input.headMemberId);
    const result = await updateOrganizationCommittee(firebaseUser, profile.organizationId, committee.id, { ...input, memberIds });
    setCommittee((current) => current ? { ...current, ...result.committee } : result.committee);
    setMembers((current) => current.map((member) => memberIds.includes(member.id)
      ? { ...member, committeeId: committee.id, committeeName: result.committee.name }
      : member));
    setEvents((current) => current.map((event) => event.committee?.trim().toLowerCase() === committee.name.trim().toLowerCase()
      ? { ...event, committee: result.committee.name }
      : event));
    showToast({ title: "Committee updated", description: "Your changes have been saved successfully.", tone: "success" });
    // Refresh authoritative data without treating a successful save as failed if the refresh is interrupted.
    void getOrganizationMembers(firebaseUser, profile.organizationId).then(setMembers).catch(() => {});
    void fetchEvents(firebaseUser, profile.organizationId, true).then(setEvents).catch(() => {});
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
    <DashboardLayout activeNavId="organization" activities={[]} goals={[]} kpis={[]} navItems={getDashboardNavItems(profile.role)} notificationCount={0} onLogout={logout} user={user}>
      <section className="mx-auto w-full max-w-[1680px] text-[#12213a]">
        <Link href="/dashboard/organization?tab=committees" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2868ed] hover:text-blue-700">
          <ArrowLeft className="size-4" />
          Back to committees
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
            <CommitteeHeader
              committee={committee}
              organizationName={organization?.name || profile.organizationName || ""}
              headName={members.find((member) => member.id === committee.headMemberUID)?.name}
              memberCount={committeeRows.length}
              activeGoals={events.filter((event) => event.status.trim().toLowerCase() === "active" && event.committee?.trim().toLowerCase() === committee.name.trim().toLowerCase()).length}
              onEdit={profile.role === "Student Leader" ? () => setEditOpen(true) : undefined}
            />
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-bold">Committee members ({committeeRows.length})</h2>
              {profile.role === "Student Leader" ? (
                <button type="button" onClick={() => setAddMembersOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#213f68] px-4 py-2 text-sm font-semibold text-white">
                  <Plus className="size-4" aria-hidden="true" />
                  Add members
                </button>
              ) : null}
            </div>
            <label className="mt-5 flex h-10 items-center gap-3 rounded-xl border border-[#dce3ed] bg-white px-3">
              <Search className="size-4 text-slate-500" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 w-full bg-transparent text-[13px] outline-none placeholder:text-slate-500" placeholder="Search by name, role, or skill..." />
            </label>
            <OrganizationMemberTable
              members={committeeMembers}
              currentUserId={firebaseUser?.uid || profile.uid}
              currentUserName={profile.fullName}
              onViewProfile={setProfileMember}
              emptyMessage={query.trim() ? "No members match your search." : "No members are assigned to this committee."}
            />
          </>
        )}
      </section>
      {profileMember ? (
        <MemberProfileModal
          member={profileMember}
          onClose={() => setProfileMember(null)}
        />
      ) : null}
      {addMembersOpen && committee ? (
        <AddCommitteeMembersModal members={members.filter((member) => member.committeeId !== committee.id)} onClose={() => setAddMembersOpen(false)} onAdd={addMembers} />
      ) : null}
      {editOpen && committee && profile.role === "Student Leader" ? (
        <EditCommitteeModal committee={committee} members={members} onClose={() => setEditOpen(false)} onSave={editCommittee} />
      ) : null}
    </DashboardLayout>
  );
}
