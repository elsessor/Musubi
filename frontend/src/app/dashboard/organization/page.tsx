"use client";

import { getStatusTheme, type CustomStatusConfig } from "@/components/events/statusUtils";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { OrganizationMemberTable } from "@/components/dashboard/OrganizationMemberTable";
import { OrganizationTypeSelect } from "@/components/dashboard/OrganizationTypeSelect";
import { useLogout } from "@/hooks/useLogout";
import { OrganizationAccessModal } from "@/components/dashboard/OrganizationAccessModal";
import { CreateCommitteeModal } from "@/components/dashboard/CreateCommitteeModal";
import { MemberProfileModal } from "@/components/dashboard/MemberProfileModal";
import { ConfirmRemoveCommitteeMemberModal } from "@/components/dashboard/ConfirmRemoveCommitteeMemberModal";
import { OrganizationSettingsModal, type OrganizationSettings } from "@/components/dashboard/OrganizationSettingsModal";
import {
  createOrganizationCommittee,
  getOrganizationCommittees,
  getMyOrganizationJoinRequest,
  getOrganization,
  getOrganizationJoinRequests,
  getOrganizationMembers,
  removeOrganizationMember,
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
import { AvailabilityBadge } from "@/components/dashboard/AvailabilityBadge";
import { useAuthStore } from "@/store/authStore";
import { MemberAvatar } from "@/components/dashboard/MemberAvatar";
import { useToastStore } from "@/store/toastStore";
import { getDashboardNavItems } from "@/utils/routes";
import { AnnouncementsView, PostAnnouncementModal } from "@/components/dashboard/AnnouncementsView";
import {
  createAnnouncementFirestore,
  subscribeAnnouncementsFirestore,
  type Announcement
} from "@/services/announcements.service";

type OrganizationTab = "overview" | "members" | "committees" | "announcements";

type MemberRow = { profilePicture?: string | null; id: string; initials: string; name: string; role: string; committee: string; skills: string[]; workload: number; reliability: string; availability: string };
type GoalRow = { title: string; progress: number; due: string; status: string };

function greetingDate() {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());
}

