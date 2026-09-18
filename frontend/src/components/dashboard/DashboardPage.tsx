"use client";

import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import type { AuthUserProfile } from "@/types/auth";
import type { DashboardActivity, DashboardGoal, DashboardKPI } from "@/types/dashboard";
import { getFirebaseDb } from "@/firebase/config";
import { useLogout } from "@/hooks/useLogout";
import { useAuthStore } from "@/store/authStore";
import { getDashboardNavItems } from "@/utils/routes";
import { fetchAuditLogs, type AuditLogRecord } from "@/services/audit.service";
import { getOrganization, subscribeOrganizationMembersFirestore, type OrganizationMember } from "@/services/auth.service";
import { subscribeEventsFirestore } from "@/services/events.service";
import type { Event } from "@/components/events/types";

function formatGreetingDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "Just now";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Just now";
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

function getAuditLogIcon(action: string, category?: string | null): DashboardActivity["icon"] {
  const lower = (action + " " + (category ?? "")).toLowerCase();
  if (lower.includes("atomized") || lower.includes("ai")) return "spark";
  if (lower.includes("done") || lower.includes("completed") || lower.includes("accept")) return "check";
  if (lower.includes("reassigned") || lower.includes("member") || lower.includes("assign")) return "users";
  if (lower.includes("goal") || lower.includes("created")) return "goal";
  return "edit";
}

function buildDashboardUser(profile: AuthUserProfile | null) {
  const role = profile?.role ?? "Student Leader";

  return {
    id: profile?.uid ?? null,
    name: profile?.fullName ?? "",
    role,
    roleLabel: profile?.position ?? (role === "Student Leader" ? "President" : role),
    organizationName: profile?.organizationName ?? "",
    academicYear: "AY 2025–2026",
    greetingDate: formatGreetingDate()
  };
}

