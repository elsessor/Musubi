"use client";

import { doc, getDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Briefcase, CheckCircle, Clock3, Target, UserCheck } from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { MemberActiveSubtasks } from "@/components/dashboard/MemberActiveSubtasks";
import { MemberNudges, type NudgeItem } from "@/components/dashboard/MemberNudges";
import type { AuthUserProfile } from "@/types/auth";
import type { DashboardActivity, DashboardGoal, DashboardKPI } from "@/types/dashboard";
import { getFirebaseDb } from "@/firebase/config";
import { useLogout } from "@/hooks/useLogout";
import { useAuthStore } from "@/store/authStore";
import { getDashboardNavItems } from "@/utils/routes";
import { subscribeAuditLogsFirestore, type AuditLogRecord } from "@/services/audit.service";
import { getOrganization, subscribeOrganizationMembersFirestore, type OrganizationMember } from "@/services/auth.service";
import { subscribeEventsFirestore } from "@/services/events.service";
import { checkAndDispatchDueNudges } from "@/services/notifications.service";
import type { Event, Task } from "@/components/events/types";
import { getAssignedProfileTasks } from "@/utils/profileMetrics";
import { getTaskReminder, isTaskInactive } from "@/utils/taskTiming";

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
    { id: "active-goals", label: "Active Events", value: 0, icon: "target", accent: "blue" },
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

  const [realtimeEventsList, setRealtimeEventsList] = useState<Event[]>([]);
  const [rawAuditLogs, setRawAuditLogs] = useState<AuditLogRecord[]>([]);

  // Subscribe to real-time events in Cloud Firestore
  useEffect(() => {
    const unsubscribe = subscribeEventsFirestore(firebaseUser, profile?.organizationId, (realtimeEvents: Event[]) => {
      setRealtimeEventsList(realtimeEvents);
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
        status: e.status,
        customStatuses: e.eventCustomStatuses
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

  // Subscribe to real-time audit logs
  useEffect(() => {
    if (!firebaseUser) return;
    const unsubscribe = subscribeAuditLogsFirestore(
      {
        onData: (logs) => setRawAuditLogs(logs),
        onError: () => setRawAuditLogs([])
      },
      firebaseUser
    );
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [firebaseUser]);

  // Merge audit logs and completed subtasks for Recent Activity feed
  useEffect(() => {
    const list: DashboardActivity[] = [];

    if (Array.isArray(rawAuditLogs)) {
      rawAuditLogs.forEach((log) => {
        const lowerAction = (log.action ?? "").toLowerCase();
        const lowerCat = (log.actionCategory ?? "").toLowerCase();

        // Skip sign-in logs for organization dashboard view
        if (lowerAction.includes("signed in") || lowerAction.includes("login") || lowerCat.includes("security")) {
          return;
        }

        let title = log.action;
        if (log.targetName) {
          if (log.action.toLowerCase().includes(log.targetName.toLowerCase())) {
            title = log.action;
          } else {
            title = `${log.action} - ${log.targetName}`;
          }
        }
        list.push({
          id: `audit_${log.id}`,
          title,
          time: formatRelativeTime(log.createdAt),
          icon: getAuditLogIcon(log.action, log.actionCategory)
        });
      });
    }

    if (Array.isArray(realtimeEventsList)) {
      realtimeEventsList.forEach((e) => {
        if (Array.isArray(e.tasks)) {
          e.tasks.forEach((t) => {
            if (t.status === "Done" || t.status === "Completed") {
              list.push({
                id: `task_${e.id}_${t.id}`,
                title: `Subtask completed: "${t.title || t.description || "Subtask"}" (${e.title})`,
                time: formatRelativeTime((e as any).updatedAt || (e as any).createdAt),
                icon: "check"
              });
            }
          });
        }
      });
    }

    const map = new Map<string, DashboardActivity>();
    list.forEach((item) => {
      if (!map.has(item.id)) map.set(item.id, item);
    });

    setActivities(Array.from(map.values()));
  }, [rawAuditLogs, realtimeEventsList]);

  useEffect(() => {
    if (!loading && dashboardUser.role === "Admin") {
      router.replace("/admin");
    }
  }, [dashboardUser.role, loading, router]);

  // Member View computations
  const isMemberView = dashboardUser.role === "Organization Member";

  const memberSubtasks = useMemo(() => getAssignedProfileTasks(realtimeEventsList, dashboardUser.id || "", dashboardUser.name), [realtimeEventsList, dashboardUser.name, dashboardUser.id]);
  const activeMemberSubtasks = useMemo(() => {
    return memberSubtasks.filter((t) => {
      const st = (t.status || "").toLowerCase();
      return !isTaskInactive(t) && !st.includes("completed") && !st.includes("done");
    });
  }, [memberSubtasks]);

  const memberKpis: DashboardKPI[] = useMemo(() => {
    const totalAssigned = memberSubtasks.length;
    const inProgress = memberSubtasks.filter((t) => (t.status || "").toLowerCase().includes("progress")).length;
    const completed = memberSubtasks.filter((t) => {
      const st = (t.status || "").toLowerCase();
      return st.includes("completed") || st.includes("done");
    }).length;

    const matchScores = memberSubtasks
      .map((t) => t.matchPercentage)
      .filter((score): score is number => typeof score === "number" && score > 0);

    const avgMatch =
      matchScores.length > 0
        ? Math.round(matchScores.reduce((a, b) => a + b, 0) / matchScores.length)
        : 92;

    return [
      { id: "subtasks-assigned", label: "Sub-Tasks Assigned", value: totalAssigned, icon: "briefcase", accent: "purple" },
      { id: "in-progress", label: "In Progress", value: inProgress, icon: "clock", accent: "blue" },
      { id: "completed", label: "Completed", value: completed, icon: "check", accent: "green" },
      { id: "avg-match-score", label: "Avg Match Score", value: `${avgMatch}%`, icon: "award", accent: "amber" }
    ];
  }, [memberSubtasks]);

  useEffect(() => {
    void checkAndDispatchDueNudges();
  }, []);

  const [deadlineNow, setDeadlineNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setDeadlineNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const memberNudges: NudgeItem[] = useMemo(() => memberSubtasks.flatMap(task => {
    const parent = realtimeEventsList.find(event => event.id === task.eventId);
    if (!parent || isTaskInactive(parent) || parent.status === "Completed") return [];
    const timing = getTaskReminder(task, deadlineNow);
    if (!timing) return [];
    return [{ id: `deadline_${task.eventId}_${task.id}`, type: timing.label,
      title: `${task.title || "Subtask"}${task.blockedBy ? ` — Waiting for: ${(task.blockedByTaskTitles || []).join(", ")}` : ""}`,
      date: task.dueDate || task.deadline || "No deadline", eventTitle: task.eventTitle, eventId: task.eventId, taskId: task.id }];
  }).sort((a, b) => Number(b.type.startsWith("Overdue")) - Number(a.type.startsWith("Overdue"))), [memberSubtasks, realtimeEventsList, deadlineNow]);


  // Do not render a role-specific shell until auth has resolved. Rendering
  // the default leader shell first causes a visible leader/member flicker.
  if (authLoading || !profile) return null;

  if (isMemberView) {
    const kpiIcons = {
      briefcase: Briefcase,
      clock: Clock3,
      check: CheckCircle,
      award: Award,
      target: Target,
      users: UserCheck
    };

    return (
      <DashboardLayout
        activeNavId="dashboard"
        activities={[]}
        goals={[]}
        kpis={memberKpis}
        navItems={getDashboardNavItems(dashboardUser.role)}
        notificationCount={memberNudges.length}
        onLogout={logout}
        user={dashboardUser}
      >
        <section className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-4">
          {memberKpis.map((kpi) => (
            <KPICard
              key={kpi.id}
              color={kpi.accent === "orange" ? "amber" : kpi.accent}
              icon={kpiIcons[kpi.icon]}
              label={kpi.label}
              value={kpi.value}
            />
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
          <MemberActiveSubtasks subtasks={activeMemberSubtasks} />
          <MemberNudges nudges={memberNudges} />
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      activeNavId="dashboard"
      activities={activities}
      goals={goals}
      kpis={kpis}
      navItems={getDashboardNavItems(dashboardUser.role)}
      notificationCount={0}
      onLogout={logout}
      user={dashboardUser}
    />
  );
}
