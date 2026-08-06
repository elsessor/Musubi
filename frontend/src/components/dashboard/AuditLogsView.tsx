"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  KeyRound,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCog,
  X
} from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useLogout } from "@/hooks/useLogout";
import {
  createAuditLogsStream,
  fetchAuditLogs,
  subscribeAuditLogsFirestore,
  type AuditLogRecord
} from "@/services/audit.service";
import { useAuthStore } from "@/store/authStore";
import type { UserRole } from "@/types/auth";
import { getDashboardNavItems } from "@/utils/routes";

const CATEGORIES = [
  "All Categories",
  "User Management",
  "Organization",
  "AI Agent Actions",
  "Security & Access",
  "Events & Tasks"
] as const;

const DATE_RANGES = [
  { label: "All Time", value: "all" },
  { label: "Today", value: "today" },
  { label: "Past 7 Days", value: "7days" },
  { label: "Past 30 Days", value: "30days" }
] as const;

type AuditLogsViewProps = {
  requiredRole?: UserRole;
};

export function AuditLogsView({ requiredRole }: AuditLogsViewProps) {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const authLoading = useAuthStore((state) => state.loading);
  const logout = useLogout();

  const userRole = requiredRole ?? profile?.role ?? "Admin";

  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All Categories");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    if (!authLoading && !profile) {
      router.replace("/sign-in");
    }
  }, [authLoading, profile, router]);

  useEffect(() => {
    if (!profile) return;

    let isMounted = true;
    let unsubscribeStream: (() => void) | null = null;

    setLogsLoading(true);
    setLogsError("");

    // Subscribe to live Firestore audit_logs collection
    const unsubscribeFirestore = subscribeAuditLogsFirestore({
      onData: (realtimeLogs) => {
        if (!isMounted) return;
        setLogs(realtimeLogs);
        setLogsLoading(false);
        setLogsError("");
      },
      onError: () => {
        if (!firebaseUser) return;
        createAuditLogsStream(firebaseUser, {
          onData: (streamLogs) => {
            if (!isMounted) return;
            setLogs(streamLogs);
            setLogsLoading(false);
            setLogsError("");
          },
          onError: () => {
            if (!isMounted) return;
            fetchAuditLogs(firebaseUser)
              .then((res) => {
                if (isMounted) {
                  setLogs(res.logs);
                  setLogsLoading(false);
                }
              })
              .catch(() => {
                if (isMounted) {
                  setLogsLoading(false);
                  setLogsError("Unable to load audit logs from Firebase.");
                }
              });
          }
        }).then((close) => {
          unsubscribeStream = close;
        });
      }
    });

    return () => {
      isMounted = false;
      unsubscribeFirestore();
      unsubscribeStream?.();
    };
  }, [firebaseUser, profile]);


  // Filtering
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        (log.actorName ?? "").toLowerCase().includes(query) ||
        (log.action ?? "").toLowerCase().includes(query) ||
        (log.targetName ?? "").toLowerCase().includes(query) ||
        (log.actionCategory ?? "").toLowerCase().includes(query);

      const matchesCategory =
        categoryFilter === "All Categories" || log.actionCategory === categoryFilter;

      let matchesDate = true;
      if (log.createdAt && dateRangeFilter !== "all") {
        const logDate = new Date(log.createdAt).getTime();
        const now = new Date().getTime();
        const dayMs = 24 * 60 * 60 * 1000;

        if (dateRangeFilter === "today") {
          matchesDate = now - logDate <= dayMs;
        } else if (dateRangeFilter === "7days") {
          matchesDate = now - logDate <= 7 * dayMs;
        } else if (dateRangeFilter === "30days") {
          matchesDate = now - logDate <= 30 * dayMs;
        }
      }

      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [logs, searchQuery, categoryFilter, dateRangeFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, dateRangeFilter]);

  function toggleExpand(id: string) {
    setExpandedLogId((prev) => (prev === id ? null : id));
  }

  if (authLoading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef1f5] text-slate-500">
        Loading audit logs...
      </div>
    );
  }

  const user = {
    name: profile.fullName,
    role: userRole,
    roleLabel: profile.position ?? (userRole === "Admin" ? "Administrator" : "Student Leader"),
    organizationName: "University Campus",
    academicYear: "",
    greetingDate: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    }).format(new Date())
  };

  const totalEvents = logs.length;
  const aiEventsCount = logs.filter((l) => l.actionCategory === "AI Agent Actions").length;
  const securityEventsCount = logs.filter((l) => l.actionCategory === "Security & Access").length;
  const todayCount = logs.filter((l) => {
    if (!l.createdAt) return false;
    const diff = new Date().getTime() - new Date(l.createdAt).getTime();
    return diff <= 24 * 60 * 60 * 1000;
  }).length;

  return (
    <DashboardLayout
      activeNavId="audit-logs"
      activities={[]}
      goals={[]}
      kpis={[]}
      navItems={getDashboardNavItems(userRole)}
      notificationCount={0}
      onLogout={logout}
      user={user}
    >
      <section className="mx-auto w-full max-w-6xl space-y-6">
        {/* Header Title */}
        <div>
          <p className="text-sm font-bold uppercase tracking-[.16em] text-blue-600">
            {userRole === "Admin" ? "Administration & Governance" : "Organization Activity"}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Audit Logs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Chronological activity feed, AI agent decisions, committee updates, and system events.
          </p>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Events
                </p>
                <p className="text-2xl font-black text-slate-900">{totalEvents}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Sparkles className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  AI Automated
                </p>
                <p className="text-2xl font-black text-slate-900">{aiEventsCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <KeyRound className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Security Events
                </p>
                <p className="text-2xl font-black text-slate-900">{securityEventsCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Clock className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Today&apos;s Logs
                </p>
                <p className="text-2xl font-black text-slate-900">{todayCount}</p>
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
                placeholder="Search audit logs by actor, action description, or target entity..."
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

            {/* Category & Date Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand"
              >
                {DATE_RANGES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {logsError ? (
          <p className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            {logsError}
          </p>
        ) : null}

        {/* Audit Log Feed */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
          {logsLoading ? (
            <div className="py-16 text-center text-sm font-medium text-slate-500">
              <RefreshCw className="mx-auto size-6 animate-spin text-brand mb-2" />
              Loading activity feed...
            </div>
          ) : paginatedLogs.length ? (
            <div className="divide-y divide-slate-100">
              {paginatedLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <div key={log.id} className="transition hover:bg-slate-50/60">
                    {/* Header Row */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(log.id)}
                      className="grid w-full gap-4 px-5 py-4 text-left md:grid-cols-[auto_minmax(0,1.5fr)_minmax(140px,.8fr)_minmax(140px,.8fr)_auto] md:items-center"
                    >
                      <CategoryIcon category={log.actionCategory} />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-extrabold text-slate-900 text-sm leading-snug">
                            {log.action}
                          </p>
                          <CategoryBadge category={log.actionCategory} />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          Target: <span className="font-semibold text-slate-700">{log.targetName ?? "N/A"}</span> ({log.targetType ?? "Entity"})
                        </p>
                      </div>

                      <div>
                        <p className="font-bold text-slate-800 text-xs truncate">
                          {log.actorName ?? "System"}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium truncate">
                          {log.actorRole ?? "Automated"}
                        </p>
                      </div>

                      <div className="text-xs text-slate-500 font-medium">
                        {formatTimestamp(log.createdAt)}
                      </div>

                      <div className="flex items-center justify-end">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition">
                          {isExpanded ? (
                            <ChevronUp className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                        </span>
                      </div>
                    </button>

                    {/* Expandable Detail View */}
                    {isExpanded ? (
                      <div className="bg-slate-50/80 px-6 py-5 border-t border-slate-100 space-y-4 animate-in fade-in">
                        {log.reason ? (
                          <div className="rounded-xl bg-white p-3.5 border border-slate-200/80 text-xs space-y-1">
                            <p className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                              Description &amp; Rationale
                            </p>
                            <p className="text-slate-700 font-medium leading-relaxed">{log.reason}</p>
                          </div>
                        ) : null}

                        <div className="grid gap-4 md:grid-cols-2">
                          {/* Changes Diff Box */}
                          {log.changes ? (
                            <div className="rounded-xl bg-white p-4 border border-slate-200/80 text-xs space-y-2.5">
                              <p className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                                State Changes &amp; Diff
                              </p>

                              {typeof log.changes === "object" && "from" in log.changes ? (
                                <div className="space-y-2">
                                  {log.changes.field ? (
                                    <p className="font-semibold text-slate-800 text-xs">
                                      Modified Field: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-blue-700 font-mono text-[11px]">{log.changes.field}</code>
                                    </p>
                                  ) : null}
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <div className="flex-1 rounded-lg bg-rose-50 p-2.5 border border-rose-100">
                                      <p className="text-[10px] font-bold uppercase text-rose-500">From</p>
                                      <p className="font-mono text-xs font-semibold text-rose-800 mt-0.5 break-all">
                                        {String(log.changes.from ?? "None")}
                                      </p>
                                    </div>
                                    <ArrowRight className="size-4 text-slate-400 shrink-0 self-center hidden sm:block" />
                                    <div className="flex-1 rounded-lg bg-emerald-50 p-2.5 border border-emerald-100">
                                      <p className="text-[10px] font-bold uppercase text-emerald-600">To</p>
                                      <p className="font-mono text-xs font-semibold text-emerald-800 mt-0.5 break-all">
                                        {String(log.changes.to ?? "None")}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <pre className="font-mono text-xs bg-slate-50 p-2 rounded border border-slate-200 overflow-x-auto">
                                  {JSON.stringify(log.changes, null, 2)}
                                </pre>
                              )}
                            </div>
                          ) : null}

                          {/* AI Context Box */}
                          {log.context ? (
                            <div className="rounded-xl bg-purple-50/70 p-4 border border-purple-200/80 text-xs space-y-2.5">
                              <div className="flex items-center justify-between">
                                <p className="font-bold uppercase tracking-wider text-purple-600 text-[10px] flex items-center gap-1.5">
                                  <Sparkles className="size-3.5" />
                                  AI Model Context
                                </p>
                                {log.context.confidenceScore ? (
                                  <span className="rounded-full bg-purple-600 px-2 py-0.5 text-[11px] font-extrabold text-white">
                                    {Math.round(log.context.confidenceScore * 100)}% confidence
                                  </span>
                                ) : null}
                              </div>

                              <div className="space-y-1.5 text-slate-700">
                                {log.context.aiModelUsed ? (
                                  <p>
                                    <span className="font-bold text-slate-900">Model Engine:</span>{" "}
                                    <span className="font-semibold text-purple-900">{log.context.aiModelUsed}</span>
                                  </p>
                                ) : null}
                                {log.context.previousStatus && log.context.newStatus ? (
                                  <p>
                                    <span className="font-bold text-slate-900">Status Shift:</span>{" "}
                                    {log.context.previousStatus} &rarr; {log.context.newStatus}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-xl bg-white p-4 border border-slate-200/80 text-xs space-y-2.5">
                              <p className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                                Log Reference
                              </p>
                              <div className="space-y-1 font-mono text-[11px] text-slate-600">
                                <p><span className="font-sans font-bold text-slate-800">Log Event ID:</span> {log.id}</p>
                                <p><span className="font-sans font-bold text-slate-800">Target Type:</span> {log.targetType ?? "System Entity"}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                <ShieldCheck className="size-6" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">No audit logs match criteria</h3>
              <p className="mt-1 text-xs text-slate-500">
                Try clearing your search query or choosing a different category or date filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("All Categories");
                  setDateRangeFilter("all");
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* Footer Pagination Bar */}
          {filteredLogs.length > 0 ? (
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3.5 text-xs text-slate-500 bg-slate-50/50">
              <p className="font-medium">
                Showing <span className="font-bold text-slate-800">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                <span className="font-bold text-slate-800">
                  {Math.min(currentPage * pageSize, filteredLogs.length)}
                </span>{" "}
                of <span className="font-bold text-slate-800">{filteredLogs.length}</span> entries
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="font-bold text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </DashboardLayout>
  );
}

function CategoryIcon({ category }: { category?: string | null }) {
  if (category === "AI Agent Actions") {
    return (
      <span className="flex size-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 shrink-0">
        <Sparkles className="size-5" />
      </span>
    );
  }
  if (category === "User Management") {
    return (
      <span className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shrink-0">
        <UserCog className="size-5" />
      </span>
    );
  }
  if (category === "Organization") {
    return (
      <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 shrink-0">
        <Building2 className="size-5" />
      </span>
    );
  }
  if (category === "Security & Access") {
    return (
      <span className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 shrink-0">
        <KeyRound className="size-5" />
      </span>
    );
  }
  return (
    <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
      <Calendar className="size-5" />
    </span>
  );
}

function CategoryBadge({ category }: { category?: string | null }) {
  const styles: Record<string, string> = {
    "AI Agent Actions": "bg-purple-50 text-purple-700 ring-purple-200",
    "User Management": "bg-blue-50 text-blue-700 ring-blue-200",
    Organization: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    "Security & Access": "bg-amber-50 text-amber-700 ring-amber-200",
    "Events & Tasks": "bg-emerald-50 text-emerald-700 ring-emerald-200"
  };

  const style = styles[category ?? ""] ?? "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1 ${style}`}>
      {category ?? "General"}
    </span>
  );
}

function formatTimestamp(value?: string | null): string {
  if (!value) return "Date unavailable";

  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  } catch {
    return value;
  }
}
