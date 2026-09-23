"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart2,
  TrendingUp,
  Users,
  CheckCircle2,
  Zap,
  Calendar,
  Clock,
  CheckCircle,
  ArrowUpRight,
  Layers,
  Sparkles
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useLogout } from "@/hooks/useLogout";
import { useAuthStore } from "@/store/authStore";
import { getDashboardNavItems } from "@/utils/routes";
import { subscribeEventsFirestore } from "@/services/events.service";
import { fetchAuditLogs, type AuditLogRecord } from "@/services/audit.service";
import type { Event, Task } from "@/components/events/types";

function greetingDate() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date());
}

export default function AnalyticsPage() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const authLoading = useAuthStore((state) => state.loading);
  const logout = useLogout();

  const [events, setEvents] = useState<Event[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);

  useEffect(() => {
    if (!authLoading && !profile) router.replace("/sign-in");
  }, [authLoading, profile, router]);

  useEffect(() => {
    if (!firebaseUser) return;

    // Subscribe to real-time events in Cloud Firestore
    const unsubscribe = subscribeEventsFirestore(firebaseUser, profile?.organizationId, (realtimeEvents) => {
      setEvents(realtimeEvents);
    });

    // Fetch audit logs for telemetry
    void fetchAuditLogs(firebaseUser)
      .then((res) => {
        setAuditLogs(res.logs || []);
      })
      .catch(() => {});

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [firebaseUser, profile?.organizationId]);

  if (authLoading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef2f8] text-sm text-slate-500">
        Loading analytics...
      </div>
    );
  }

  const user = {
    name: profile.fullName,
    role: profile.role,
    roleLabel: profile.position ?? profile.role,
    organizationName: "",
    academicYear: "AY 2025–2026",
    greetingDate: greetingDate()
  };

  // Compute dynamic telemetry from real-time events & tasks
  const allTasks: Task[] = events.flatMap((e) => e.tasks || []);
  const completedTasks = allTasks.filter((t) => t.status === "Completed");
  const inProgressTasks = allTasks.filter((t) => t.status === "In Progress");
  const todoTasks = allTasks.filter((t) => t.status === "To Do");
  const inReviewTasks = allTasks.filter((t) => t.status === "In Review");

  const completionRate = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;
  const assignedTasks = allTasks.filter((t) => t.assignee?.name && t.assignee.name.trim());
  const engagementRate = allTasks.length > 0 ? Math.round((assignedTasks.length / allTasks.length) * 100) : 0;

  const aiTasks = allTasks.filter((t) => t.isAiGenerated);
  const aiAuditLogs = auditLogs.filter(
    (log) => log.actionCategory === "AI Agent Actions" || log.action.includes("Atomizer")
  );
  const aiEventsCount = Math.max(
    events.filter((e) => e.tasks?.some((t) => t.isAiGenerated) || e.title.toLowerCase().includes("atomizer")).length,
    aiAuditLogs.length
  );
  const aiSubtasksCount = Math.max(
    aiTasks.length,
    aiAuditLogs.reduce((acc, log) => acc + ((log.context as { taskCount?: number } | null | undefined)?.taskCount ?? 0), 0)
  );

  return (
    <DashboardLayout
      activeNavId="analytics"
      activities={[]}
      goals={[]}
      kpis={[]}
      navItems={getDashboardNavItems(profile.role)}
      notificationCount={0}
      onLogout={logout}
      user={user}
    >
      <section className="mx-auto w-full max-w-[1680px] text-[#12213a]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[21px] font-bold tracking-[-0.02em]">Analytics &amp; Workload</h1>
            <p className="text-xs text-slate-500 mt-0.5">Live organizational telemetry, task velocity, and AI breakdown</p>
          </div>
        </div>

        {/* Dynamic Metric Cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Task Completion Rate"
            value={`${completionRate}%`}
            change={`${completedTasks.length} of ${allTasks.length} tasks completed`}
            icon={CheckCircle2}
            color="text-emerald-500"
          />
          <StatCard
            title="Active Workload"
            value={`${allTasks.length} Task${allTasks.length === 1 ? "" : "s"}`}
            change={`${inProgressTasks.length + todoTasks.length} active across ${events.length} event${events.length === 1 ? "" : "s"}`}
            icon={BarChart2}
            color="text-blue-500"
          />
          <StatCard
            title="Team Engagement"
            value={`${engagementRate}%`}
            change={`${assignedTasks.length} of ${allTasks.length} subtasks assigned`}
            icon={Users}
            color="text-violet-500"
          />
          <StatCard
            title="AI Atomizations"
            value={`${aiEventsCount} Goal${aiEventsCount === 1 ? "" : "s"}`}
            change={`${aiSubtasksCount} subtask${aiSubtasksCount === 1 ? "" : "s"} generated`}
            icon={Zap}
            color="text-amber-500"
          />
        </div>

        {/* Task Workflow & Velocity Overview */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Telemetry & Events Velocity */}
          <div className="lg:col-span-2 rounded-2xl border border-[#dce3ed] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Event &amp; Task Velocity</h3>
                  <p className="text-xs text-slate-400">Real-time status breakdown across all active organizational goals</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>

            {/* Workflow Distribution Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
                <span>Task Distribution ({allTasks.length} total)</span>
                <span>{completedTasks.length} Completed ({completionRate}%)</span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 p-0.5">
                {allTasks.length > 0 ? (
                  <>
                    <div
                      style={{ width: `${(completedTasks.length / allTasks.length) * 100}%` }}
                      className="bg-emerald-500 transition-all duration-500"
                      title={`Completed: ${completedTasks.length}`}
                    />
                    <div
                      style={{ width: `${(inProgressTasks.length / allTasks.length) * 100}%` }}
                      className="bg-blue-500 transition-all duration-500"
                      title={`In Progress: ${inProgressTasks.length}`}
                    />
                    <div
                      style={{ width: `${(inReviewTasks.length / allTasks.length) * 100}%` }}
                      className="bg-violet-500 transition-all duration-500"
                      title={`In Review: ${inReviewTasks.length}`}
                    />
                    <div
                      style={{ width: `${(todoTasks.length / allTasks.length) * 100}%` }}
                      className="bg-slate-300 transition-all duration-500"
                      title={`To Do: ${todoTasks.length}`}
                    />
                  </>
                ) : (
                  <div className="w-full bg-slate-200" />
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="font-medium text-slate-600">Completed ({completedTasks.length})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span className="font-medium text-slate-600">In Progress ({inProgressTasks.length})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                  <span className="font-medium text-slate-600">In Review ({inReviewTasks.length})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="font-medium text-slate-600">To Do ({todoTasks.length})</span>
                </div>
              </div>
            </div>

            {/* Event List Telemetry */}
            <div className="mt-6 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Events Telemetry ({events.length})
              </h4>
              {events.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                  No published events found. Create an event or atomize a goal to track analytics.
                </div>
              ) : (
                events.map((event) => {
                  const evTasks = event.tasks || [];
                  const evCompleted = evTasks.filter((t) => t.status === "Completed").length;
                  const evProgress = evTasks.length ? Math.round((evCompleted / evTasks.length) * 100) : event.progress || 0;

                  return (
                    <div
                      key={event.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition hover:bg-slate-50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100/70 text-blue-600 font-bold text-xs">
                          <Layers size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-sm font-bold text-slate-900">{event.title}</h5>
                            <span className="rounded-full bg-blue-100/80 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700">
                              {event.status}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                            {event.description || "No description provided."}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:w-48 shrink-0">
                        <div className="w-full">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                            <span>{evTasks.length} subtasks</span>
                            <span className="font-bold text-slate-800">{evProgress}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              style={{ width: `${evProgress}%` }}
                              className="h-full bg-blue-600 transition-all duration-300"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* AI Telemetry & Highlights Side Panel */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#dce3ed] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">AI Task Atomizer Stats</h3>
                  <p className="text-xs text-slate-400">Automated breakdown telemetry</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-amber-50/50 p-3.5 border border-amber-100">
                  <div>
                    <span className="text-xs font-semibold text-slate-600 block">AI Generated Tasks</span>
                    <span className="text-lg font-extrabold text-slate-900">{aiTasks.length}</span>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                    {allTasks.length > 0 ? `${Math.round((aiTasks.length / allTasks.length) * 100)}% of total` : "0%"}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-blue-50/50 p-3.5 border border-blue-100">
                  <div>
                    <span className="text-xs font-semibold text-slate-600 block">AI Goal Runs</span>
                    <span className="text-lg font-extrabold text-slate-900">{aiEventsCount}</span>
                  </div>
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                    Genkit AI
                  </span>
                </div>
              </div>

              {aiAuditLogs.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Recent AI Runs
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {aiAuditLogs.slice(0, 4).map((log) => (
                      <div key={log.id} className="text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <p className="font-semibold text-slate-800 line-clamp-1">{log.action}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">By {log.actorName} · {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  color
}: {
  title: string;
  value: string;
  change: string;
  icon: any;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-[#dce3ed] bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">{title}</span>
        <Icon className={`size-5 ${color}`} />
      </div>
      <p className="mt-3 text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="mt-1 text-[11px] font-medium text-slate-400">{change}</p>
    </div>
  );
}
