"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList, UserPlus, UsersRound, X } from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useLogout } from "@/hooks/useLogout";
import { getOrganization, getOrganizationMembers, assignOrganizationMemberToCommittee, type OrganizationMember, type OrganizationRecord } from "@/services/auth.service";
import { subscribeCommitteesFirestore, type CommitteeRecord } from "@/services/committees.service";
import { useAuthStore } from "@/store/authStore";
import { getDashboardNavItems } from "@/utils/routes";

export default function CommitteePage() {
  const router = useRouter();
  const params = useParams<{ committeeId: string }>();
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const authLoading = useAuthStore((state) => state.loading);
  const logout = useLogout();
  const [organization, setOrganization] = useState<OrganizationRecord | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [committee, setCommittee] = useState<CommitteeRecord | null>(null);
  const [error, setError] = useState("");
  const [savingMemberId, setSavingMemberId] = useState("");
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !profile) router.replace("/sign-in");
  }, [authLoading, profile, router]);

  useEffect(() => {
    if (!firebaseUser || !profile?.organizationId) return;
    void Promise.all([getOrganization(firebaseUser, profile.organizationId), getOrganizationMembers(firebaseUser, profile.organizationId)])
      .then(([organizationData, memberData]) => { setOrganization(organizationData); setMembers(memberData); })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load this committee."));
  }, [firebaseUser, profile?.organizationId]);

  useEffect(() => {
    if (!profile?.organizationId || !params.committeeId) return;
    return subscribeCommitteesFirestore(profile.organizationId, (committees) => {
      setCommittee(committees.find((item) => item.id === params.committeeId) ?? null);
    });
  }, [params.committeeId, profile?.organizationId]);

  const assignedMembers = useMemo(() => members.filter((member) => member.committeeId === committee?.id), [committee?.id, members]);
  const unassignedMembers = useMemo(() => members.filter((member) => !member.committeeId), [members]);
  const isLeader = profile?.role === "Student Leader";

  async function addMember(member: OrganizationMember) {
    if (!firebaseUser || !profile?.organizationId || !committee) return;
    setSavingMemberId(member.id);
    setError("");
    try {
      await assignOrganizationMemberToCommittee(firebaseUser, profile.organizationId, committee.id, member.id);
      setMembers((current) => current.map((item) => item.id === member.id ? { ...item, committeeId: committee.id, committeeName: committee.name } : item));
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : "Unable to add this member.");
    } finally {
      setSavingMemberId("");
    }
  }

  if (authLoading || !profile) return <div className="flex min-h-screen items-center justify-center bg-[#eef2f8] text-sm text-slate-500">Loading committee...</div>;

  const user = { name: profile.fullName, role: profile.role, roleLabel: profile.position ?? profile.role, organizationName: organization?.name ?? "Organization", academicYear: "AY 2025â€“2026", greetingDate: new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date()) };
  return <DashboardLayout activeNavId="organization" activities={[]} goals={[]} kpis={[]} navItems={getDashboardNavItems(profile.role)} notificationCount={2} onLogout={logout} user={user}><section className="mx-auto w-full max-w-[1680px] text-[#12213a]"><button type="button" onClick={() => router.push("/dashboard/organization?tab=committees")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-blue-600"><ArrowLeft className="size-4" />Organization committees</button>{error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>}{committee ? <div className="mt-5 space-y-5"><article className="overflow-hidden rounded-2xl border border-[#d9e1ec] bg-white"><div className="bg-[#213f68] px-6 py-7 text-white"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-4"><span className="flex size-12 items-center justify-center rounded-2xl bg-[#2868ed]"><ClipboardList className="size-6" /></span><div><h1 className="text-2xl font-bold">{committee.name}</h1><p className="mt-1 text-sm text-blue-100">{committee.description || "Committee overview"}</p></div></div>{isLeader && <button type="button" onClick={() => setIsAddMembersOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#213f68]"><UserPlus className="size-4" />Add members</button>}</div></div><div className="grid grid-cols-2 divide-x divide-[#dce3ed]"><Stat value={String(assignedMembers.length)} label="Committee Members" /><Stat value={committee.headMemberUID ? "Assigned" : "Not assigned"} label="Committee Head" /></div></article><section className="rounded-2xl border border-[#dce3ed] bg-white"><PanelTitle icon={UsersRound} title="Committee Members" /><div className="divide-y divide-slate-100">{assignedMembers.length ? assignedMembers.map((member) => <MemberRow key={member.id} member={member} />) : <p className="p-6 text-sm text-slate-500">No members have been added yet.</p>}</div></section>{isLeader && isAddMembersOpen && <AddMembersModal members={unassignedMembers} savingMemberId={savingMemberId} onAdd={addMember} onClose={() => setIsAddMembersOpen(false)} />}</div> : <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Committee not found or you do not have access to it.</div>}</section></DashboardLayout>;
}

function PanelTitle({ icon: Icon, title }: { icon: typeof UsersRound; title: string }) { return <div className="flex items-center gap-2 border-b border-[#e5eaf1] px-5 py-4 text-sm font-bold"><Icon className="size-4 text-blue-600" />{title}</div>; }
function Stat({ value, label }: { value: string; label: string }) { return <div className="py-4 text-center"><p className="text-lg font-bold text-[#2868ed]">{value}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p></div>; }
function MemberRow({ member, action }: { member: OrganizationMember; action?: React.ReactNode }) { const initials = member.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?"; return <div className="flex items-center justify-between gap-3 px-5 py-3"><div className="flex min-w-0 items-center gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#213f68] text-[10px] font-bold text-white">{initials}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{member.name}</p><p className="truncate text-xs text-slate-500">{member.position || member.role}</p></div></div>{action}</div>; }
function AddMembersModal({ members, savingMemberId, onAdd, onClose }: { members: OrganizationMember[]; savingMemberId: string; onAdd: (member: OrganizationMember) => Promise<void>; onClose: () => void }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><div role="dialog" aria-modal="true" aria-labelledby="add-members-title" className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 id="add-members-title" className="text-lg font-bold text-slate-900">Add members</h2><p className="mt-1 text-sm text-slate-500">Assign unassigned organization members to this committee.</p></div><button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="size-5" /></button></div><div className="mt-5 divide-y divide-slate-100">{members.length ? members.map((member) => <MemberRow key={member.id} member={member} action={<button type="button" onClick={() => void onAdd(member)} disabled={Boolean(savingMemberId)} className="rounded-lg bg-[#213f68] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">{savingMemberId === member.id ? "Adding..." : "Add"}</button>} />) : <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">All organization members are already assigned to committees.</p>}</div></div></div>; }
