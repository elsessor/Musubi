"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckSquare,
  Clock3,
  Filter,
  FolderGit2,
  Mail,
  Search,
  ShieldCheck,
  Square,
  UserCheck,
  UserCog,
  Users,
  X
} from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useLogout } from "@/hooks/useLogout";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { UserRole } from "@/types/auth";
import { getDashboardNavItems } from "@/utils/routes";
import {
  bulkUpdateAdminMembersRole,
  createAdminMembersStream,
  getAdminMemberDirectory,
  updateAdminMember,
  type AdminMemberRecord
} from "@/services/auth.service";

export type MemberRecord = AdminMemberRecord;

export default function AdminMembersPage() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const authLoading = useAuthStore((state) => state.loading);
  const logout = useLogout();
  const showToast = useToastStore((state) => state.showToast);

  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [directoryOrgs, setDirectoryOrgs] = useState<{ id: string; name: string }[]>([]);
  const [directoryCommittees, setDirectoryCommittees] = useState<{ id: string; name: string; organizationId: string | null }[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

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

  // Load real members from backend + real-time stream
  useEffect(() => {
    if (!firebaseUser) return;

    let isMounted = true;
    let unsubStream: (() => void) | null = null;

    void getAdminMemberDirectory(firebaseUser)
      .then((directory) => {
        if (!isMounted) return;
        setMembers(directory.members);
        setDirectoryOrgs(directory.organizations);
        setDirectoryCommittees(directory.committees);
        setLoadingMembers(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setLoadingMembers(false);
      });

    void createAdminMembersStream(firebaseUser, {
      onData: (directory) => {
        if (!isMounted) return;
        setMembers(directory.members);
        setDirectoryOrgs(directory.organizations);
        setDirectoryCommittees(directory.committees);
        setLoadingMembers(false);
      },
      onError: () => {}
    }).then((unsub) => {
      if (isMounted) unsubStream = unsub;
      else unsub();
    });

    return () => {
      isMounted = false;
      if (unsubStream) unsubStream();
    };
  }, [firebaseUser]);

  // Dynamic filter options derived from real database records
  const availableOrganizations = useMemo(() => {
    const set = new Set<string>();
    directoryOrgs.forEach((o) => {
      if (o.name) set.add(o.name);
    });
    members.forEach((m) => {
      if (m.organization) set.add(m.organization);
    });
    return Array.from(set);
  }, [directoryOrgs, members]);

  const availableCommittees = useMemo(() => {
    const set = new Set<string>();
    directoryCommittees.forEach((c) => {
      if (c.name) set.add(c.name);
    });
    members.forEach((m) => {
      if (m.committee) set.add(m.committee);
    });
    return Array.from(set);
  }, [directoryCommittees, members]);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.position.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === "all" || member.role === roleFilter;
      const matchesOrg = orgFilter === "all" || member.organization === orgFilter;
      const matchesCommittee = committeeFilter === "all" || member.committee === committeeFilter;
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
    try {
      await updateAdminMember(firebaseUser, id, { role: newRole, position: newPosition });
      setMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, role: newRole, position: newPosition } : m))
      );
      showToast({
        title: "Role updated",
        description: `Updated member role to ${newRole}.`,
        tone: "success"
      });
    } catch (err) {
      showToast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Failed to update role.",
        tone: "error"
      });
    } finally {
      setRoleModalMember(null);
    }
  }

  // Single Reassign Handler
  async function handleSaveReassign(id: string, newOrg: string, newCommittee: string) {
    if (!firebaseUser) return;
    try {
      const orgObj = directoryOrgs.find((o) => o.name === newOrg);
      const commObj = directoryCommittees.find((c) => c.name === newCommittee);

      await updateAdminMember(firebaseUser, id, {
        organizationId: orgObj ? orgObj.id : null,
        organizationName: newOrg,
        committeeId: commObj ? commObj.id : null,
        committeeName: newCommittee
      });

      setMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, organization: newOrg, committee: newCommittee } : m))
      );
      showToast({
        title: "Assignment updated",
        description: `Reassigned member to ${newOrg} (${newCommittee}).`,
        tone: "success"
      });
    } catch (err) {
      showToast({
        title: "Reassignment failed",
        description: err instanceof Error ? err.message : "Failed to reassign member.",
        tone: "error"
      });
    } finally {
      setReassignModalMember(null);
    }
  }

  // Bulk Role Change Handler
  async function handleSaveBulkRole(newRole: UserRole) {
    if (!firebaseUser || selectedIds.length === 0) return;
    try {
      await bulkUpdateAdminMembersRole(firebaseUser, selectedIds, newRole);
      setMembers((prev) =>
        prev.map((m) => (selectedIds.includes(m.id) ? { ...m, role: newRole } : m))
      );
      showToast({
        title: "Bulk role update successful",
        description: `Updated role to ${newRole} for ${selectedIds.length} selected member(s).`,
        tone: "success"
      });
    } catch (err) {
      showToast({
        title: "Bulk update failed",
        description: err instanceof Error ? err.message : "Failed to bulk update roles.",
        tone: "error"
      });
    } finally {
      setBulkRoleModalOpen(false);
      setSelectedIds([]);
    }
  }

  if (authLoading || !profile || profile.role !== "Admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef1f5] text-slate-500 font-semibold">
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
  const leaderCount = members.filter((m) => m.role === "Student Leader" || m.role === "Admin").length;

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
                {availableOrganizations.map((org) => (
                  <option key={org} value={org}>
                    {org}
                  </option>
                ))}
              </select>

              <select
                value={committeeFilter}
                onChange={(e) => setCommitteeFilter(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-brand"
              >
                <option value="all">All Committees</option>
                {availableCommittees.map((comm) => (
                  <option key={comm} value={comm}>
                    {comm}
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
                {loadingMembers ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400 font-semibold">
                      Loading campus members...
                    </td>
                  </tr>
                ) : filteredMembers.length ? (
                  filteredMembers.map((member) => {
                    const isChecked = selectedIds.includes(member.id);
                    return (
                      <tr
                        key={member.id}
                        className={`transition hover:bg-slate-50/80 ${
                          isChecked ? "bg-blue-50/30" : ""
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
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
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
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400 font-medium">
                      No members match the selected filters or search query.
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
          availableOrganizations={availableOrganizations}
          availableCommittees={availableCommittees}
          member={reassignModalMember}
          onClose={() => setReassignModalMember(null)}
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
  const [submitting, setSubmitting] = useState(false);

  const availableRoles: UserRole[] = ["Admin", "Student Leader", "Organization Member"];

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
              {availableRoles.map((r) => (
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
            disabled={submitting}
            className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              await onSave(member.id, role, position.trim() || member.position);
              setSubmitting(false);
            }}
            className="h-11 flex-1 rounded-xl bg-[#213f68] text-sm font-extrabold text-white hover:bg-blue-900 transition disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Role Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Reassign Committee & Org Modal Component */
function ReassignModal({
  availableOrganizations,
  availableCommittees,
  member,
  onClose,
  onSave
}: {
  availableOrganizations: string[];
  availableCommittees: string[];
  member: MemberRecord;
  onClose: () => void;
  onSave: (id: string, newOrg: string, newCommittee: string) => void;
}) {
  const [organization, setOrganization] = useState(member.organization);
  const [committee, setCommittee] = useState(member.committee);
  const [submitting, setSubmitting] = useState(false);

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
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
            >
              {availableOrganizations.map((org) => (
                <option key={org} value={org}>
                  {org}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Committee Placement
            </label>
            <select
              value={committee}
              onChange={(e) => setCommittee(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
            >
              {availableCommittees.map((comm) => (
                <option key={comm} value={comm}>
                  {comm}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              await onSave(member.id, organization, committee);
              setSubmitting(false);
            }}
            className="h-11 flex-1 rounded-xl bg-[#2868ed] text-sm font-extrabold text-white hover:bg-blue-700 transition disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Reassignment"}
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
  const [submitting, setSubmitting] = useState(false);
  const availableRoles: UserRole[] = ["Admin", "Student Leader", "Organization Member"];

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
            {availableRoles.map((r) => (
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
            disabled={submitting}
            className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              await onSave(role);
              setSubmitting(false);
            }}
            className="h-11 flex-1 rounded-xl bg-[#2868ed] text-sm font-extrabold text-white hover:bg-blue-700 transition disabled:opacity-50"
          >
            {submitting ? "Applying..." : `Apply to ${count} Members`}
          </button>
        </div>
      </div>
    </div>
  );
}
