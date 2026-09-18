import type { User } from "firebase/auth";
import { collection, onSnapshot, query, limit } from "firebase/firestore";
import { getFirebaseDb } from "@/firebase/config";
import { getOrganizations, getOrganizationMembers } from "@/services/auth.service";
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
 * Subscribes to real-time updates for Admin Dashboard data across Firestore collections
 * and falls back to backend REST API data if needed.
 */
export function subscribeAdminDashboardData(
  user: User | null,
  onDataChange: (data: AdminDashboardData) => void
): () => void {
  let currentData: AdminDashboardData = { ...INITIAL_ADMIN_DATA };

  // If user is available, populate current user as initial member
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
  }

  let unsubOrgs: (() => void) | null = null;
  let unsubUsers: (() => void) | null = null;
  let unsubLogs: (() => void) | null = null;

  try {
    const db = getFirebaseDb();

    // 1. Subscribe to Organizations (Real-Time)
    const orgsRef = collection(db, "organizations");
    unsubOrgs = onSnapshot(
      orgsRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const liveOrgs: AdminOrgItem[] = snapshot.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              name: typeof d.name === "string" ? d.name : "Organization",
              type: typeof d.type === "string" ? d.type : "General",
              memberCount: typeof d.memberCount === "number" ? d.memberCount : 0,
              goalCount: typeof d.goalCount === "number" ? d.goalCount : (typeof d.committeeCount === "number" ? d.committeeCount : 1),
              status: d.status === "active" || d.status === "Complete" ? "Complete" : (typeof d.status === "string" ? d.status : "Pending")
            };
          });

          const activeCount = liveOrgs.filter((o) => o.status.toLowerCase().includes("complete") || o.status.toLowerCase() === "active").length;

          currentData = {
            ...currentData,
            organizations: liveOrgs,
            stats: {
              ...currentData.stats,
              totalOrgs: liveOrgs.length,
              setupComplete: `${activeCount}/${liveOrgs.length}`
            }
          };
          onDataChange(currentData);
        }
      },
      (err) => {
        console.warn("Firestore organizations real-time sync warning:", err);
      }
    );

    // 2. Subscribe to Users (Real-Time Members)
    const usersRef = collection(db, "users");
    unsubUsers = onSnapshot(
      usersRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const liveMembers: AdminMemberItem[] = snapshot.docs.map((docSnap) => {
            const d = docSnap.data();
            const fullName = typeof d.fullName === "string" && d.fullName.trim()
              ? d.fullName
              : (typeof d.displayName === "string" && d.displayName.trim() ? d.displayName : "Campus Member");
            const roleStr = typeof d.role === "string" ? d.role : "Member";
            const role = roleStr === "Student Leader" || roleStr === "Leader" ? "Leader" : roleStr === "Admin" ? "Admin" : "Member";
            const orgName = typeof d.organizationName === "string" && d.organizationName.trim()
              ? d.organizationName
              : (typeof d.organizationId === "string" && d.organizationId.trim() ? d.organizationId : "University Campus");
            return {
              id: docSnap.id,
              name: fullName,
              organizationName: orgName,
              role,
              initials: getInitials(fullName)
            };
          });

          const studentLeadersCount = liveMembers.filter((m) => m.role === "Leader").length;

          currentData = {
            ...currentData,
            members: liveMembers,
            stats: {
              ...currentData.stats,
              totalMembers: liveMembers.length,
              studentLeaders: studentLeadersCount
            }
          };
          onDataChange(currentData);
        }
      },
      (err) => {
        console.warn("Firestore users real-time sync warning:", err);
      }
    );

    // 3. Subscribe to Audit Logs (Real-Time Activity)
    const logsRef = collection(db, "audit_logs");
    unsubLogs = onSnapshot(
      query(logsRef, limit(10)),
      (snapshot) => {
        if (!snapshot.empty) {
          const liveLogs: AdminActivityItem[] = snapshot.docs.map((docSnap, idx) => {
            const d = docSnap.data();
            const formattedDate = d.createdAt
              ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(d.createdAt))
              : "Recent";
            return {
              id: docSnap.id,
              actorName: typeof d.actorName === "string" ? d.actorName : "System Administrator",
              action: typeof d.action === "string" ? d.action.toUpperCase() : "UPDATE",
              targetTitle: typeof d.targetName === "string" ? d.targetName : "System Record",
              targetType: typeof d.targetType === "string" ? d.targetType : "Log",
              date: formattedDate,
              logCode: `LOG-00${idx + 1}`
            };
          });

          currentData = {
            ...currentData,
            activities: liveLogs
          };
          onDataChange(currentData);
        }
      },
      (err) => {
        console.warn("Firestore audit logs real-time sync warning:", err);
      }
    );
  } catch (e) {
    console.warn("Could not setup Firestore snapshot listeners:", e);
  }

  // Fallback REST API calls for Backend Organizations, Audit Logs, and Organization Members
  if (user) {
    void getOrganizations(user)
      .then(async (orgs) => {
        if (orgs.length > 0) {
          const mappedOrgs: AdminOrgItem[] = orgs.map((o) => ({
            id: o.id,
            name: o.name,
            type: o.type,
            memberCount: o.memberCount || 0,
            goalCount: o.committeeCount || 1,
            status: o.status === "active" ? "Complete" : o.status
          }));
          const activeCount = mappedOrgs.filter((o) => o.status === "Complete" || o.status === "active").length;

          // Fetch members from organizations if Firestore users collection was empty
          const fetchedMembersList: AdminMemberItem[] = [];
          for (const org of orgs.slice(0, 5)) {
            try {
              const members = await getOrganizationMembers(user, org.id);
              for (const m of members) {
                if (!fetchedMembersList.some((existing) => existing.id === m.id)) {
                  const role = m.role === "Student Leader" || m.role === "Leader" ? "Leader" : m.role === "Admin" ? "Admin" : "Member";
                  fetchedMembersList.push({
                    id: m.id,
                    name: m.name,
                    organizationName: org.name,
                    role,
                    initials: getInitials(m.name)
                  });
                }
              }
            } catch {
              // Ignore individual org member fetch errors
            }
          }

          const finalMembers = fetchedMembersList.length > 0 ? fetchedMembersList : currentData.members;
          const studentLeadersCount = finalMembers.filter((m) => m.role === "Leader").length;

          currentData = {
            ...currentData,
            organizations: mappedOrgs,
            members: finalMembers,
            stats: {
              ...currentData.stats,
              totalOrgs: mappedOrgs.length,
              totalMembers: finalMembers.length || currentData.stats.totalMembers,
              studentLeaders: studentLeadersCount || currentData.stats.studentLeaders,
              setupComplete: `${activeCount}/${mappedOrgs.length}`
            }
          };
          onDataChange(currentData);
        }
      })
      .catch(() => {});

    void fetchAuditLogs(user)
      .then((res) => {
        if (res.logs && res.logs.length > 0) {
          const mappedLogs: AdminActivityItem[] = res.logs.slice(0, 6).map((log, idx) => ({
            id: log.id,
            actorName: log.actorName || "System Administrator",
            action: log.actionCategory === "Organization" ? "APPROVE" : log.action.includes("Create") ? "CREATE" : "UPDATE",
            targetTitle: log.targetName || log.action,
            targetType: log.targetType || "Activity",
            date: log.createdAt ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(log.createdAt)) : "Recent",
            logCode: `LOG-00${idx + 1}`
          }));
          currentData = {
            ...currentData,
            activities: mappedLogs
          };
          onDataChange(currentData);
        }
      })
      .catch(() => {});
  }

  return () => {
    if (unsubOrgs) unsubOrgs();
    if (unsubUsers) unsubUsers();
    if (unsubLogs) unsubLogs();
  };
}
