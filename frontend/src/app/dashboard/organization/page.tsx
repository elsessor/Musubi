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
  Pencil,
  Save,
  Search,
  UsersRound
} from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useLogout } from "@/hooks/useLogout";
import { OrganizationAccessModal } from "@/components/dashboard/OrganizationAccessModal";
import { CreateCommitteeModal } from "@/components/dashboard/CreateCommitteeModal";
import { MemberProfileModal } from "@/components/dashboard/MemberProfileModal";
import {
  createOrganizationCommittee,
  getOrganizationCommittees,
  getMyOrganizationJoinRequest,
  getOrganization,
  getOrganizationJoinRequests,
  getOrganizationMembers,
  reviewOrganizationJoinRequest,
  subscribeOrganizationMembersFirestore,
  updateOrganizationDetails,
  type MyOrganizationJoinRequest,
  type OrganizationJoinRequest,
  type OrganizationMember,
  type OrganizationCommitteeRecord,
  type OrganizationRecord
} from "@/services/auth.service";
import { subscribeEventsFirestore } from "@/services/events.service";
import type { Event } from "@/components/events/types";
import { useAuthStore } from "@/store/authStore";
import { getDashboardNavItems } from "@/utils/routes";

type OrganizationTab = "overview" | "members" | "committees" | "announcements";

type MemberRow = { id: string; initials: string; name: string; role: string; committee: string; skills: string[]; workload: number; reliability: string; availability: string };
type GoalRow = { title: string; progress: number; due: string; status: string };

function greetingDate() {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());
}