function formatDate(value: string | null) {
  if (!value) return "Aug 12, 2024";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Aug 12, 2024" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default function OrganizationPage() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const authLoading = useAuthStore((state) => state.loading);
  const setProfile = useAuthStore((state) => state.setProfile);
  const showToast = useToastStore((state) => state.showToast);
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
  const [memberToRemove, setMemberToRemove] = useState<MemberRow | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isPostAnnouncementOpen, setIsPostAnnouncementOpen] = useState(false);

  useEffect(() => {
    const orgId = profile?.organizationId || "default-org";
    const unsubscribe = subscribeAnnouncementsFirestore(orgId, profile?.role, (data) => {
      setAnnouncements(data);
    });
    return () => unsubscribe();
  }, [profile?.organizationId, profile?.role]);

  useEffect(() => {
    function restoreTab() {
      const tab = new URLSearchParams(window.location.search).get("tab");
      setActiveTab(tab === "members" || tab === "committees" || tab === "announcements" ? tab : "overview");
    }
    restoreTab();
    window.addEventListener("popstate", restoreTab);
    return () => window.removeEventListener("popstate", restoreTab);
  }, []);

  function handleChangeTab(tab: OrganizationTab) {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(window.history.state, "", url);
  }

  async function handlePostAnnouncement(data: {
    title: string;
    content: string;
    targetAudience: string;
    isPinned: boolean;
  }) {
    const orgId = profile?.organizationId || "default-org";
    try {
      const newAnn = await createAnnouncementFirestore(orgId, {
        ...data,
        authorName: profile?.fullName || "Student Leader",
        authorUid: profile?.uid,
        authorRole: profile?.position || profile?.role || "Student Leader"
      });

      setAnnouncements((prev) => {
        if (prev.some((a) => a.id === newAnn.id)) return prev;
        const updated = [newAnn, ...prev];
        return updated.sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return (b.timestamp || 0) - (a.timestamp || 0);
        });
      });
      showToast({
        title: "Announcement posted",
        description: "Your announcement is now available to its selected audience.",
        tone: "success"
      });
    } catch (err) {
      console.warn("[OrganizationPage] Error creating announcement:", err);
      showToast({
        title: "Announcement not posted",
        description: "We couldn’t post your announcement. Please try again.",
        tone: "error"
      });
      throw err;
    }
  }

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
      setMembers(realtimeMembers);
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
    showToast({
      title: "Committee created",
      description: `${result.committee.name} is ready to manage.`,
      tone: "success"
    });
    setCommitteeModalOpen(false);
  }

  async function removeMemberFromOrganization() {
    if (!firebaseUser || !profile?.organizationId || !memberToRemove) return;
    setIsRemovingMember(true);
    try {
      await removeOrganizationMember(firebaseUser, profile.organizationId, memberToRemove.id);
      setMembers((current) => current.filter((member) => member.id !== memberToRemove.id));
      setCommittees((current) => current.map((committee) => committee.headMemberUID === memberToRemove.id ? { ...committee, headMemberUID: null, headMemberId: null } : committee));
      setProfileMember((current) => current?.id === memberToRemove.id ? null : current);
      showToast({ title: "Member removed", description: `${memberToRemove.name} was removed from the organization.`, tone: "success" });
      setMemberToRemove(null);
    } catch (cause) {
      showToast({ title: "Unable to remove member", description: cause instanceof Error ? cause.message : "Please try again.", tone: "error" });
    } finally {
      setIsRemovingMember(false);
    }
  }

  async function saveOrganizationSettings(settings: OrganizationSettings) {
    if (!firebaseUser || !profile?.organizationId || profile.role !== "Student Leader") {
      throw new Error("Only this organization's student leader can change these settings.");
    }
    const updated = await updateOrganizationDetails(firebaseUser, profile.organizationId, { organizationConfig: settings });
    setOrganization(updated);
    showToast({ title: "Organization settings saved", description: "Task assignment and monitoring settings were updated.", tone: "success" });
  }

  const memberRows = useMemo<MemberRow[]>(
    () =>
      members.map((member) => {
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
          profilePicture: member.profilePicture,
          role: member.position || member.role,
          committee:
            member.committeeName ||
            committees.find((committee) => committee.id === member.committeeId)?.name ||
            (member.committeeId ? "Assigned committee" : "Not assigned"),
          skills: member.skills,
          workload: member.workload ?? 0,
          reliability: member.reliability ?? "?",
          availability: member.availability || "Available",
          assignedTasks: member.assignedTasks
        } as any;
      }),
    [committees, members]
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
          <TabButton active={activeTab === "overview"} icon={BriefcaseBusiness} label="Overview" onClick={() => handleChangeTab("overview")} />
          <TabButton active={activeTab === "members"} icon={UsersRound} label="Members" onClick={() => handleChangeTab("members")} />
          <TabButton active={activeTab === "committees"} icon={ClipboardList} label="Committees" onClick={() => handleChangeTab("committees")} />
          <TabButton active={activeTab === "announcements"} icon={Bell} label="Announcements" onClick={() => handleChangeTab("announcements")} />
        </div>

        {loading ? (
          <LoadCard message="Loading organization profile..." />
        ) : error ? (
          <ErrorCard message={error} />
        ) : !organization ? (
          myJoinRequest ? (
            <PendingJoinCard organizationName={myJoinRequest.organizationName} />
          ) : (
            <LoadCard message="Use the button above to request to join an organization or, if you are a leader, create one." />
          )
        ) : activeTab === "overview" ? (
          <Overview
            organization={organization}
            members={members}
            memberCount={members.length}
            events={events}
            firebaseUser={firebaseUser}
            isLeader={profile.role === "Student Leader"}
            onUpdate={setOrganization}
            onSaveSettings={saveOrganizationSettings}
            onNavigateMembers={() => handleChangeTab("members")}
          />
        ) : activeTab === "members" ? (
          <Members
            search={memberSearch}
            members={filteredMembers}
            onSearch={setMemberSearch}
            joinRequests={joinRequests}
            isLeader={profile.role === "Student Leader"}
            reviewingRequestId={reviewingRequestId}
            onReview={reviewJoinRequest}
            onViewProfile={setProfileMember}
            currentUserId={profile.uid}
            currentUserName={profile.fullName}
            onRemoveMember={setMemberToRemove}
          />
        ) : activeTab === "committees" ? (
          <Committees
            committees={committees}
            members={members}
            canCreate={profile.role === "Student Leader"}
            onCreate={() => setCommitteeModalOpen(true)}
            currentUserId={profile.uid}
            currentUserName={profile.fullName}
          />
        ) : activeTab === "announcements" ? (
          <AnnouncementsView
            announcements={announcements}
            isLeader={profile.role === "Student Leader" || profile.role === "Admin"}
            onPostAnnouncement={() => setIsPostAnnouncementOpen(true)}
          />
        ) : (
          <EmptyPanel tab={activeTab} />
        )}
      </section>
      {accessModalOpen && firebaseUser && profile.role !== "Admin" ? (
        <OrganizationAccessModal
          role={profile.role}
          user={firebaseUser}
          onClose={() => setAccessModalOpen(false)}
          onComplete={(updatedProfile) => {
            setProfile({ ...profile, ...updatedProfile });
            setOrganization(null);
            setMembers([]);
            setLoading(true);
          }}
        />
      ) : null}
      {committeeModalOpen ? (
        <CreateCommitteeModal
          members={members}
          onClose={() => setCommitteeModalOpen(false)}
          onCreate={createCommittee}
        />
      ) : null}
      {profileMember ? <MemberProfileModal member={profileMember} onClose={() => setProfileMember(null)} /> : null}
      {memberToRemove ? <ConfirmRemoveCommitteeMemberModal memberName={memberToRemove.name} committeeName="" organizationRemoval isRemoving={isRemovingMember} onCancel={() => setMemberToRemove(null)} onConfirm={() => void removeMemberFromOrganization()} /> : null}
      <PostAnnouncementModal
        isOpen={isPostAnnouncementOpen}
        onClose={() => setIsPostAnnouncementOpen(false)}
        onSubmit={handlePostAnnouncement}
      />
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
  isLeader,
  onUpdate,
  onSaveSettings,
  onNavigateMembers
}: {
  organization: OrganizationRecord;
  members: OrganizationMember[];
  memberCount: number;
  events: Event[];
  firebaseUser: import("firebase/auth").User | null;
  isLeader: boolean;
  onUpdate: (updated: OrganizationRecord) => void;
  onSaveSettings: (settings: OrganizationSettings) => Promise<void>;
  onNavigateMembers: () => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const doneGoalsCount = useMemo(() => events.filter((e) => e.status === "Completed").length, [events]);
  const activeGoalsCount = useMemo(() => events.filter((e) => e.status === "Active").length, [events]);
  const pendingGoalsCount = useMemo(() => events.filter((e) => e.status !== "Completed" && e.status !== "Active").length, [events]);
  const organizationSettings: OrganizationSettings = {
    delegationMode: organization.organizationConfig.delegationMode === "Manual" ? "Manual" : "Heuristic",
    aiTaskAtomization: organization.organizationConfig.aiTaskAtomization !== false,
    nudgeMonitoring: organization.organizationConfig.nudgeMonitoring !== false
  };

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
        <div className={`grid grid-cols-2 divide-x divide-y divide-[#dce3ed] ${isLeader ? "lg:grid-cols-4 lg:divide-y-0" : "lg:grid-cols-2 lg:divide-y-0"}`}>
          <Stat value={String(memberCount)} label="Total Members" color="text-[#2868ed]" />
          <Stat value={String(activeGoalsCount)} label="Active Events" color="text-[#7c3aed]" />
          {isLeader ? (
            <>
              <Stat value={organizationSettings.delegationMode} label="Delegation" color="text-amber-500" />
              <Stat value={organizationSettings.nudgeMonitoring ? "On" : "Off"} label="Nudges" color="text-emerald-500" />
            </>
          ) : null}
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <OrganizationDetailsCard organization={organization} firebaseUser={firebaseUser} onUpdate={onUpdate} />

        <div className="space-y-4">
          <article className="overflow-hidden rounded-2xl border border-[#dce3ed] bg-white">
            {isLeader ? (
              <>
                <CardTitle title="Organization Settings" action="Edit" onActionClick={() => setSettingsOpen(true)} />
                <ConfigRow label="Delegation Mode" value={organizationSettings.delegationMode} tone="purple" />
                <ConfigRow label="AI Task Assistance" value={organizationSettings.aiTaskAtomization ? "Enabled" : "Disabled"} tone={organizationSettings.aiTaskAtomization ? "green" : "gray"} />
                <ConfigRow label="Nudge Monitoring" value={organizationSettings.nudgeMonitoring ? "Enabled" : "Disabled"} tone={organizationSettings.nudgeMonitoring ? "green" : "gray"} />
              </>
            ) : (
              <>
                <CardTitle title="AI Task Assistance" />
                <ConfigRow label="AI assistance for task suggestions" value={organizationSettings.aiTaskAtomization ? "Enabled" : "Disabled"} tone={organizationSettings.aiTaskAtomization ? "green" : "gray"} />
              </>
            )}
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
                      profilePicture={m.profilePicture}
                      role={m.position || m.role}
                      status={m.availability || "Available"}
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
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">EVENTS</h3>
            <p className="mt-0.5 text-[11px] text-slate-500">Organizational events - managed in Events &amp; Tasks</p>
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
              const goalStatusLabel = e.status;
              return (
                <div key={e.id} className="flex items-center justify-between px-4 py-3 text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">{e.title}</p>
                    {e.description && <p className="text-[11px] text-slate-500 line-clamp-1">{e.description}</p>}
                  </div>
                  <GoalStatus status={goalStatusLabel} customStatuses={e.eventCustomStatuses} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-xs font-medium text-slate-500">
            No organizational events yet. Events will appear here once created in Events &amp; Tasks.
          </div>
        )}
      </article>
      {isLeader && settingsOpen ? (
        <OrganizationSettingsModal
          initialSettings={organizationSettings}
          onClose={() => setSettingsOpen(false)}
          onSave={onSaveSettings}
        />
      ) : null}
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
  const setupStatus = organization.status === "active" ? "Complete" : organization.status || "Not set";
  const viewerRole = useAuthStore((state) => state.profile?.role);
  const canEditDetails = viewerRole === "Student Leader" || viewerRole === "Admin";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const defaultDescription =
    "The University Student Council (USC) is the highest governing student body of the university, responsible for representing the student population, organizing academic and socio-civic activities, and fostering a culture of excellence and leadership among students.";

  const displayDescription = organization.description || defaultDescription;

  function handleStartEdit() {
    setName(organization.name || "University Student Council");
    setType(organization.type || "");
    setDescription(organization.description || defaultDescription);
    setError("");
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
    setError("");
  }

  async function handleSave() {
    if (!firebaseUser || !canEditDetails) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateOrganizationDetails(firebaseUser, organization.id, {
        name: name.trim(),
        type: type.trim(),
        description: description.trim()
      });
      onUpdate(updated);
      setIsEditing(false);
      useToastStore.getState().showToast({ title: "Organization updated", description: "Your changes have been saved successfully.", tone: "success" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update organization details.");
    } finally {
      setSaving(false);
    }
  }

  if (isEditing) {
    return (
      <article className="rounded-2xl border border-[#dce3ed] bg-white shadow-sm">
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
            <div className="mt-1.5">
              <OrganizationTypeSelect value={type} onChange={setType} disabled={saving} buttonClassName="rounded-xl text-[13px] font-medium" />
            </div>
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
            <p className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-[13px] font-medium text-slate-600">{setupStatus}</p>
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
        {canEditDetails && <button
          onClick={handleStartEdit}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2868ed] hover:text-blue-700 transition"
          type="button"
        >
          <Pencil className="size-3" />
          Edit
        </button>}
      </div>

      <div className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">DESCRIPTION</p>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-600 font-medium">
          {displayDescription}
        </p>
      </div>

      <DetailRow label="Org UID" value={organization.id} />
      <DetailRow label="Type" value={organization.type || "Governing"} />
      <DetailRow label="Setup status" value={setupStatus} />
      <DetailRow label="Created at" value={formatDate(organization.createdAt)} />
    </article>
  );
}

