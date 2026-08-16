"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  Clock3,
  FolderGit2,
  Mail,
  Search,
  Square,
  UserCheck,
  UserCog,
  Users,
  X
} from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useLogout } from "@/hooks/useLogout";
import {
  bulkUpdateAdminMembersRole,
  createAdminMembersStream,
  updateAdminMember,
  type AdminMemberRecord
} from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { UserRole } from "@/types/auth";
import { getDashboardNavItems } from "@/utils/routes";

export type MemberRecord = AdminMemberRecord;

const AVAILABLE_ROLES: UserRole[] = ["Admin", "Student Leader", "Organization Member"];

type OrganizationOption = {
  id: string;
  name: string;
};

type CommitteeOption = {
  id: string;
  name: string;
  organizationId: string | null;
};

const EMPTY_COMMITTEE = "Unassigned";
const UNASSIGNED_ORGANIZATION = "Unassigned";
const CAMPUS_ORGANIZATION = "University Campus";

export default function AdminMembersPage() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const authLoading = useAuthStore((state) => state.loading);
  const logout = useLogout();
  const showToast = useToastStore((state) => state.showToast);

  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [committees, setCommittees] = useState<CommitteeOption[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [committeeFilter, setCommitteeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Selection state for multi-select / bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal states
  const [roleModalMember, setRoleModalMember] = useState<MemberRecord | null>(null);
  const [reassignModalMember, setReassignModalMember] = useState<MemberRecord | null>(null);
  const [bulkRoleModalOpen, setBulkRoleModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== "Admin")) {
      router.replace(profile ? "/dashboard" : "/sign-in");
    }
  }, [authLoading, profile, router]);

  useEffect(() => {
    if (authLoading || profile?.role !== "Admin" || !firebaseUser) {
      return;
    }

    let isMounted = true;
    let closeStream: (() => void) | null = null;
    setMembersLoading(true);
    setMembersError("");

    void createAdminMembersStream(firebaseUser, {
      onData: (directory) => {
        if (!isMounted) return;
        setMembers(directory.members);
        setOrganizations(directory.organizations);
        setCommittees(directory.committees);
        setMembersError("");
        setMembersLoading(false);
      },
      onError: () => {
        if (!isMounted) return;
        setMembersLoading(false);
        setMembersError("Live member connection was interrupted. Refresh the page if it does not reconnect.");
      }
    })
      .then((close) => {
        closeStream = close;
      })
      .catch(() => {
        if (!isMounted) return;
        setMembersLoading(false);
        setMembersError("Unable to load live member data from Firebase.");
      });

    return () => {
      isMounted = false;
      closeStream?.();
    };
  }, [authLoading, firebaseUser, profile?.role]);

  const organizationOptions = useMemo(
    () => [
      { id: "__campus__", name: CAMPUS_ORGANIZATION },
      { id: "__unassigned_org__", name: UNASSIGNED_ORGANIZATION },
      ...organizations
    ],
    [organizations]
  );

  const committeeOptions = useMemo(
    () => [{ id: "__unassigned__", name: EMPTY_COMMITTEE, organizationId: null }, ...committees],
    [committees]
  );

  useEffect(() => {
    setSelectedIds((currentIds) => currentIds.filter((id) => members.some((member) => member.id === id)));
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.position.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === "all" || member.role === roleFilter;
      const matchesOrg =
        orgFilter === "all" ||
        member.organizationId === orgFilter ||
        (orgFilter === "__campus__" && member.organization === CAMPUS_ORGANIZATION) ||
        (orgFilter === "__unassigned_org__" && member.organization === UNASSIGNED_ORGANIZATION);
      const matchesCommittee =
        committeeFilter === "all" ||
        member.committeeId === committeeFilter ||
        (committeeFilter === "__unassigned__" && member.committee === EMPTY_COMMITTEE);
      const matchesStatus = statusFilter === "all" || member.inviteStatus === statusFilter;

      return matchesSearch && matchesRole && matchesOrg && matchesCommittee && matchesStatus;
    });
  }, [members, searchQuery, roleFilter, orgFilter, committeeFilter, statusFilter]);

  // Bulk Selection Handlers
  const isAllSelected =
    filteredMembers.length > 0 && filteredMembers.every((m) => selectedIds.includes(m.id));

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMembers.map((m) => m.id));
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  // Single Role Change Handler
  async function handleSaveRole(id: string, newRole: UserRole, newPosition: string) {
    if (!firebaseUser) return;
    const target = members.find((m) => m.id === id);
    try {
      await updateAdminMember(firebaseUser, id, {
        role: newRole,
        position: newPosition
      });
      showToast({
        title: "Role updated",
        description: `Updated role for ${target?.name ?? "member"} to ${newRole}.`,
        tone: "success"
      });
      setRoleModalMember(null);
    } catch {
      showToast({
        title: "Unable to update role",
        description: "Firebase rejected the role update. Please check permissions and try again.",
        tone: "error"
      });
    }
  }

  // Single Reassign Handler
  async function handleSaveReassign(id: string, organizationValue: string, committeeValue: string) {
    if (!firebaseUser) return;
    const target = members.find((m) => m.id === id);
    const organizationId = organizationValue.startsWith("__") ? null : organizationValue;
    const committeeId = committeeValue === "__unassigned__" ? null : committeeValue;
    const organizationName =
      organizationOptions.find((organization) => organization.id === organizationValue)?.name ??
      UNASSIGNED_ORGANIZATION;
    const committeeName =
      committeeOptions.find((committee) => committee.id === committeeValue)?.name ?? EMPTY_COMMITTEE;
    try {
      await updateAdminMember(firebaseUser, id, {
        organizationId,
        organizationName,
        committeeId,
        committeeName
      });
      showToast({
        title: "Assignment updated",
        description: `Reassigned ${target?.name ?? "member"} to ${organizationName} (${committeeName}).`,
        tone: "success"
      });
      setReassignModalMember(null);
    } catch {
      showToast({
        title: "Unable to update assignment",
        description: "Firebase rejected the reassignment. Please check permissions and try again.",
        tone: "error"
      });
    }
  }

  // Bulk Role Change Handler
  async function handleSaveBulkRole(newRole: UserRole) {
    if (!firebaseUser) return;
    try {
      await bulkUpdateAdminMembersRole(firebaseUser, selectedIds, newRole);
      showToast({
        title: "Bulk role update successful",
        description: `Updated role to ${newRole} for ${selectedIds.length} selected member(s).`,
        tone: "success"
      });
      setBulkRoleModalOpen(false);
      setSelectedIds([]);
    } catch {
      showToast({
        title: "Unable to update selected members",
        description: "Firebase rejected the bulk role update. Please try again.",
        tone: "error"
      });
    }
  }

  if (authLoading || !profile || profile.role !== "Admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef1f5] text-slate-500">
        Loading member directory...
      </div>
    );
  }

  const user = {
    name: profile.fullName,
    role: "Admin" as const,
    roleLabel: profile.position ?? "Administrator",
    organizationName: "University Campus",
    academicYear: "",
    greetingDate: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    }).format(new Date())
  };

  const totalMembers = members.length;
  const activeCount = members.filter((m) => m.inviteStatus === "Active").length;
  const pendingCount = members.filter((m) => m.inviteStatus === "Pending Invite").length;
  const leaderCount = members.filter((m) => m.role === "Student Leader").length;

  return (
    <DashboardLayout
      activeNavId="members"
      activities={[]}
      goals={[]}
      kpis={[]}
      navItems={getDashboardNavItems("Admin")}
      notificationCount={0}
      onLogout={logout}
      user={user}
    >
      <section className="mx-auto w-full max-w-6xl space-y-6">
        {/* Header Title */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.16em] text-blue-600">
              Administration
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">All Members</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage member roles, committee placements, and organizational assignments across campus.
            </p>
          </div>
        </div>

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Users className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Members
                </p>
                <p className="text-2xl font-black text-slate-900">{totalMembers}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <UserCheck className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Active Accounts
                </p>
                <p className="text-2xl font-black text-slate-900">{activeCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock3 className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Pending Invites
                </p>
                <p className="text-2xl font-black text-slate-900">{pendingCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <UserCog className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Student Leaders
                </p>
                <p className="text-2xl font-black text-slate-900">{leaderCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls Card */}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search Input */}
            <label className="flex h-11 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 focus-within:border-brand focus-within:bg-white focus-within:ring-2 focus-within:ring-brand/10 transition">
              <Search className="size-4 text-slate-400 shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="Search by member name, email, or position..."
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-slate-400 hover:text-slate-600"
                  type="button"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </label>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-brand"
              >
                <option value="all">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Student Leader">Student Leader</option>
                <option value="Organization Member">Organization Member</option>
              </select>

              <select
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-brand"
              >
                <option value="all">All Organizations</option>
                {organizationOptions.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>

              <select
                value={committeeFilter}
                onChange={(e) => setCommitteeFilter(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-brand"
              >
                <option value="all">All Committees</option>
                {committeeOptions.map((comm) => (
                  <option key={comm.id} value={comm.id}>
                    {comm.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-brand"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Pending Invite">Pending Invite</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {membersError ? (
          <p className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            {membersError}
          </p>
        ) : null}

        {/* Floating Bulk Action Bar */}
        {selectedIds.length > 0 ? (
          <div className="flex items-center justify-between rounded-xl bg-[#213f68] px-5 py-3.5 text-white shadow-lg animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3">
              <span className="flex size-7 items-center justify-center rounded-lg bg-white/15 text-xs font-bold">
                {selectedIds.length}
              </span>
              <span className="text-sm font-semibold">
                {selectedIds.length === 1 ? "1 member selected" : `${selectedIds.length} members selected`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBulkRoleModalOpen(true)}
                className="flex h-9 items-center gap-2 rounded-lg bg-[#2868ed] px-3.5 text-xs font-bold text-white transition hover:bg-blue-600"
              >
                <UserCog className="size-4" />
                Bulk Change Role
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-white/20 px-3 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Clear Selection
              </button>
            </div>
          </div>
        ) : null}

        {/* Member Directory Table Card */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs uppercase tracking-wider font-extrabold text-slate-500">
                <tr>
                  <th className="px-4 py-4 w-12 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-slate-400 hover:text-slate-600 transition"
                      aria-label="Select all members"
                    >
                      {isAllSelected ? (
                        <CheckSquare className="size-4 text-brand" />
                      ) : (
                        <Square className="size-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-4">Member</th>
                  <th className="px-4 py-4">Organization</th>
                  <th className="px-4 py-4">Role</th>
                  <th className="px-4 py-4">Committee</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {membersLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                      Loading live members from Firebase...
                    </td>
                  </tr>
                ) : filteredMembers.length ? (
                  filteredMembers.map((member) => {
                    const isChecked = selectedIds.includes(member.id);
                    return (
                      <tr
                        key={member.id}
                        className={`transition hover:bg-slate-50/80 ${isChecked ? "bg-blue-50/30" : ""
                          }`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleSelectOne(member.id)}
                            className="text-slate-400 hover:text-slate-600 transition"
                          >
                            {isChecked ? (
                              <CheckSquare className="size-4 text-brand" />
                            ) : (
                              <Square className="size-4" />
                            )}
                          </button>
                        </td>

                        {/* Avatar & Name/Email */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <MemberAvatar name={member.name} role={member.role} />
                            <div>
                              <p className="font-extrabold text-slate-900">{member.name}</p>
                              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <Mail className="size-3 text-slate-400" />
                                {member.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Organization */}
                        <td className="px-4 py-4 text-slate-700">
                          <p className="font-semibold text-slate-800">{member.organization}</p>
                          <p className="text-xs text-slate-400">{member.position}</p>
                        </td>

                        {/* Role Pill */}
                        <td className="px-4 py-4">
                          <RolePill role={member.role} />
                        </td>

                        {/* Committee */}
                        <td className="px-4 py-4 text-slate-600">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            <FolderGit2 className="size-3 text-slate-400" />
                            {member.committee}
                          </span>
                        </td>

                        {/* Invite Status */}
                        <td className="px-4 py-4">
                          <StatusPill status={member.inviteStatus} />
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setRoleModalMember(member)}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                            >
                              Change Role
                            </button>
                            <button
                              type="button"
                              onClick={() => setReassignModalMember(member)}
                              className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-brand hover:text-white"
                            >
                              Reassign
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                        <Users className="size-6" />
                      </div>
                      <p className="font-bold text-slate-800 text-base">No members match your criteria</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Try adjusting your search query or reset your selected filters.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Change Role Modal */}
      {roleModalMember ? (
        <ChangeRoleModal
          member={roleModalMember}
          onClose={() => setRoleModalMember(null)}
          onSave={handleSaveRole}
        />
      ) : null}

      {/* Reassign Committee / Org Modal */}
      {reassignModalMember ? (
        <ReassignModal
          committees={committeeOptions}
          member={reassignModalMember}
          onClose={() => setReassignModalMember(null)}
          organizations={organizationOptions}
          onSave={handleSaveReassign}
        />
      ) : null}

      {/* Bulk Change Role Modal */}
      {bulkRoleModalOpen ? (
        <BulkRoleModal
          count={selectedIds.length}
          onClose={() => setBulkRoleModalOpen(false)}
          onSave={handleSaveBulkRole}
        />
      ) : null}
    </DashboardLayout>
  );
}

/* Avatar Fallback Component */
function MemberAvatar({ name, role }: { name: string; role: UserRole }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  const bgStyle =
    role === "Admin"
      ? "bg-rose-600 text-white"
      : role === "Student Leader"
        ? "bg-[#2868ed] text-white"
        : "bg-[#385779] text-white";

  return (
    <div
      className={`flex size-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs shadow-sm ${bgStyle}`}
    >
      {initials}
    </div>
  );
}

/* Role Pill Component */
function RolePill({ role }: { role: UserRole }) {
  const styles: Record<UserRole, string> = {
    Admin: "bg-rose-50 text-rose-700 ring-rose-200/80",
    "Student Leader": "bg-blue-50 text-blue-700 ring-blue-200/80",
    "Organization Member": "bg-slate-100 text-slate-700 ring-slate-200/80"
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${styles[role]}`}>
      {role}
    </span>
  );
}

/* Status Pill Component */
function StatusPill({ status }: { status: MemberRecord["inviteStatus"] }) {
  const styles: Record<MemberRecord["inviteStatus"], string> = {
    Active: "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
    "Pending Invite": "bg-amber-50 text-amber-700 ring-amber-200/80",
    Inactive: "bg-slate-100 text-slate-600 ring-slate-200/80"
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${styles[status]}`}>
      {status}
    </span>
  );
}

/* Change Role Modal Component */
function ChangeRoleModal({
  member,
  onClose,
  onSave
}: {
  member: MemberRecord;
  onClose: () => void;
  onSave: (id: string, newRole: UserRole, newPosition: string) => void;
}) {
  const [role, setRole] = useState<UserRole>(member.role);
  const [position, setPosition] = useState(member.position);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Member Role Management</p>
            <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">Change Role</h2>
            <p className="text-xs text-slate-500 mt-1">Updating role and title for <span className="font-bold text-slate-800">{member.name}</span></p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
            >
              {AVAILABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Position / Title
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
              placeholder="e.g. President, Vice President, Member"
            />
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(member.id, role, position.trim() || member.position)}
            className="h-11 flex-1 rounded-xl bg-[#213f68] text-sm font-extrabold text-white hover:bg-blue-900 transition"
          >
            Save Role Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* Reassign Committee & Org Modal Component */
function ReassignModal({
  committees,
  member,
  onClose,
  organizations,
  onSave
}: {
  committees: CommitteeOption[];
  member: MemberRecord;
  onClose: () => void;
  organizations: OrganizationOption[];
  onSave: (id: string, organizationValue: string, committeeValue: string) => void;
}) {
  const initialOrganizationId =
    member.organizationId ??
    (member.organization === CAMPUS_ORGANIZATION ? "__campus__" : "__unassigned_org__");
  const [organizationId, setOrganizationId] = useState(initialOrganizationId);
  const [committeeId, setCommitteeId] = useState(member.committeeId ?? "__unassigned__");
  const visibleCommittees = committees.filter(
    (committee) =>
      committee.id === "__unassigned__" ||
      !committee.organizationId ||
      committee.organizationId === organizationId
  );

  function handleOrganizationChange(nextOrganizationId: string) {
    setOrganizationId(nextOrganizationId);
    const committeeBelongsToOrganization = visibleCommittees.some(
      (committee) => committee.id === committeeId && committee.organizationId === nextOrganizationId
    );

    if (!committeeBelongsToOrganization) {
      setCommitteeId("__unassigned__");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Reassignment</p>
            <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">Reassign Committee &amp; Org</h2>
            <p className="text-xs text-slate-500 mt-1">Reassigning <span className="font-bold text-slate-800">{member.name}</span></p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Organization
            </label>
            <select
              value={organizationId}
              onChange={(e) => handleOrganizationChange(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Committee Placement
            </label>
            <select
              value={committeeId}
              onChange={(e) => setCommitteeId(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
            >
              {visibleCommittees.map((comm) => (
                <option key={comm.id} value={comm.id}>
                  {comm.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(member.id, organizationId, committeeId)}
            className="h-11 flex-1 rounded-xl bg-[#2868ed] text-sm font-extrabold text-white hover:bg-blue-700 transition"
          >
            Save Reassignment
          </button>
        </div>
      </div>
    </div>
  );
}

/* Bulk Change Role Modal Component */
function BulkRoleModal({
  count,
  onClose,
  onSave
}: {
  count: number;
  onClose: () => void;
  onSave: (newRole: UserRole) => void;
}) {
  const [role, setRole] = useState<UserRole>("Student Leader");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Bulk Operation</p>
            <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">Bulk Change Role</h2>
            <p className="text-xs text-slate-500 mt-1">Applying new role to <span className="font-bold text-slate-800">{count} selected member(s)</span></p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="size-5" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Select New Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
          >
            {AVAILABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(role)}
            className="h-11 flex-1 rounded-xl bg-[#2868ed] text-sm font-extrabold text-white hover:bg-blue-700 transition"
          >
            Apply to {count} Members
          </button>
        </div>
      </div>
    </div>
  );
}