export function DashboardPage() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const authLoading = useAuthStore((state) => state.loading);
  const logout = useLogout();
  const [dashboardUser, setDashboardUser] = useState(() => buildDashboardUser(profile));
  const [loading, setLoading] = useState(true);

  const [kpis, setKpis] = useState<DashboardKPI[]>([
    { id: "active-goals", label: "Active Goals", value: 0, icon: "target", accent: "blue" },
    { id: "total-subtasks", label: "Total Sub-Tasks", value: 0, icon: "briefcase", accent: "purple" },
    { id: "members-available", label: "Members Available", value: 0, icon: "users", accent: "green" },
    { id: "pending-delegations", label: "Pending Delegations", value: 0, icon: "clock", accent: "orange" }
  ]);
  const [goals, setGoals] = useState<DashboardGoal[]>([]);
  const [activities, setActivities] = useState<DashboardActivity[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardUser() {
      const uid = profile?.uid ?? firebaseUser?.uid;

      if (!uid) {
        if (!authLoading) {
          if (!cancelled) {
            setDashboardUser(buildDashboardUser(profile));
            setLoading(false);
          }
        }
        return;
      }

      setLoading(true);

      try {
        const snapshot = await getDoc(doc(getFirebaseDb(), "users", uid));
        const data = snapshot.exists() ? snapshot.data() : null;

        const role =
          data?.role === "Admin" || data?.role === "Student Leader" || data?.role === "Organization Member"
            ? data.role
            : profile?.role ?? "Student Leader";

        const fullName =
          typeof data?.fullName === "string" && data.fullName.trim()
            ? data.fullName
            : profile?.fullName ?? "";

        let orgName =
          typeof data?.organizationName === "string" && data.organizationName.trim()
            ? data.organizationName
            : profile?.organizationName ?? "";

        const orgId = typeof data?.organizationId === "string" ? data.organizationId : profile?.organizationId ?? null;
        if (!orgName && orgId && firebaseUser) {
          try {
            const orgData = await getOrganization(firebaseUser, orgId);
            if (orgData?.name) orgName = orgData.name;
          } catch {
            // Ignore fallback error
          }
        }

        if (!cancelled) {
          setDashboardUser({
            id: uid,
            name: fullName,
            role,
            roleLabel:
              typeof data?.position === "string" && data.position.trim()
                ? data.position
                : (role === "Student Leader" ? "President" : role),
            organizationName: orgName,
            academicYear: "AY 2025–2026",
            greetingDate: formatGreetingDate()
          });
        }
      } catch {
        if (!cancelled) {
          setDashboardUser(buildDashboardUser(profile));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboardUser();

    return () => {
      cancelled = true;
    };
  }, [authLoading, firebaseUser, profile]);

  // Subscribe to real-time events in Cloud Firestore
  useEffect(() => {
    const unsubscribe = subscribeEventsFirestore(firebaseUser, profile?.organizationId, (realtimeEvents: Event[]) => {
      const activeCount = realtimeEvents.filter((e) => e.status === "Active").length;
      let totalSubtasks = 0;
      let pendingDelegations = 0;

      realtimeEvents.forEach((e) => {
        if (Array.isArray(e.tasks)) {
          totalSubtasks += e.tasks.length;
          pendingDelegations += e.tasks.filter((t) => t.status === "To Do" || t.status === "In Progress").length;
        }
      });

      setKpis((prev) =>
        prev.map((kpi) => {
          if (kpi.id === "active-goals") return { ...kpi, value: activeCount };
          if (kpi.id === "total-subtasks") return { ...kpi, value: totalSubtasks };
          if (kpi.id === "pending-delegations") return { ...kpi, value: pendingDelegations };
          return kpi;
        })
      );

      const mappedGoals: DashboardGoal[] = realtimeEvents.slice(0, 5).map((e) => ({
        id: e.id,
        title: e.title,
        dueDate: `Due ${e.endDate || e.startDate}`,
        progress: e.progress,
        status: e.status === "Active" ? "In Progress" : e.status === "Completed" ? "Completed" : "Pending"
      }));

      setGoals(mappedGoals);
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [firebaseUser, profile?.organizationId]);

  // Subscribe to real-time members count in Cloud Firestore
  useEffect(() => {
    if (!profile?.organizationId) return;
    const unsubscribe = subscribeOrganizationMembersFirestore(profile.organizationId, (members: OrganizationMember[]) => {
      setKpis((prev) =>
        prev.map((kpi) => (kpi.id === "members-available" ? { ...kpi, value: members.length } : kpi))
      );
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [profile?.organizationId]);

  // Fetch audit logs via backend API to update activities cleanly
  useEffect(() => {
    if (!firebaseUser) return;
    void fetchAuditLogs(firebaseUser)
      .then(({ logs }) => {
        if (!logs) {
          setActivities([]);
          return;
        }
        const mappedActivities: DashboardActivity[] = logs.slice(0, 6).map((log) => {
          let title = log.action;
          if (log.targetName) {
            if (log.action.toLowerCase().includes(log.targetName.toLowerCase())) {
              title = log.action;
            } else {
              title = `${log.action} - ${log.targetName}`;
            }
          }
          return {
            id: log.id,
            title,
            time: formatRelativeTime(log.createdAt),
            icon: getAuditLogIcon(log.action, log.actionCategory)
          };
        });

        setActivities(mappedActivities);
      })
      .catch(() => {
        setActivities([]);
      });
  }, [firebaseUser]);

  useEffect(() => {
    if (!loading && dashboardUser.role === "Admin") {
      router.replace("/admin");
    }
  }, [dashboardUser.role, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef1f5] text-slate-500 font-medium">
        Loading dashboard...
      </div>
    );
  }

  return (
    <DashboardLayout
      activeNavId="dashboard"
      activities={activities}
      goals={goals}
      kpis={kpis}
      navItems={getDashboardNavItems(dashboardUser.role)}
      notificationCount={2}
      onLogout={logout}
      user={dashboardUser}
    />
  );
}
