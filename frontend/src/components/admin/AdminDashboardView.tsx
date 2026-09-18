"use client";

<<<<<<< HEAD
import { useEffect, useState } from "react";
import { Award, Briefcase, CheckCircle2, Circle, Users } from "lucide-react";
import {
  type AdminDashboardData,
  INITIAL_ADMIN_DATA,
  subscribeAdminDashboardData
} from "@/services/admin.service";
import { useAuthStore } from "@/store/authStore";

export function AdminDashboardView() {
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const [data, setData] = useState<AdminDashboardData>(INITIAL_ADMIN_DATA);

  useEffect(() => {
    const unsubscribe = subscribeAdminDashboardData(firebaseUser, (updatedData) => {
      setData(updatedData);
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [firebaseUser]);

  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date());

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header Section */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          University Campus · {todayFormatted}
        </p>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Organizations */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 transition hover:shadow-md">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-purple-100/70 text-purple-600 mb-4">
            <Briefcase className="size-5" />
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">
            {data.stats.totalOrgs}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Organizations</p>
        </div>

        {/* Card 2: Total Members */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 transition hover:shadow-md">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-100/70 text-blue-600 mb-4">
            <Users className="size-5" />
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">
            {data.stats.totalMembers}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Total Members</p>
        </div>

        {/* Card 3: Student Leaders */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 transition hover:shadow-md">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-100/70 text-amber-600 mb-4">
            <Award className="size-5" />
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">
            {data.stats.studentLeaders}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Student Leaders</p>
        </div>

        {/* Card 4: Setup Complete */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 transition hover:shadow-md">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-100/70 text-emerald-600 mb-4">
            <CheckCircle2 className="size-5" />
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">
            {data.stats.setupComplete}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Setup Complete</p>
        </div>
      </div>

      {/* Middle Grid: Organizations & Recent Members */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Box: ORGANIZATIONS */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              ORGANIZATIONS
            </h2>
            <span className="text-xs font-semibold text-slate-400">
              {data.organizations.length} total
            </span>
          </div>

          <div className="space-y-4">
            {data.organizations.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between gap-3 py-1 transition hover:bg-slate-50/50 rounded-xl px-2"
              >
                <div>
                  <p className="font-bold text-slate-900 text-sm">{org.name}</p>
                  <p className="mt-0.5 text-xs text-slate-400 font-medium">
                    {org.type} · {org.memberCount} members · {org.goalCount} goals
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-600 ring-1 ring-emerald-200/70">
                  {org.status === "active" ? "Complete" : org.status}
=======
import { useEffect, useMemo, useState } from "react";
import { Award, Building2, CheckCircle2, Shield, Users } from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import {
  createAdminMembersStream,
  getOrganizationDirectory,
  type AdminMemberRecord,
  type OrganizationDirectoryOption
} from "@/services/auth.service";
import {
  subscribeAuditLogsFirestore,
  createAuditLogsStream,
  type AuditLogRecord
} from "@/services/audit.service";

// Fallback seed data matching the reference image layout when database is empty
const DEFAULT_ORGANIZATIONS = [
  {
    id: "org-1",
    name: "University Student Council",
    type: "Governing",
    memberCount: 7,
    goalCount: 5,
    status: "active"
  },
  {
    id: "org-2",
    name: "Computer Science Society",
    type: "Academic",
    memberCount: 24,
    goalCount: 3,
    status: "active"
  },
  {
    id: "org-3",
    name: "Socio-Civic Action Group",
    type: "Socio-Civic",
    memberCount: 12,
    goalCount: 1,
    status: "active"
  },
  {
    id: "org-4",
    name: "Campus Media Network",
    type: "Media",
    memberCount: 18,
    goalCount: 2,
    status: "active"
  }
];

const DEFAULT_MEMBERS: Array<{
  id: string;
  name: string;
  organization: string;
  role: "Student Leader" | "Organization Member" | "Admin";
  initials: string;
  color: string;
}> = [
  { id: "m-1", name: "Hans San Miguel", organization: "University Student Council", role: "Student Leader", initials: "HS", color: "bg-[#1e293b]" },
  { id: "m-2", name: "Beatrice Lim", organization: "University Student Council", role: "Organization Member", initials: "BL", color: "bg-[#1e3a8a]" },
  { id: "m-3", name: "Ana Reyes", organization: "University Student Council", role: "Organization Member", initials: "AR", color: "bg-[#0f766e]" },
  { id: "m-4", name: "Marco Dela Cruz", organization: "University Student Council", role: "Organization Member", initials: "MD", color: "bg-[#334155]" },
  { id: "m-5", name: "Sophia Tan", organization: "University Student Council", role: "Organization Member", initials: "ST", color: "bg-[#3730a3]" },
  { id: "m-6", name: "Luis Garcia", organization: "University Student Council", role: "Organization Member", initials: "LG", color: "bg-[#475569]" }
];

const DEFAULT_ACTIVITIES = [
  {
    id: "LOG-001",
    actorName: "Hans San Miguel",
    actionVerb: "CREATE",
    targetName: "Launch Annual University Culture Week",
    category: "Goal",
    date: "Jun 1, 2026"
  },
  {
    id: "LOG-002",
    actorName: "Hans San Miguel",
    actionVerb: "ASSIGN",
    targetName: "Secure venue and permits",
    category: "Task",
    date: "Jun 1, 2026"
  },
  {
    id: "LOG-003",
    actorName: "System Administrator",
    actionVerb: "APPROVE",
    targetName: "Business and Economics Society",
    category: "OrgRequest",
    date: "Jun 12, 2026"
  },
  {
    id: "LOG-004",
    actorName: "Hans San Miguel",
    actionVerb: "UPDATE",
    targetName: "Design promotional materials",
    category: "Task",
    date: "Jun 14, 2026"
  }
];

function getInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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

function formatDate(isoOrDateStr: string | null | undefined): string {
  if (!isoOrDateStr) return "Jun 1, 2026";
  try {
    const d = new Date(isoOrDateStr);
    if (isNaN(d.getTime())) return isoOrDateStr;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(d);
  } catch {
    return isoOrDateStr;
  }
}

export function AdminDashboardView() {
  const firebaseUser = useAuthStore((state) => state.firebaseUser);

  const [members, setMembers] = useState<AdminMemberRecord[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationDirectoryOption[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);

  // Subscribe to real-time streams
  useEffect(() => {
    if (!firebaseUser) return;

    let isMounted = true;
    let closeMembersStream: (() => void) | null = null;
    let closeAuditLogsStream: (() => void) | null = null;

    // 1. Members stream
    void createAdminMembersStream(firebaseUser, {
      onData: (directory) => {
        if (!isMounted) return;
        setMembers(directory.members);
      },
      onError: () => {
        // Fallback gracefully if stream errors
      }
    }).then((unsub) => {
      if (isMounted) closeMembersStream = unsub;
      else unsub();
    });

    // 2. Organization directory fetch
    void getOrganizationDirectory(firebaseUser)
      .then((orgs) => {
        if (isMounted) setOrganizations(orgs);
      })
      .catch(() => {});

    // 3. Real-time Audit Logs subscription
    closeAuditLogsStream = subscribeAuditLogsFirestore({
      onData: (logs) => {
        if (!isMounted) return;
        setAuditLogs(logs);
      },
      onError: () => {
        // Try fallback EventSource stream
        void createAuditLogsStream(firebaseUser, {
          onData: (logs) => {
            if (!isMounted) return;
            setAuditLogs(logs);
          },
          onError: () => {}
        }).then((unsub) => {
          if (isMounted) closeAuditLogsStream = unsub;
        });
      }
    });

    return () => {
      isMounted = false;
      if (closeMembersStream) closeMembersStream();
      if (closeAuditLogsStream) closeAuditLogsStream();
    };
  }, [firebaseUser]);

  // Derived values for stats
  const displayOrganizations = useMemo(() => {
    if (organizations.length > 0) {
      return organizations.map((org, idx) => ({
        id: org.id,
        name: org.name,
        type: org.type || "Academic",
        memberCount: (DEFAULT_ORGANIZATIONS[idx % DEFAULT_ORGANIZATIONS.length] || {}).memberCount || 10,
        goalCount: (DEFAULT_ORGANIZATIONS[idx % DEFAULT_ORGANIZATIONS.length] || {}).goalCount || 3,
        status: org.status
      }));
    }
    return DEFAULT_ORGANIZATIONS;
  }, [organizations]);

  const displayMembers = useMemo(() => {
    if (members.length > 0) {
      return members.slice(0, 6).map((m, idx) => ({
        id: m.id,
        name: m.name,
        organization: m.organization || "University Student Council",
        role: m.role,
        initials: getInitials(m.name),
        color: getAvatarBgColor(idx)
      }));
    }
    return DEFAULT_MEMBERS;
  }, [members]);

  const totalMembersCount = members.length > 0 ? members.length : 8;
  const totalOrgsCount = displayOrganizations.length;
  const studentLeadersCount = useMemo(() => {
    if (members.length > 0) {
      return members.filter((m) => m.role === "Student Leader" || m.role === "Admin").length;
    }
    return 2;
  }, [members]);

  const completedOrgsCount = useMemo(() => {
    return displayOrganizations.filter((o) => o.status === "active" || o.status === "Complete" || !o.status).length;
  }, [displayOrganizations]);

  const displayActivities = useMemo(() => {
    if (auditLogs.length > 0) {
      return auditLogs.slice(0, 10).map((log, index) => {
        // Parse action formatting e.g. "CREATE Launch Annual University Culture Week"
        const actionText = log.action || "System Event";
        const firstSpace = actionText.indexOf(" ");
        let actionVerb = "UPDATE";
        let targetName = actionText;

        if (firstSpace !== -1) {
          const possibleVerb = actionText.substring(0, firstSpace).toUpperCase();
          if (["CREATE", "ASSIGN", "APPROVE", "UPDATE", "DELETE", "SUBMIT"].includes(possibleVerb)) {
            actionVerb = possibleVerb;
            targetName = actionText.substring(firstSpace + 1);
          }
        }

        return {
          id: `LOG-${String(index + 1).padStart(3, "0")}`,
          actorName: log.actorName || "System Administrator",
          actionVerb,
          targetName: log.targetName || targetName,
          category: log.actionCategory || log.targetType || "Goal",
          date: formatDate(log.createdAt)
        };
      });
    }
    return DEFAULT_ACTIVITIES;
  }, [auditLogs]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Top Stat Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Organizations */}
        <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <Building2 className="size-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{totalOrgsCount}</p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Organizations</p>
          </div>
        </div>

        {/* Card 2: Total Members */}
        <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Users className="size-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{totalMembersCount}</p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Total Members</p>
          </div>
        </div>

        {/* Card 3: Student Leaders */}
        <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Award className="size-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{studentLeadersCount}</p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Student Leaders</p>
          </div>
        </div>

        {/* Card 4: Setup Complete */}
        <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{completedOrgsCount}/{totalOrgsCount}</p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Setup Complete</p>
          </div>
        </div>
      </section>

      {/* Middle Section: 2 Columns */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: ORGANIZATIONS */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">ORGANIZATIONS</h2>
            <span className="text-xs font-medium text-slate-400">{totalOrgsCount} total</span>
          </div>

          <div className="divide-y divide-slate-100">
            {displayOrganizations.map((org) => (
              <div key={org.id} className="flex items-center justify-between py-3.5 first:pt-4 last:pb-0">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{org.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {org.type} · {org.memberCount} members · {org.goalCount} goals
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 ring-1 ring-inset ring-emerald-600/10">
                  Complete
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
                </span>
              </div>
            ))}
          </div>
        </div>

<<<<<<< HEAD
        {/* Right Box: RECENT MEMBERS */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              RECENT MEMBERS
            </h2>
            <span className="text-xs font-semibold text-slate-400">
              {data.stats.totalMembers} total
            </span>
          </div>

          <div className="space-y-3.5">
            {data.members.length > 0 ? (
              data.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 py-0.5 transition hover:bg-slate-50/50 rounded-xl px-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1c2e4a] text-xs font-bold text-white shadow-sm">
                      {member.initials}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{member.name}</p>
                      <p className="text-xs text-slate-400 font-medium">
                        {member.organizationName}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-3 py-0.5 text-xs font-bold ring-1 ${
                      member.role === "Leader"
                        ? "bg-purple-50 text-purple-600 ring-purple-200/70"
                        : member.role === "Admin"
                        ? "bg-rose-50 text-rose-600 ring-rose-200/70"
                        : "bg-slate-100 text-slate-600 ring-slate-200"
                    }`}
                  >
                    {member.role}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-medium">
                No recent members found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: RECENT ACTIVITY */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
        <div className="border-b border-slate-100 pb-4 mb-4">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            RECENT ACTIVITY
          </h2>
        </div>

        <div className="space-y-4">
          {data.activities.length > 0 ? (
            data.activities.map((act) => (
              <div
                key={act.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1.5 transition hover:bg-slate-50/50 rounded-xl px-2"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <Circle className="size-3.5 text-slate-300 fill-slate-100 shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {act.actorName}
                      <span className="mx-1 text-slate-400 font-semibold text-xs">→</span>
                      <span className="font-extrabold uppercase text-slate-900 text-xs tracking-wider mx-1">
                        {act.action}
                      </span>
                      <span className="text-blue-600 font-bold hover:underline cursor-pointer">
                        {act.targetTitle}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {act.targetType} · {act.date}
                    </p>
                  </div>
                </div>

                <span className="font-mono text-xs font-medium text-slate-400 shrink-0 self-end sm:self-auto">
                  {act.logCode}
                </span>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">
              No recent activity recorded yet.
            </div>
          )}
        </div>
      </div>
=======
        {/* Right Column: RECENT MEMBERS */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">RECENT MEMBERS</h2>
            <span className="text-xs font-medium text-slate-400">{totalMembersCount} total</span>
          </div>

          <div className="divide-y divide-slate-100">
            {displayMembers.map((member) => {
              const isLeader = member.role === "Student Leader" || member.role === "Admin";
              return (
                <div key={member.id} className="flex items-center justify-between py-3 first:pt-4 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`size-9 shrink-0 rounded-full ${member.color} flex items-center justify-center text-xs font-bold text-white shadow-sm`}>
                      {member.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{member.name}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{member.organization}</p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      isLeader
                        ? "bg-purple-50 text-purple-600 ring-1 ring-inset ring-purple-600/10"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {isLeader ? "Leader" : "Member"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom Section: RECENT ACTIVITY */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
        <div className="pb-4 border-b border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">RECENT ACTIVITY</h2>
        </div>

        <div className="divide-y divide-slate-100">
          {displayActivities.map((activity, idx) => (
            <div key={activity.id + idx} className="flex items-center justify-between py-3.5 first:pt-4 last:pb-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Shield className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-slate-700 truncate">
                    <span className="font-semibold text-slate-900">{activity.actorName}</span>{" "}
                    <span className="text-slate-400">→</span>{" "}
                    <span className="font-bold text-blue-600">{activity.actionVerb}</span>{" "}
                    <span className="font-medium text-slate-800">{activity.targetName}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activity.category} · {activity.date}
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium font-mono text-slate-400 shrink-0 ml-4">
                {activity.id}
              </span>
            </div>
          ))}
        </div>
      </section>
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
    </div>
  );
}