function formatDate(value: string | null) {
  if (!value) return "Aug 12, 2024";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Aug 12, 2024" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function computeMemberStats(
  memberName: string,
  memberId: string,
  events: Event[],
  explicitStatus?: string
) {
  const nameTrimmed = memberName.trim().toLowerCase();
  const parts = nameTrimmed.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "";
  const lastName = parts[parts.length - 1] || "";
  const initials = parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  const allTasks = events.flatMap((e) => (e.tasks || []).map((t) => ({ ...t, eventTitle: e.title })));

  const memberTasks = allTasks.filter((t) => {
    const assigneeUID = t.assignedMemberUID || "";
    if (memberId && assigneeUID === memberId) return true;

    const assigneeName = (t.assignee?.name || t.assignedMemberName || "").trim().toLowerCase();
    const assigneeInitials = (t.assignee?.initials || "").trim().toUpperCase();

    if (!assigneeName && !assigneeInitials) return false;

    if (assigneeName === nameTrimmed || assigneeName.includes(nameTrimmed) || nameTrimmed.includes(assigneeName)) {
      return true;
    }
    if (firstName && firstName.length > 2 && assigneeName.includes(firstName)) {
      return true;
    }
    if (lastName && lastName.length > 2 && assigneeName.includes(lastName)) {
      return true;
    }
    if (assigneeInitials && (assigneeInitials === initials || initials.includes(assigneeInitials))) {
      return true;
    }
    return false;
  });

  const activeTasks = memberTasks.filter(
    (t) => t.status === "In Progress" || t.status === "To Do" || t.status === "In Review" || t.status === "Pending"
  );
  const completedTasks = memberTasks.filter(
    (t) => t.status === "Completed" || t.status === "Done"
  );

  const workload = Math.min(100, activeTasks.length * 25);

  let reliability = "95%";
  if (memberTasks.length > 0) {
    const relScore = Math.round((completedTasks.length / memberTasks.length) * 100);
    reliability = `${relScore}%`;
  } else if (completedTasks.length > 0) {
    reliability = "100%";
  }

  const availability =
    explicitStatus && (explicitStatus === "Available" || explicitStatus === "Busy" || explicitStatus === "On Leave")
      ? explicitStatus
      : activeTasks.length >= 4
      ? "Busy"
      : "Available";

  return {
    memberTasks,
    activeTasks,
    workload,
    reliability,
    availability
  };
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
  const [committees, setCommittees] = useState<OrganizationCommitteeRecord[]>([]);
  const [joinRequests, setJoinRequests] = useState<OrganizationJoinRequest[]>([]);
  const [myJoinRequest, setMyJoinRequest] = useState<MyOrganizationJoinRequest | null>(null);
  const [reviewingRequestId, setReviewingRequestId] = useState("");
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [committeeModalOpen, setCommitteeModalOpen] = useState(false);
  const [profileMember, setProfileMember] = useState<MemberRow | null>(null);
  const [events, setEvents] = useState<Event[]>([]);

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
    void Promise.all([getOrganization(firebaseUser, profile.organizationId), getOrganizationMembers(firebaseUser, profile.organizationId), getOrganizationCommittees(firebaseUser, profile.organizationId)])
      .then(([organizationData, memberData, committeeData]) => { setOrganization(organizationData); setMembers(memberData); setCommittees(committeeData); })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load this organization."))
      .finally(() => setLoading(false));
  }, [firebaseUser, profile]);

  useEffect(() => {
    if (!profile?.organizationId) return;
    const unsubscribe = subscribeOrganizationMembersFirestore(profile.organizationId, (realtimeMembers) => {
      if (realtimeMembers && realtimeMembers.length > 0) {
        setMembers(realtimeMembers);
      }
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [profile?.organizationId]);

  useEffect(() => {
    if (!firebaseUser || !profile?.organizationId) {
      setEvents([]);
      return;
    }
    const unsubscribe = subscribeEventsFirestore(firebaseUser, profile.organizationId, (realtimeEvents) => {
      setEvents(realtimeEvents);
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [firebaseUser, profile?.organizationId]);

  useEffect(() => {
    if (!firebaseUser || profile?.role !== "Student Leader" || !profile.organizationId) { setJoinRequests([]); return; }
    void getOrganizationJoinRequests(firebaseUser, profile.organizationId).then(setJoinRequests).catch(() => setJoinRequests([]));
  }, [firebaseUser, profile?.organizationId, profile?.role]);

  useEffect(() => {
    if (!firebaseUser || profile?.organizationId) { setMyJoinRequest(null); return; }
    void getMyOrganizationJoinRequest(firebaseUser).then(setMyJoinRequest).catch(() => setMyJoinRequest(null));
  }, [firebaseUser, profile?.organizationId]);

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

  async function createCommittee(input: { name: string; description: string; headMemberId: string | null; memberIds: string[] }) {
    if (!firebaseUser || !profile?.organizationId) return;
    const result = await createOrganizationCommittee(firebaseUser, profile.organizationId, input);
    setCommittees((current) => [...current, result.committee]);
    setMembers((current) => current.map((member) => input.memberIds.includes(member.id) ? { ...member, committeeId: result.committee.id, committeeName: result.committee.name } : member));
    setCommitteeModalOpen(false);
  }

  const memberRows = useMemo<MemberRow[]>(
    () =>
      members.map((member) => {
        const stats = computeMemberStats(
          member.name,
          member.id,
          events,
          (member as any).availability || (member as any).status
        );
        return {
          id: member.id,
          initials:
            member.name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase() || "?",
          name: member.name,
          role: member.position || member.role,
          committee:
            member.committeeName ||
            committees.find((committee) => committee.id === member.committeeId)?.name ||
            (member.committeeId ? "Assigned committee" : "Not assigned"),
          skills: member.skills,
          workload: stats.workload,
          reliability: stats.reliability,
          availability: stats.availability,
          assignedTasks: stats.activeTasks
        } as any;
      }),
    [committees, members, events]
  );

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return memberRows;
    return memberRows.filter((member) => [member.name, member.role, member.committee, ...member.skills].some((value) => value.toLowerCase().includes(query)));
  }, [memberRows, memberSearch]);

  if (authLoading || !profile) {
    return <div className="flex min-h-screen items-center justify-center bg-[#eef2f8] text-sm text-slate-500">Loading organization...</div>;
  }

  const user = {
    id: profile.uid,
    name: profile.fullName,
    role: profile.role,
    roleLabel: profile.position ?? profile.role,
    organizationName: organization?.name ?? profile.organizationName ?? "",
    academicYear: "AY 2025–2026",
    greetingDate: greetingDate()
  };

  return (
    <DashboardLayout activeNavId="organization" activities={[]} goals={[]} kpis={[]} navItems={getDashboardNavItems(profile.role)} notificationCount={0} onLogout={logout} user={user}>
      <section className="mx-auto w-full max-w-[1680px] text-[#12213a]">
        <div className="flex items-center justify-between gap-4"><h1 className="text-[21px] font-bold tracking-[-0.02em]">Organization</h1>{profile.role !== "Admin" && firebaseUser ? <button type="button" onClick={() => setAccessModalOpen(true)} className="flex h-9 items-center gap-2 rounded-xl bg-[#213f68] px-4 text-[12px] font-semibold text-white"><CirclePlus className="size-4" />{profile.role === "Student Leader" ? "Create or join" : "Join organization"}</button> : null}</div>
        <div className="mt-5 flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl bg-[#e8eef7] p-1.5">
          <TabButton active={activeTab === "overview"} icon={BriefcaseBusiness} label="Overview" onClick={() => setActiveTab("overview")} />
          <TabButton active={activeTab === "members"} icon={UsersRound} label="Members" onClick={() => setActiveTab("members")} />
          <TabButton active={activeTab === "committees"} icon={ClipboardList} label="Committees" onClick={() => setActiveTab("committees")} />
          <TabButton active={activeTab === "announcements"} icon={Bell} label="Announcements" onClick={() => setActiveTab("announcements")} />
        </div>

        {loading ? <LoadCard message="Loading organization profile..." /> : error ? <ErrorCard message={error} /> : !organization ? myJoinRequest ? <PendingJoinCard organizationName={myJoinRequest.organizationName} /> : <LoadCard message="Use the button above to request to join an organization or, if you are a leader, create one." /> : activeTab === "overview" ? <Overview organization={organization} members={members} memberCount={members.length} events={events} firebaseUser={firebaseUser} onUpdate={setOrganization} onNavigateMembers={() => setActiveTab("members")} /> : activeTab === "members" ? <Members search={memberSearch} members={filteredMembers} onSearch={setMemberSearch} joinRequests={joinRequests} isLeader={profile.role === "Student Leader"} reviewingRequestId={reviewingRequestId} onReview={reviewJoinRequest} onViewProfile={setProfileMember} currentUserId={profile.uid} currentUserName={profile.fullName} /> : activeTab === "committees" ? <Committees committees={committees} members={members} canCreate={profile.role === "Student Leader"} onCreate={() => setCommitteeModalOpen(true)} currentUserId={profile.uid} currentUserName={profile.fullName} /> : <EmptyPanel tab={activeTab} />}
      </section>
      {accessModalOpen && firebaseUser && profile.role !== "Admin" ? <OrganizationAccessModal role={profile.role} user={firebaseUser} onClose={() => setAccessModalOpen(false)} onComplete={(updatedProfile) => { setProfile({ ...profile, ...updatedProfile }); setOrganization(null); setMembers([]); setLoading(true); }} /> : null}
      {committeeModalOpen ? <CreateCommitteeModal members={members} onClose={() => setCommitteeModalOpen(false)} onCreate={createCommittee} /> : null}
      {profileMember ? <MemberProfileModal member={profileMember} onClose={() => setProfileMember(null)} /> : null}
    </DashboardLayout>
  );
}

function TabButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Bell; label: string; onClick: () => void }) {
  return <button className={`flex h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-[13px] font-medium transition ${active ? "bg-white text-[#15233c] shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"}`} onClick={onClick} type="button"><Icon className="size-4" strokeWidth={1.7} />{label}</button>;
}

function Overview({
  organization,
  members,
  memberCount,
  events,
  firebaseUser,
  onUpdate,
  onNavigateMembers
}: {
  organization: OrganizationRecord;
  members: OrganizationMember[];
  memberCount: number;
  events: Event[];
  firebaseUser: import("firebase/auth").User | null;
  onUpdate: (updated: OrganizationRecord) => void;
  onNavigateMembers: () => void;
}) {
  const doneGoalsCount = useMemo(() => events.filter((e) => e.status === "Completed").length, [events]);
  const activeGoalsCount = useMemo(() => events.filter((e) => e.status === "Active").length, [events]);
  const pendingGoalsCount = useMemo(() => events.filter((e) => e.status !== "Completed" && e.status !== "Active").length, [events]);

  return (
    <div className="mt-5 space-y-4">
      <article className="overflow-hidden rounded-2xl border border-[#d9e1ec] bg-white">
        <div className="relative overflow-hidden bg-[#213f68] px-6 py-6 text-white sm:px-7">
          <div className="absolute -right-8 -top-16 size-44 rounded-full bg-[#385779]" />
          <div className="relative flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#2868ed] text-white">
              <BriefcaseBusiness className="size-6" />
            </div>
            <div>
              <h2 className="text-[21px] font-bold tracking-[-0.02em]">{organization.name || "University Student Council"}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded-full bg-white/15 px-2.5 py-0.5">{organization.type || "Governing"}</span>
                <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-emerald-200">
                  {organization.status === "active" ? "Complete" : organization.status || "Complete"}
                </span>
                <span className="text-blue-100">Created {formatDate(organization.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-[#dce3ed] lg:grid-cols-4 lg:divide-y-0">
          <Stat value={String(memberCount)} label="Total Members" color="text-[#2868ed]" />
          <Stat value={String(activeGoalsCount)} label="Active Goals" color="text-[#7c3aed]" />
          <Stat
            value={typeof organization.organizationConfig.delegationMode === "string" ? organization.organizationConfig.delegationMode : "Heuristic"}
            label="Delegation"
            color="text-amber-500"
          />
          <Stat
            value={typeof organization.organizationConfig.nudgeMonitoring === "boolean" ? (organization.organizationConfig.nudgeMonitoring ? "On" : "Off") : "On"}
            label="Nudges"
            color="text-emerald-500"
          />
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <OrganizationDetailsCard organization={organization} firebaseUser={firebaseUser} onUpdate={onUpdate} />

        <div className="space-y-4">
          <article className="overflow-hidden rounded-2xl border border-[#dce3ed] bg-white">
            <CardTitle title="Orchestration Config" />
            <ConfigRow
              label="Delegation Mode"
              value={typeof organization.organizationConfig.delegationMode === "string" ? organization.organizationConfig.delegationMode : "Heuristic"}
              tone="purple"
            />
            <ConfigRow
              label="AI Task Atomization"
              value={organization.organizationConfig.aiTaskAtomization !== false ? "Enabled" : "Not configured"}
              tone="green"
            />
            <ConfigRow
              label="Nudge Monitoring"
              value={organization.organizationConfig.nudgeMonitoring !== false ? "Enabled" : "Not configured"}
              tone="green"
            />
          </article>

          <article className="overflow-hidden rounded-2xl border border-[#dce3ed] bg-white">
            <CardTitle title="Members Preview" action="View All ->" onActionClick={onNavigateMembers} />
            {members.length > 0 ? (
              <div className="divide-y divide-[#e5eaf1]">
                {members.slice(0, 5).map((m) => {
                  const initials = m.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase() || "?";
                  const isYou = Boolean(firebaseUser?.uid && m.id === firebaseUser.uid);
                  return (
                    <MemberPreviewRow
                      key={m.id || m.name}
                      initials={initials}
                      name={m.name}
                      role={m.position || m.role}
                      status="Available"
                      isYou={isYou}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-xs font-medium text-slate-500">
                No members in this organization yet.
              </div>
            )}
          </article>
        </div>
      </div>

      <article className="overflow-hidden rounded-2xl border border-[#dce3ed] bg-white">
        <div className="flex min-h-12 items-center justify-between gap-3 px-4 py-3 border-b border-[#e5eaf1]">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">GOALS</h3>
            <p className="mt-0.5 text-[11px] text-slate-500">Organizational goals - managed in Goals &amp; Tasks</p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold">
            <span className="text-emerald-600">{doneGoalsCount} done</span>
            <span className="text-blue-600">{activeGoalsCount} active</span>
            <span className="text-amber-600">{pendingGoalsCount} pending</span>
          </div>
        </div>
        {events.length > 0 ? (
          <div className="divide-y divide-[#e5eaf1]">
            {events.slice(0, 5).map((e) => {
              const goalStatusLabel = e.status === "Completed" ? "Completed" : e.status === "Active" ? "In Progress" : "Pending";
              return (
                <div key={e.id} className="flex items-center justify-between px-4 py-3 text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">{e.title}</p>
                    {e.description && <p className="text-[11px] text-slate-500 line-clamp-1">{e.description}</p>}
                  </div>
                  <GoalStatus status={goalStatusLabel} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-xs font-medium text-slate-500">
            No organizational goals set yet. Goals will appear here once created in Goals &amp; Tasks.
          </div>
        )}
      </article>
    </div>
  );
}

function OrganizationDetailsCard({
  organization,
  firebaseUser,
  onUpdate
}: {
  organization: OrganizationRecord;
  firebaseUser: import("firebase/auth").User | null;
  onUpdate: (updated: OrganizationRecord) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(organization.name);
  const [type, setType] = useState(organization.type);
  const [description, setDescription] = useState(organization.description || "");
  const [setupStatus, setSetupStatus] = useState(organization.status === "active" ? "Complete" : organization.status || "Complete");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const defaultDescription =
    "The University Student Council (USC) is the highest governing student body of the university, responsible for representing the student population, organizing academic and socio-civic activities, and fostering a culture of excellence and leadership among students.";

  const displayDescription = organization.description || defaultDescription;

  function handleStartEdit() {
    setName(organization.name || "University Student Council");
    setType(organization.type || "Governing");
    setDescription(organization.description || defaultDescription);
    setSetupStatus(organization.status === "active" ? "Complete" : organization.status || "Complete");
    setError("");
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
    setError("");
  }

  async function handleSave() {
    if (!firebaseUser) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateOrganizationDetails(firebaseUser, organization.id, {
        name: name.trim(),
        type: type.trim(),
        description: description.trim(),
        setupStatus: setupStatus.trim().toLowerCase() === "complete" ? "active" : setupStatus.trim()
      });
      onUpdate(updated);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update organization details.");
    } finally {
      setSaving(false);
    }
  }

  if (isEditing) {
    return (
      <article className="overflow-hidden rounded-2xl border border-[#dce3ed] bg-white shadow-sm">
        <div className="flex min-h-12 items-center justify-between gap-3 px-5 py-3 border-b border-[#e5eaf1]">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            ORGANIZATION DETAILS
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="text-[12px] font-medium text-slate-500 hover:text-slate-800 transition"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600 hover:text-emerald-700 transition"
              type="button"
            >
              <Save className="size-3.5 text-emerald-600" />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mx-5 mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-[13px] font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              TYPE
            </label>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-[13px] font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              DESCRIPTION
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-[13px] leading-relaxed font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              SETUP STATUS
            </label>
            <input
              type="text"
              value={setupStatus}
              onChange={(e) => setSetupStatus(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-[13px] font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-[#dce3ed] bg-white shadow-sm">
      <div className="flex min-h-12 items-center justify-between gap-3 px-5 py-3 border-b border-[#e5eaf1]">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          ORGANIZATION DETAILS
        </h3>
        <button
          onClick={handleStartEdit}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2868ed] hover:text-blue-700 transition"
          type="button"
        >
          <Pencil className="size-3" />
          Edit
        </button>
      </div>

      <div className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">DESCRIPTION</p>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-600 font-medium">
          {displayDescription}
        </p>
      </div>

      <DetailRow label="Org UID" value={organization.id} />
      <DetailRow label="Type" value={organization.type || "Governing"} />
      <DetailRow label="Setup status" value={organization.status === "active" ? "Complete" : organization.status || "Complete"} />
      <DetailRow label="Created at" value={formatDate(organization.createdAt)} />
    </article>
  );
}

function MemberPreviewRow({ initials, name, role, status, isYou }: { initials: string; name: string; role: string; status: "Available" | "Busy"; isYou?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 text-[12px] transition ${isYou ? "bg-blue-50/60 font-medium" : ""}`}>
      <div className="flex items-center gap-3">
        <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${isYou ? "bg-[#2563eb] ring-2 ring-blue-300" : "bg-[#213f68]"}`}>
          {initials}
        </span>
        <div>
          <div className="flex items-center gap-1.5">
            <p className={`font-semibold leading-tight ${isYou ? "text-[#1d4ed8]" : "text-slate-900"}`}>{name}</p>
            {isYou ? (
              <span className="rounded-full bg-[#2563eb] px-1.5 py-0.2 text-[9px] font-bold text-white">
                You
              </span>
            ) : null}
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">{role}</p>
        </div>
      </div>
      <Availability value={status} />
    </div>
  );
}

function Members({ search, members: visibleMembers, onSearch, joinRequests, isLeader, reviewingRequestId, onReview, onViewProfile, currentUserId, currentUserName }: { search: string; members: MemberRow[]; onSearch: (value: string) => void; joinRequests: OrganizationJoinRequest[]; isLeader: boolean; reviewingRequestId: string; onReview: (id: string, status: "accepted" | "rejected") => void; onViewProfile: (member: MemberRow) => void; currentUserId?: string; currentUserName?: string }) {
  return <div className="mt-6">{isLeader && joinRequests.length > 0 && <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><h3 className="text-sm font-bold text-amber-950">Pending join requests ({joinRequests.length})</h3><div className="mt-3 space-y-3">{joinRequests.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3"><div><p className="text-sm font-bold text-slate-900">{request.name}</p><p className="text-xs text-slate-500">{request.position} · {request.email}</p></div><div className="flex gap-2"><button disabled={reviewingRequestId === request.id} onClick={() => onReview(request.id, "rejected")} className="h-8 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-600">Decline</button><button disabled={reviewingRequestId === request.id} onClick={() => onReview(request.id, "accepted")} className="h-8 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white">Accept</button></div></div>)}</div></div>}<div className="flex items-center justify-between gap-4"><h2 className="text-[21px] font-bold">Member Management</h2></div><label className="mt-5 flex h-10 items-center gap-3 rounded-xl border border-[#dce3ed] bg-white px-3"><Search className="size-4 text-slate-500" /><input className="w-full bg-transparent text-[13px] outline-none placeholder:text-slate-500" onChange={(event) => onSearch(event.target.value)} placeholder="Search by name, role, or skill..." value={search} /></label><div className="mt-5 overflow-x-auto rounded-2xl border border-[#dce3ed] bg-white"><table className="min-w-[1180px] w-full border-collapse text-left"><thead className="bg-[#e8eef7] text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-semibold">Member Name</th><th className="px-3 py-3 font-semibold">Role</th><th className="px-3 py-3 font-semibold">Committee</th><th className="px-3 py-3 font-semibold">Skills</th><th className="px-3 py-3 font-semibold">Workload</th><th className="px-3 py-3 font-semibold">Reliability</th><th className="px-3 py-3 font-semibold">Availability</th><th className="px-4 py-3" /></tr></thead><tbody>{visibleMembers.map((member) => { const isYou = Boolean((currentUserId && member.id === currentUserId) || (currentUserName && member.name.trim().toLowerCase() === currentUserName.trim().toLowerCase())); return <tr className={`border-t border-[#dfe5ee] text-[13px] transition ${isYou ? "bg-blue-50/70 hover:bg-blue-50/90 font-medium" : "hover:bg-slate-50/60"}`} key={member.id || member.name}><td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar initials={member.initials} isYou={isYou} /><span className={isYou ? "font-extrabold text-[#1d4ed8]" : "font-medium text-slate-900"}>{member.name}</span>{isYou ? <span className="rounded-full bg-[#2563eb] px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">You</span> : null}</div></td><td className="px-3 py-3 text-slate-500">{member.role}</td><td className="px-3 py-3"><span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] text-violet-700">{member.committee}</span></td><td className="px-3 py-3"><div className="flex max-w-[410px] flex-wrap gap-1">{member.skills.slice(0, 4).map((skill) => <span className="rounded bg-[#e8eef7] px-2 py-0.5 text-[11px] text-[#214574]" key={skill}>{skill}</span>)}{member.skills.length > 4 ? <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">+{member.skills.length - 4}</span> : null}</div></td><td className="px-3 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-20 rounded bg-slate-100"><div className={`h-full rounded ${member.workload >= 80 ? "bg-rose-500" : member.workload >= 60 ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${member.workload}%` }} /></div><span className="text-[11px] text-slate-500">{member.workload}%</span></div></td><td className="px-3 py-3 text-[11px] font-semibold">{member.reliability}</td><td className="px-3 py-3"><Availability value={member.availability} /></td><td className="px-4 py-3 text-right"><button type="button" onClick={() => onViewProfile(member)} className="text-[12px] font-medium text-[#2868ed] hover:text-blue-700">View Profile</button></td></tr>; })}</tbody></table>{visibleMembers.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No members match your search.</p>}</div></div>;
}
function Committees({ committees, members, canCreate, onCreate, currentUserId, currentUserName }: { committees: OrganizationCommitteeRecord[]; members: OrganizationMember[]; canCreate: boolean; onCreate: () => void; currentUserId?: string; currentUserName?: string }) { return <div className="mt-6"><div className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-slate-500">Sub-groups within the organization. Each committee has a designated head and a set of members.</p>{canCreate ? <button type="button" onClick={onCreate} className="flex h-9 items-center gap-2 rounded-xl bg-[#213f68] px-4 text-[12px] font-semibold text-white"><CirclePlus className="size-4" />New Committee</button> : null}</div>{committees.length ? <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{committees.map((committee) => { const committeeMembers = members.filter((member) => member.committeeId === committee.id); const head = members.find((member) => member.id === committee.headMemberUID); return <a key={committee.id} href={`/dashboard/organization/committees/${committee.id}`} className="block cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md"><article className="rounded-2xl border border-[#dce3ed] bg-white p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-sm font-bold text-slate-900">{committee.name}</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">{committee.description || "No description provided."}</p></div><span className="font-mono text-[10px] text-slate-500">{committee.id.slice(0, 7).toUpperCase()}</span></div><div className="my-3 border-t border-slate-100" /><p className="text-xs text-slate-700">🏆 Head: <span className="font-semibold">{head?.name || "Not assigned"}</span></p><p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Members ({committeeMembers.length})</p><div className="mt-2 flex flex-wrap gap-2">{committeeMembers.length ? committeeMembers.map((member) => { const isYou = Boolean((currentUserId && member.id === currentUserId) || (currentUserName && member.name.trim().toLowerCase() === currentUserName.trim().toLowerCase())); return <span key={member.id} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${isYou ? "bg-blue-100 text-[#1d4ed8] font-bold ring-1 ring-blue-300" : "bg-[#e8eef7] text-[#213f68]"}`}><span className={`flex size-4 items-center justify-center rounded-full text-[7px] text-white ${isYou ? "bg-[#2563eb]" : "bg-[#213f68]"}`}>{member.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</span>{member.name.split(" ")[0]}{isYou ? " (You)" : ""}</span>; }) : <span className="text-xs text-slate-400">No members assigned.</span>}</div></article></a>; })}</div> : <div className="mt-5 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center"><ClipboardList className="size-7 text-slate-400" /><h2 className="mt-3 text-lg font-bold">No committees yet</h2><p className="mt-1 text-sm text-slate-500">Create a committee to organize members around a shared responsibility.</p>{canCreate ? <button onClick={onCreate} className="mt-4 rounded-xl bg-[#213f68] px-4 py-2 text-sm font-semibold text-white" type="button">Create committee</button> : null}</div>}</div>; }
function EmptyPanel({ tab }: { tab: Exclude<OrganizationTab, "overview" | "members"> }) { const label = tab === "committees" ? "Committees" : "Announcements"; const Icon = tab === "committees" ? ClipboardList : Megaphone; return <div className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center"><Icon className="size-7 text-slate-400" /><h2 className="mt-3 text-lg font-bold">{label}</h2><p className="mt-1 text-sm text-slate-500">{label} will appear here once they are added to your organization.</p></div>; }
function LoadCard({ message }: { message: string }) { return <div className="mt-6 rounded-2xl border border-[#dce3ed] bg-white p-10 text-center text-sm text-slate-500">{message}</div>; }
function PendingJoinCard({ organizationName }: { organizationName: string }) { return <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-10 text-center"><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Pending approval</span><h2 className="mt-4 text-lg font-extrabold text-slate-900">Your request to join {organizationName} is pending</h2><p className="mt-2 text-sm text-slate-600">An organization leader must accept your request before you can access this organization.</p></div>; }
function ErrorCard({ message }: { message: string }) { return <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 p-8 text-center text-sm font-medium text-rose-700">{message}</div>; }
function CardTitle({ title, subtitle, action, onActionClick }: { title: string; subtitle?: string; action?: string; onActionClick?: () => void }) { return <div className="flex min-h-12 items-center justify-between gap-3 px-4 py-3 border-b border-[#e5eaf1]"><div><h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</h3>{subtitle && <p className="mt-0.5 text-[10px] text-slate-500">{subtitle}</p>}</div>{action && <button onClick={onActionClick} className="text-[11px] font-medium text-[#2868ed] hover:text-blue-700 transition">{action}</button>}</div>; }
function DetailRow({ label, value }: { label: string; value: string }) { return <div className="flex min-h-9 items-center justify-between gap-6 border-t border-[#e5eaf1] px-4 py-2.5 text-[11px]"><span className="uppercase font-semibold text-slate-500">{label}</span><span className="max-w-[65%] truncate font-medium text-slate-700">{value}</span></div>; }
function ConfigRow({ label, value, tone }: { label: string; value: string; tone: "purple" | "green" }) { return <div className="flex items-center justify-between border-t border-[#e5eaf1] px-4 py-4 text-[12px]"><span className="font-medium text-slate-800">{label}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${tone === "purple" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"}`}>{value}</span></div>; }
function Stat({ value, label, color }: { value: string; label: string; color: string }) { return <div className="py-3 text-center"><p className={`text-[15px] font-bold ${color}`}>{value}</p><p className="mt-1 text-[10px] text-slate-500">{label}</p></div>; }
function Avatar({ initials, isYou }: { initials: string; isYou?: boolean }) { return <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${isYou ? "bg-[#2563eb] ring-2 ring-blue-300" : "bg-[#213f68]"}`}>{initials}</span>; }
function Availability({ value }: { value: string }) { const tone = value === "Available" ? "bg-emerald-50 text-emerald-600" : value === "Busy" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"; return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${tone}`}><i className="size-1 rounded-full bg-current" />{value}</span>; }
function GoalStatus({ status }: { status: string }) { const tone = status === "Completed" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status === "In Progress" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700"; return <span className={`rounded-full border px-2 py-0.5 text-[10px] ${tone}`}>{status}</span>; }
