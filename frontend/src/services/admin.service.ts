import type { User } from "firebase/auth";
import {
  createAdminMembersStream,
  getAdminMemberDirectory,
  getOrganizations
} from "@/services/auth.service";
import { fetchAuditLogs } from "@/services/audit.service";

export type AdminOrgItem = {
  id: string;
  name: string;
  type: string;
  memberCount: number;
  goalCount: number;
  status: string; // "Complete" | "active" | etc.
};

export type AdminMemberItem = {
  id: string;
  name: string;
  organizationName: string;
  role: "Leader" | "Member" | "Admin";
  initials: string;
};

export type AdminActivityItem = {
  id: string;
  actorName: string;
  action: string;
  targetTitle: string;
  targetType: string;
  date: string;
  logCode: string;
};

export type AdminDashboardData = {
  organizations: AdminOrgItem[];
  members: AdminMemberItem[];
  activities: AdminActivityItem[];
  stats: {
    totalOrgs: number;
    totalMembers: number;
    studentLeaders: number;
    setupComplete: string;
  };
};

export const INITIAL_ADMIN_DATA: AdminDashboardData = {
  stats: {
    totalOrgs: 0,
    totalMembers: 0,
    studentLeaders: 0,
    setupComplete: "0/0"
  },
  organizations: [],
  members: [],
  activities: []
};

function getInitials(name: string): string {
  if (!name || !name.trim()) return "U";
  return name
    .trim()
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Subscribes to real-time updates for Admin Dashboard data across backend REST and SSE services.
 */
export function subscribeAdminDashboardData(
  user: User | null,
  onDataChange: (data: AdminDashboardData) => void
): () => void {
  let isMounted = true;
  let unsubStream: (() => void) | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  let currentData: AdminDashboardData = { ...INITIAL_ADMIN_DATA };

  if (user) {
    const initialUserMember: AdminMemberItem = {
      id: user.uid,
      name: user.displayName || user.email?.split("@")[0] || "Administrator",
      organizationName: "University Campus",
      role: "Admin",
      initials: getInitials(user.displayName || user.email || "Admin")
    };
    currentData = {
      ...currentData,
      members: [initialUserMember],
      stats: {
        ...currentData.stats,
        totalMembers: 1
      }
    };
    onDataChange(currentData);
  } else {
    onDataChange(currentData);
    return () => {};
  }

  const loadDashboardData = async () => {
    try {
      const [orgs, memberDir, auditRes] = await Promise.all([
        getOrganizations(user).catch(() => []),
        getAdminMemberDirectory(user).catch(() => null),
        fetchAuditLogs(user).catch(() => null)
      ]);

      if (!isMounted) return;

      const mappedOrgs: AdminOrgItem[] = orgs.map((o) => ({
        id: o.id,
        name: o.name,
        type: o.type,
        memberCount: o.memberCount || 0,
        goalCount: o.committeeCount || 1,
        status: o.status === "active" ? "Complete" : o.status
      }));

      const activeOrgsCount = mappedOrgs.filter(
        (o) => o.status === "Complete" || o.status === "active"
      ).length;

      const mappedMembers: AdminMemberItem[] = memberDir
        ? memberDir.members.map((m) => {
            const role =
              m.role === "Student Leader" || (m.role as string) === "Leader"
                ? "Leader"
                : m.role === "Admin"
                ? "Admin"
                : "Member";
            return {
              id: m.id,
              name: m.name,
              organizationName: m.organization || "University Campus",
              role,
              initials: getInitials(m.name)
            };
          })
        : currentData.members;

      const studentLeadersCount = mappedMembers.filter((m) => m.role === "Leader").length;

      const mappedActivities: AdminActivityItem[] = auditRes?.logs
        ? auditRes.logs.slice(0, 6).map((log, idx) => ({
            id: log.id,
            actorName: log.actorName || "System Administrator",
            action:
              log.actionCategory === "Organization"
                ? "APPROVE"
                : log.action.includes("Create")
                ? "CREATE"
                : "UPDATE",
            targetTitle: log.targetName || log.action,
            targetType: log.targetType || "Activity",
            date: log.createdAt
              ? new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                }).format(new Date(log.createdAt))
              : "Recent",
            logCode: `LOG-00${idx + 1}`
          }))
        : currentData.activities;

      currentData = {
        organizations: mappedOrgs,
        members: mappedMembers,
        activities: mappedActivities,
        stats: {
          totalOrgs: mappedOrgs.length,
          totalMembers: mappedMembers.length,
          studentLeaders: studentLeadersCount,
          setupComplete: `${activeOrgsCount}/${mappedOrgs.length}`
        }
      };

      onDataChange(currentData);
    } catch (err) {
      console.warn("Failed to refresh admin dashboard data:", err);
    }
  };

  void loadDashboardData();

  void createAdminMembersStream(user, {
    onData: (directory) => {
      if (!isMounted) return;
      const mappedMembers: AdminMemberItem[] = directory.members.map((m) => {
        const role =
          m.role === "Student Leader" || (m.role as string) === "Leader"
            ? "Leader"
            : m.role === "Admin"
            ? "Admin"
            : "Member";
        return {
          id: m.id,
          name: m.name,
          organizationName: m.organization || "University Campus",
          role,
          initials: getInitials(m.name)
        };
      });

      const studentLeadersCount = mappedMembers.filter((m) => m.role === "Leader").length;

      currentData = {
        ...currentData,
        members: mappedMembers,
        stats: {
          ...currentData.stats,
          totalMembers: mappedMembers.length,
          studentLeaders: studentLeadersCount
        }
      };
      onDataChange(currentData);
    },
    onError: () => {}
  }).then((unsub) => {
    if (isMounted) unsubStream = unsub;
    else unsub();
  });

  intervalId = setInterval(() => {
    if (typeof document !== "undefined" && document.hidden) return;
    void loadDashboardData();
  }, 30000);

  return () => {
    isMounted = false;
    if (unsubStream) unsubStream();
    if (intervalId) clearInterval(intervalId);
  };
}