function MemberPreviewRow({ name, profilePicture, role, status, isYou }: { profilePicture?: string | null; initials: string; name: string; role: string; status: string; isYou?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 text-[12px] transition ${isYou ? "bg-blue-50/60 font-medium" : ""}`}>
      <div className="flex items-center gap-3">
        <MemberAvatar member={{ name, profilePicture }} className={`size-7 ${isYou ? "ring-2 ring-blue-300" : ""}`} fallbackClassName={isYou ? "bg-[#2563eb] text-[9px]" : "text-[9px]"} />
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
      <AvailabilityBadge value={status} />
    </div>
  );
}

function Members({ search, members: visibleMembers, onSearch, joinRequests, isLeader, reviewingRequestId, onReview, onViewProfile, onRemoveMember, currentUserId, currentUserName }: { search: string; members: MemberRow[]; onSearch: (value: string) => void; joinRequests: OrganizationJoinRequest[]; isLeader: boolean; reviewingRequestId: string; onReview: (id: string, status: "accepted" | "rejected") => void; onViewProfile: (member: MemberRow) => void; onRemoveMember: (member: MemberRow) => void; currentUserId?: string; currentUserName?: string }) {
  return <div className="mt-6">{isLeader && joinRequests.length > 0 && <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><h3 className="text-sm font-bold text-amber-950">Pending join requests ({joinRequests.length})</h3><div className="mt-3 space-y-3">{joinRequests.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3"><div><p className="text-sm font-bold text-slate-900">{request.name}</p><p className="text-xs text-slate-500">{request.position} · {request.email}</p></div><div className="flex gap-2"><button disabled={reviewingRequestId === request.id} onClick={() => onReview(request.id, "rejected")} className="h-8 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-600">Decline</button><button disabled={reviewingRequestId === request.id} onClick={() => onReview(request.id, "accepted")} className="h-8 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white">Accept</button></div></div>)}</div></div>}<div className="flex items-center justify-between gap-4"><h2 className="text-[21px] font-bold">Member Management</h2></div><label className="mt-5 flex h-10 items-center gap-3 rounded-xl border border-[#dce3ed] bg-white px-3"><Search className="size-4 text-slate-500" /><input className="w-full bg-transparent text-[13px] outline-none placeholder:text-slate-500" onChange={(event) => onSearch(event.target.value)} placeholder="Search by name, role, or skill..." value={search} /></label><OrganizationMemberTable members={visibleMembers} onViewProfile={onViewProfile} onRemoveMember={onRemoveMember} isLeader={isLeader} currentUserId={currentUserId} currentUserName={currentUserName} /></div>;
}
function Committees({ committees, members, canCreate, onCreate, currentUserId, currentUserName }: {
  committees: OrganizationCommitteeRecord[];
  members: OrganizationMember[];
  canCreate: boolean;
  onCreate: () => void;
  currentUserId?: string;
  currentUserName?: string;
}) {
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-500">Sub-groups within the organization. Each committee has a designated head and a set of members.</p>
        {canCreate ? <button type="button" onClick={onCreate} className="flex h-9 items-center gap-2 rounded-xl bg-[#213f68] px-4 text-[12px] font-semibold text-white"><CirclePlus className="size-4" />New Committee</button> : null}
      </div>
      {committees.length ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {committees.map((committee) => <CommitteeCard key={committee.id} committee={committee} members={members} currentUserId={currentUserId} currentUserName={currentUserName} />)}
        </div>
      ) : (
        <div className="mt-5 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center">
          <ClipboardList className="size-7 text-slate-400" />
          <h2 className="mt-3 text-lg font-bold">No committees yet</h2>
          <p className="mt-1 text-sm text-slate-500">Create a committee to organize members around a shared responsibility.</p>
          {canCreate ? <button onClick={onCreate} className="mt-4 rounded-xl bg-[#213f68] px-4 py-2 text-sm font-semibold text-white" type="button">Create committee</button> : null}
        </div>
      )}
    </div>
  );
}
function CommitteeCard({ committee, members, currentUserId, currentUserName }: {
  committee: OrganizationCommitteeRecord;
  members: OrganizationMember[];
  currentUserId?: string;
  currentUserName?: string;
}) {
  const [selected, setSelected] = useState(false);
  const committeeMembers = members.filter((member) => member.committeeId === committee.id);
  const head = members.find((member) => member.id === committee.headMemberUID);
  return (
    <Link
      href={"/dashboard/organization/committees?committeeId=" + encodeURIComponent(committee.id)}
      onClick={() => setSelected(true)}
      className={`group block min-w-0 cursor-pointer rounded-2xl border p-5 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/60 focus-visible:border-blue-500 focus-visible:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:border-blue-500 active:bg-blue-100/60 ${selected ? "border-blue-500 bg-blue-50 ring-1 ring-blue-300" : "border-[#dce3ed] bg-white"}`}
    >
      <div className="min-w-0">
        <h3 className="break-words text-sm font-bold text-slate-900 group-hover:text-blue-700 group-focus-visible:text-blue-700">{committee.name}</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{committee.description || "No description provided."}</p>
      </div>
      <div className="my-3 border-t border-slate-100" />
      <p className="flex items-center gap-2 text-xs text-slate-700"><MemberAvatar member={head} className="size-6" />Head: <span className="font-semibold">{head?.name || "Not assigned"}</span></p>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Members ({committeeMembers.length})</p>
      <div className="mt-2 flex flex-wrap gap-2">{committeeMembers.length ? committeeMembers.map((member) => {
        const isYou = Boolean((currentUserId && member.id === currentUserId) || (currentUserName && member.name.trim().toLowerCase() === currentUserName.trim().toLowerCase()));
        return <span key={member.id} className={"flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium " + (isYou ? "bg-blue-100 font-bold text-[#1d4ed8] ring-1 ring-blue-300" : "bg-[#e8eef7] text-[#213f68]")}><MemberAvatar member={member} className="size-4" fallbackClassName={isYou ? "bg-[#2563eb] text-[7px]" : "text-[7px]"} />{member.name.split(" ")[0]}{isYou ? " (You)" : ""}</span>;
      }) : <span className="text-xs text-slate-400">No members assigned.</span>}</div>
    </Link>
  );
}
function EmptyPanel({ tab }: { tab: Exclude<OrganizationTab, "overview" | "members"> }) { const label = tab === "committees" ? "Committees" : "Announcements"; const Icon = tab === "committees" ? ClipboardList : Megaphone; return <div className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center"><Icon className="size-7 text-slate-400" /><h2 className="mt-3 text-lg font-bold">{label}</h2><p className="mt-1 text-sm text-slate-500">{label} will appear here once they are added to your organization.</p></div>; }
function LoadCard({ message }: { message: string }) { return <div className="mt-6 rounded-2xl border border-[#dce3ed] bg-white p-10 text-center text-sm text-slate-500">{message}</div>; }
function PendingJoinCard({ organizationName }: { organizationName: string }) { return <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-10 text-center"><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Pending approval</span><h2 className="mt-4 text-lg font-extrabold text-slate-900">Your request to join {organizationName} is pending</h2><p className="mt-2 text-sm text-slate-600">An organization leader must accept your request before you can access this organization.</p></div>; }
function ErrorCard({ message }: { message: string }) { return <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 p-8 text-center text-sm font-medium text-rose-700">{message}</div>; }
function CardTitle({ title, subtitle, action, onActionClick }: { title: string; subtitle?: string; action?: string; onActionClick?: () => void }) { return <div className="flex min-h-12 items-center justify-between gap-3 px-4 py-3 border-b border-[#e5eaf1]"><div><h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</h3>{subtitle && <p className="mt-0.5 text-[10px] text-slate-500">{subtitle}</p>}</div>{action && <button onClick={onActionClick} className="text-[11px] font-medium text-[#2868ed] hover:text-blue-700 transition">{action}</button>}</div>; }
function DetailRow({ label, value }: { label: string; value: string }) { return <div className="flex min-h-9 items-center justify-between gap-6 border-t border-[#e5eaf1] px-4 py-2.5 text-[11px]"><span className="uppercase font-semibold text-slate-500">{label}</span><span className="max-w-[65%] truncate font-medium text-slate-700">{value}</span></div>; }
function ConfigRow({ label, value, tone }: { label: string; value: string; tone: "purple" | "green" | "gray" }) { return <div className="flex items-center justify-between border-t border-[#e5eaf1] px-4 py-4 text-[12px]"><span className="font-medium text-slate-800">{label}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${tone === "purple" ? "bg-violet-100 text-violet-700" : tone === "green" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{value}</span></div>; }
function Stat({ value, label, color }: { value: string; label: string; color: string }) { return <div className="py-3 text-center"><p className={`text-[15px] font-bold ${color}`}>{value}</p><p className="mt-1 text-[10px] text-slate-500">{label}</p></div>; }
function GoalStatus({ status, customStatuses }: { status: string; customStatuses?: CustomStatusConfig[] }) { const tone = getStatusTheme(status, customStatuses).badge; return <span className={`rounded-full border px-2 py-0.5 text-[10px] ${tone}`}>{status}</span>; }
