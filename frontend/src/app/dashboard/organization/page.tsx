"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  CirclePlus,
  ClipboardList,
  Megaphone,
  Search,
  UsersRound
} from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import MembersPanel from "@/components/dashboard/MembersPanel";
import { InviteMemberModal } from "@/components/dashboard/InviteMemberModal";
import { useLogout } from "@/hooks/useLogout";
import { OrganizationAccessModal } from "@/components/dashboard/OrganizationAccessModal";
import { getMyOrganizationJoinRequest, getOrganization, getOrganizationJoinRequests, getOrganizationManagementDetail, getOrganizationMembers, inviteOrganizationMember, reviewOrganizationJoinRequest, updateOrganizationMember, type MyOrganizationJoinRequest, type OrganizationCommitteeRecord, type OrganizationJoinRequest, type OrganizationMember, type OrganizationRecord } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";
import { getDashboardNavItems } from "@/utils/routes";

type OrganizationTab = "overview" | "members" | "committees" | "announcements";

type MemberRow = { initials: string; name: string; role: string; committee: string; skills: string[]; workload: number; reliability: string; availability: string };
type GoalRow = { title: string; progress: number; due: string; status: string };
const goals: GoalRow[] = [];

function greetingDate() {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default function OrganizationPage() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const authLoading = useAuthStore((state) => state.loading);
  const setProfile = useAuthStore((state) => state.setProfile);
  const logout = useLogout();
  const [organization, setOrganization] = useState<OrganizationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<OrganizationTab>("overview");
  const [memberSearch, setMemberSearch] = useState("");
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<OrganizationJoinRequest[]>([]);
  const [myJoinRequest, setMyJoinRequest] = useState<MyOrganizationJoinRequest | null>(null);
  const [reviewingRequestId, setReviewingRequestId] = useState("");
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [profileMember, setProfileMember] = useState<OrganizationMember | null>(null);

  useEffect(() => {
    if (!authLoading && !profile) router.replace("/sign-in");
  }, [authLoading, profile, router]);

  useEffect(() => {
    if (!profile || !firebaseUser) return;
    setError("");
    if (!profile.organizationId) {
      setOrganization(null);
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void Promise.all([getOrganization(firebaseUser, profile.organizationId), getOrganizationMembers(firebaseUser, profile.organizationId)])
      .then(([organizationData, memberData]) => { setOrganization(organizationData); setMembers(memberData); })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load this organization."))
      .finally(() => setLoading(false));
  }, [firebaseUser, profile]);

  useEffect(() => {
    if (!firebaseUser || profile?.role !== "Student Leader" || !profile.organizationId) { setJoinRequests([]); return; }
    void getOrganizationJoinRequests(firebaseUser, profile.organizationId).then(setJoinRequests).catch(() => setJoinRequests([]));
  }, [firebaseUser, profile?.organizationId, profile?.role]);

  useEffect(() => {
    if (!firebaseUser || profile?.organizationId) { setMyJoinRequest(null); return; }
    void getMyOrganizationJoinRequest(firebaseUser).then(setMyJoinRequest).catch(() => setMyJoinRequest(null));
  }, [firebaseUser, profile?.organizationId]);

  useEffect(() => {
    if (profile?.role !== "Student Leader" || activeTab !== "members") return;
    const cells = Array.from(document.querySelectorAll("td")).filter((cell) => cell.textContent?.trim() === "View Profile");
    const cleanups = cells.map((cell) => { const handler = () => { const name = cell.parentElement?.querySelector(".font-medium")?.textContent?.trim(); const member = members.find((item) => item.name === name); if (member) setProfileMember(member); }; cell.className += " cursor-pointer text-[#2868ed] hover:underline"; cell.setAttribute("role", "button"); cell.addEventListener("click", handler); return () => cell.removeEventListener("click", handler); });
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [activeTab, members, profile?.role]);

  async function reviewJoinRequest(requestId: string, status: "accepted" | "rejected") {
    if (!firebaseUser || !profile?.organizationId) return;
    setReviewingRequestId(requestId);
    try {
      await reviewOrganizationJoinRequest(firebaseUser, profile.organizationId, requestId, status);
      setJoinRequests((current) => current.filter((request) => request.id !== requestId));
      if (status === "accepted") setMembers(await getOrganizationMembers(firebaseUser, profile.organizationId));
    } catch (reviewError) { setError(reviewError instanceof Error ? reviewError.message : "Unable to review this join request."); }
    finally { setReviewingRequestId(""); }
  }

  const memberRows = useMemo<MemberRow[]>(() => members.map((member) => ({ initials: member.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?", name: member.name, role: member.position || member.role, committee: "Not assigned", skills: member.skills, workload: 0, reliability: "—", availability: "Available" })), [members]);

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return memberRows;
    return memberRows.filter((member) => [member.name, member.role, member.committee, ...member.skills].some((value) => value.toLowerCase().includes(query)));
  }, [memberRows, memberSearch]);

  if (authLoading || !profile) {
    return <div className="flex min-h-screen items-center justify-center bg-[#eef2f8] text-sm text-slate-500">Loading organization...</div>;
  }

  const user = {
    name: profile.fullName,
    role: profile.role,
    roleLabel: profile.position ?? profile.role,
    organizationName: organization?.name ?? "",
    academicYear: "AY 2025–2026",
    greetingDate: greetingDate()
  };

  return (
    <DashboardLayout activeNavId="organization" activities={[]} goals={[]} kpis={[]} navItems={getDashboardNavItems(profile.role)} notificationCount={2} onLogout={logout} user={user}>
      <section className="mx-auto w-full max-w-[1680px] text-[#12213a]">
        <div className="flex items-center justify-between gap-4"><h1 className="text-[21px] font-bold tracking-[-0.02em]">Organization</h1>{profile.role !== "Admin" && firebaseUser ? <button type="button" onClick={() => setAccessModalOpen(true)} className="flex h-9 items-center gap-2 rounded-xl bg-[#213f68] px-4 text-[12px] font-semibold text-white"><CirclePlus className="size-4" />{profile.role === "Student Leader" ? "Create or join" : "Join organization"}</button> : null}</div>
        <div className="mt-5 flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl bg-[#e8eef7] p-1.5">
          <TabButton active={activeTab === "overview"} icon={BriefcaseBusiness} label="Overview" onClick={() => setActiveTab("overview")} />
          <TabButton active={activeTab === "members"} icon={UsersRound} label="Members" onClick={() => setActiveTab("members")} />
          <TabButton active={activeTab === "committees"} icon={ClipboardList} label="Committees" onClick={() => setActiveTab("committees")} />
          <TabButton active={activeTab === "announcements"} icon={Bell} label="Announcements" onClick={() => setActiveTab("announcements")} />
        </div>

        {loading ? <LoadCard message="Loading organization profile..." /> : error ? <ErrorCard message={error} /> : !organization ? myJoinRequest ? <PendingJoinCard organizationName={myJoinRequest.organizationName} /> : <LoadCard message="Use the button above to request to join an organization or, if you are a leader, create one." /> : activeTab === "overview" ? <Overview organization={organization} memberCount={members.length} /> : activeTab === "members" ? <MembersPanel search={memberSearch} members={filteredMembers} onSearch={setMemberSearch} joinRequests={joinRequests} isLeader={profile.role === "Student Leader"} reviewingRequestId={reviewingRequestId} onReview={reviewJoinRequest} onOpenInvite={() => setInviteModalOpen(true)} /> : <EmptyPanel tab={activeTab} />}
      </section>
      {accessModalOpen && firebaseUser && profile.role !== "Admin" ? <OrganizationAccessModal role={profile.role} user={firebaseUser} onClose={() => setAccessModalOpen(false)} onComplete={(updatedProfile) => { setProfile({ ...profile, ...updatedProfile }); setOrganization(null); setMembers([]); setLoading(true); }} /> : null}
      {profileMember && firebaseUser && organization && profile.role === "Student Leader" ? <LeaderMemberProfile member={profileMember} organizationId={organization.id} user={firebaseUser} onClose={() => setProfileMember(null)} onSaved={() => { setProfileMember(null); void getOrganizationMembers(firebaseUser, organization.id).then(setMembers); }} /> : null}
      {inviteModalOpen && firebaseUser && organization ? <InviteMemberModal open={inviteModalOpen} user={firebaseUser} organizationId={organization.id} onClose={() => setInviteModalOpen(false)} onInvited={() => { setInviteModalOpen(false); void getOrganizationMembers(firebaseUser, organization.id).then(setMembers); }} /> : null}
    </DashboardLayout>
  );
}

function TabButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Bell; label: string; onClick: () => void }) {
  return <button className={`flex h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-[13px] font-medium transition ${active ? "bg-white text-[#15233c] shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"}`} onClick={onClick} type="button"><Icon className="size-4" strokeWidth={1.7} />{label}</button>;
}

function Overview({ organization, memberCount }: { organization: OrganizationRecord; memberCount: number }) {
  return <div className="mt-5 space-y-4">
    <article className="overflow-hidden rounded-2xl border border-[#d9e1ec] bg-white">
      <div className="relative overflow-hidden bg-[#213f68] px-6 py-6 text-white sm:px-7"><div className="absolute -right-8 -top-16 size-44 rounded-full bg-[#385779]" /><div className="relative flex items-center gap-4"><div className="flex size-12 items-center justify-center rounded-none bg-[#2868ed]"><BriefcaseBusiness className="size-6" /></div><div><h2 className="text-[21px] font-bold tracking-[-0.02em]">{organization.name}</h2><div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]"><span className="rounded-full bg-white/15 px-2.5 py-0.5">{organization.type}</span><span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-emerald-200">{organization.status === "active" ? "Complete" : organization.status}</span><span className="text-blue-100">Created {formatDate(organization.createdAt)}</span></div></div></div></div>
      <div className="grid grid-cols-2 divide-x divide-y divide-[#dce3ed] lg:grid-cols-4 lg:divide-y-0"><Stat value={String(memberCount)} label="Total Members" color="text-[#2868ed]" /><Stat value="—" label="Active Goals" color="text-[#7c3aed]" /><Stat value={typeof organization.organizationConfig.delegationMode === "string" ? organization.organizationConfig.delegationMode : "—"} label="Delegation" color="text-amber-500" /><Stat value={typeof organization.organizationConfig.nudgeMonitoring === "boolean" ? organization.organizationConfig.nudgeMonitoring ? "On" : "Off" : "—"} label="Nudges" color="text-emerald-500" /></div>
    </article>
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <article className="overflow-hidden rounded-2xl border border-[#dce3ed] bg-white"><CardTitle title="Organization Details" action="Edit" /><div className="p-4"><p className="text-[11px] font-semibold uppercase text-slate-500">Description</p><p className="mt-2 text-[13px] leading-6 text-slate-600">{organization.description || "No organization description has been provided."}</p></div><DetailRow label="Org UID" value={organization.id} /><DetailRow label="Type" value={organization.type} /><DetailRow label="Setup status" value={organization.status === "active" ? "Complete" : organization.status} /><DetailRow label="Created at" value={formatDate(organization.createdAt)} /></article>
      <div className="space-y-4"><article className="overflow-hidden rounded-2xl border border-[#dce3ed] bg-white"><CardTitle title="Orchestration Config" /><ConfigRow label="Delegation Mode" value={typeof organization.organizationConfig.delegationMode === "string" ? organization.organizationConfig.delegationMode : "Not configured"} tone="purple" /><ConfigRow label="AI Task Atomization" value={organization.organizationConfig.aiTaskAtomization === true ? "Enabled" : "Not configured"} tone="green" /><ConfigRow label="Nudge Monitoring" value={organization.organizationConfig.nudgeMonitoring === true ? "Enabled" : "Not configured"} tone="green" /></article><article className="overflow-hidden rounded-2xl border border-[#dce3ed] bg-white"><CardTitle title="Members Preview" action="View All →" /><p className="border-t border-[#e5eaf1] px-4 py-6 text-center text-xs text-slate-500">Member data is managed by your administrator.</p></article></div>
    </div>
    <article className="overflow-hidden rounded-2xl border border-[#dce3ed] bg-white"><CardTitle title="Goals" subtitle="Organizational goals — managed in Goals & Tasks" /><p className="border-t border-[#e5eaf1] px-4 py-6 text-center text-xs text-slate-500">No goal data is available yet.</p></article>
  </div>;
}


function LeaderMemberProfile({ member, organizationId, user, onClose, onSaved }: { member: OrganizationMember; organizationId: string; user: import("firebase/auth").User; onClose: () => void; onSaved: () => void }) { const [role, setRole] = useState(member.membershipRole); const [position, setPosition] = useState(member.position); const [committeeId, setCommitteeId] = useState(member.committeeId ?? ""); const [committees, setCommittees] = useState<OrganizationCommitteeRecord[]>([]); const [saving, setSaving] = useState(false); useEffect(() => { void getOrganizationManagementDetail(user, organizationId).then((detail) => setCommittees(detail.committees)); }, [organizationId, user]); async function save() { setSaving(true); try { await updateOrganizationMember(user, organizationId, member.id, { membershipRole: role, position, committeeId: committeeId || null }); onSaved(); } finally { setSaving(false); } } return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-extrabold">{member.name}</h2><p className="mt-1 text-sm text-slate-500">Member profile and assignment</p><label className="mt-5 block text-xs font-bold uppercase text-slate-500">Role<select value={role} onChange={(event) => setRole(event.target.value as typeof role)} className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"><option value="leader">Leader</option><option value="committee_head">Committee Head</option><option value="member">Member</option></select></label><label className="mt-4 block text-xs font-bold uppercase text-slate-500">Position<input value={position} onChange={(event) => setPosition(event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label><label className="mt-4 block text-xs font-bold uppercase text-slate-500">Committee<select value={committeeId} onChange={(event) => setCommitteeId(event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"><option value="">No committee</option>{committees.map((committee) => <option key={committee.id} value={committee.id}>{committee.name}</option>)}</select></label><div className="mt-6 flex gap-3"><button onClick={onClose} className="h-10 flex-1 rounded-xl border border-slate-200 text-sm font-bold">Cancel</button><button disabled={saving} onClick={() => void save()} className="h-10 flex-1 rounded-xl bg-[#213f68] text-sm font-bold text-white">{saving ? "Saving..." : "Save changes"}</button></div></div></div>; }

function Members({ search, members: visibleMembers, onSearch, joinRequests, isLeader, reviewingRequestId, onReview }: { search: string; members: MemberRow[]; onSearch: (value: string) => void; joinRequests: OrganizationJoinRequest[]; isLeader: boolean; reviewingRequestId: string; onReview: (id: string, status: "accepted" | "rejected") => void }) {
  return <div className="mt-6">{isLeader && joinRequests.length > 0 && <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><h3 className="text-sm font-bold text-amber-950">Pending join requests ({joinRequests.length})</h3><div className="mt-3 space-y-3">{joinRequests.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3"><div><p className="text-sm font-bold text-slate-900">{request.name}</p><p className="text-xs text-slate-500">{request.position} · {request.email}</p></div><div className="flex gap-2"><button disabled={reviewingRequestId === request.id} onClick={() => onReview(request.id, "rejected")} className="h-8 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-600">Decline</button><button disabled={reviewingRequestId === request.id} onClick={() => onReview(request.id, "accepted")} className="h-8 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white">Accept</button></div></div>)}</div></div>}<div className="flex items-center justify-between gap-4"><h2 className="text-[21px] font-bold">Member Management</h2></div><label className="mt-5 flex h-10 items-center gap-3 rounded-xl border border-[#dce3ed] bg-white px-3"><Search className="size-4 text-slate-500" /><input className="w-full bg-transparent text-[13px] outline-none placeholder:text-slate-500" onChange={(event) => onSearch(event.target.value)} placeholder="Search by name, role, or skill..." value={search} /></label><div className="mt-5 overflow-x-auto rounded-2xl border border-[#dce3ed] bg-white"><table className="min-w-[1180px] w-full border-collapse text-left"><thead className="bg-[#e8eef7] text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-semibold">Member Name</th><th className="px-3 py-3 font-semibold">Role</th><th className="px-3 py-3 font-semibold">Committee</th><th className="px-3 py-3 font-semibold">Skills</th><th className="px-3 py-3 font-semibold">Workload</th><th className="px-3 py-3 font-semibold">Reliability</th><th className="px-3 py-3 font-semibold">Availability</th><th className="px-4 py-3" /></tr></thead><tbody>{visibleMembers.map((member) => <tr className="border-t border-[#dfe5ee] text-[13px]" key={member.name}><td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar initials={member.initials} /><span className="font-medium">{member.name}</span></div></td><td className="px-3 py-3 text-slate-500">{member.role}</td><td className="px-3 py-3"><span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] text-violet-700">{member.committee}</span></td><td className="px-3 py-3"><div className="flex max-w-[410px] flex-wrap gap-1">{member.skills.map((skill) => <span className="rounded bg-[#e8eef7] px-2 py-0.5 text-[11px] text-[#214574]" key={skill}>{skill}</span>)}</div></td><td className="px-3 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-20 rounded bg-slate-100"><div className={`h-full rounded ${member.workload >= 80 ? "bg-rose-500" : member.workload >= 60 ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${member.workload}%` }} /></div><span className="text-[11px] text-slate-500">{member.workload}%</span></div></td><td className="px-3 py-3 text-[11px] font-semibold">{member.reliability}</td><td className="px-3 py-3"><Availability value={member.availability} /></td><td className="px-4 py-3 text-right text-[12px] font-medium text-[#2868ed]">View Profile</td></tr>)}</tbody></table>{visibleMembers.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No members match your search.</p>}</div></div>;
}

function EmptyPanel({ tab }: { tab: Exclude<OrganizationTab, "overview" | "members"> }) { const label = tab === "committees" ? "Committees" : "Announcements"; const Icon = tab === "committees" ? ClipboardList : Megaphone; return <div className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center"><Icon className="size-7 text-slate-400" /><h2 className="mt-3 text-lg font-bold">{label}</h2><p className="mt-1 text-sm text-slate-500">{label} will appear here once they are added to your organization.</p></div>; }
function LoadCard({ message }: { message: string }) { return <div className="mt-6 rounded-2xl border border-[#dce3ed] bg-white p-10 text-center text-sm text-slate-500">{message}</div>; }
function PendingJoinCard({ organizationName }: { organizationName: string }) { return <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-10 text-center"><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Pending approval</span><h2 className="mt-4 text-lg font-extrabold text-slate-900">Your request to join {organizationName} is pending</h2><p className="mt-2 text-sm text-slate-600">An organization leader must accept your request before you can access this organization.</p></div>; }
function ErrorCard({ message }: { message: string }) { return <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 p-8 text-center text-sm font-medium text-rose-700">{message}</div>; }
function CardTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: string }) { return <div className="flex min-h-12 items-center justify-between gap-3 px-4"><div><h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</h3>{subtitle && <p className="mt-0.5 text-[10px] text-slate-500">{subtitle}</p>}</div>{action && <button className="text-[11px] font-medium text-[#2868ed]">{action}</button>}</div>; }
function DetailRow({ label, value }: { label: string; value: string }) { return <div className="flex min-h-9 items-center justify-between gap-6 border-t border-[#e5eaf1] px-4 py-2 text-[11px]"><span className="uppercase text-slate-500">{label}</span><span className="max-w-[65%] truncate font-medium text-slate-700">{value}</span></div>; }
function ConfigRow({ label, value, tone }: { label: string; value: string; tone: "purple" | "green" }) { return <div className="flex items-center justify-between border-t border-[#e5eaf1] px-4 py-4 text-[12px]"><span>{label}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${tone === "purple" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"}`}>{value}</span></div>; }
function Stat({ value, label, color }: { value: string; label: string; color: string }) { return <div className="py-3 text-center"><p className={`text-[15px] font-bold ${color}`}>{value}</p><p className="mt-1 text-[10px] text-slate-500">{label}</p></div>; }
function Avatar({ initials }: { initials: string }) { return <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#213f68] text-[9px] font-bold text-white">{initials}</span>; }
function Availability({ value }: { value: string }) { const tone = value === "Available" ? "bg-emerald-50 text-emerald-600" : value === "Busy" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"; return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${tone}`}><i className="size-1 rounded-full bg-current" />{value}</span>; }
function GoalStatus({ status }: { status: string }) { const tone = status === "Completed" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status === "In Progress" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700"; return <span className={`rounded-full border px-2 py-0.5 text-[10px] ${tone}`}>{status}</span>; }
