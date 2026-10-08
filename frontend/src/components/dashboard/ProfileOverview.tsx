"use client";

import { getStatusTheme } from "@/components/events/statusUtils";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Award, ChevronLeft, ChevronRight, Edit2, Star } from "lucide-react";
import {
  getProfileMetrics, getProfileTaskStatus, PROFILE_TASK_CAPACITY,
  type ProfileTask, type ProfileTaskFilter
} from "@/utils/profileMetrics";

export type ProfileOverviewUser = {
  fullName: string;
  email: string;
  role: string;
  position: string;
  organizationName: string;
  yearLevel: string;
  program: string;
  birthdate: string;
  profilePicture: string | null;
  skills: string[];
  status: string;
};

const cardClass = "rounded-2xl border border-[#e2e8f0] bg-white";
const labelClass = "text-[10px] font-medium uppercase tracking-[0.06em] text-slate-400";
const pageSize = 5;

function formatBirthdate(value: string): string {
  if (!value) return "Not set";
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "Not set";
}

export function ProfileOverview({ user, tasks, loading, tasksLoading, profileError, tasksError, onEdit }: {
  user: ProfileOverviewUser;
  tasks: ProfileTask[];
  loading: boolean;
  tasksLoading: boolean;
  profileError: string;
  tasksError: string;
  onEdit: () => void;
}) {
  const [filter, setFilter] = useState<ProfileTaskFilter>("all");
  const [page, setPage] = useState(1);
  const [failedPicture, setFailedPicture] = useState<string | null>(null);
  const metrics = useMemo(() => getProfileMetrics(tasks), [tasks]);
  const filtered = useMemo(() => tasks.filter((task) => filter === "all" || getProfileTaskStatus(task) === filter), [tasks, filter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleTasks = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageStart = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => pageStart + index);
  const ready = !loading && !tasksLoading && !tasksError && !profileError;
  const initials = user.fullName.trim().split(/\s+/).slice(0, 2).map((name) => name[0]).join("").toUpperCase();
  const availability = user.status.trim().toLowerCase();
  const availabilityClass = availability === "available"
    ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-300"
    : availability === "busy"
      ? "border-amber-400/30 bg-amber-400/15 text-amber-300"
      : "border-slate-400/30 bg-slate-400/15 text-slate-300";
  const maxCompletions = Math.max(4, ...metrics.weeks.map((week) => week.count));
  const chartMaximum = Math.ceil(maxCompletions / 4) * 4;
  const topPerformer = metrics.rating !== null && metrics.rating >= 4.5;
  const fields = [
    ["Full name", user.fullName], ["Email", user.email], ["Year level", user.yearLevel],
    ["Program", user.program], ["Role", user.position || user.role],
    ["Organization", [user.organizationName, user.position || user.role].filter(Boolean).join(" — ")],
    ["Birthdate", formatBirthdate(user.birthdate)]
  ];
  const filters: { id: ProfileTaskFilter; label: string; tone: string; selected: string }[] = [
    { id: "all", label: `All (${tasks.length})`, tone: "text-slate-500", selected: "bg-slate-900 text-white" },
    { id: "done", label: `${metrics.counts.done} done`, tone: "text-emerald-600", selected: "bg-emerald-600 text-white" },
    { id: "active", label: `${metrics.counts.active} active`, tone: "text-blue-600", selected: "bg-blue-600 text-white" },
    { id: "pending", label: `${metrics.counts.pending} pending`, tone: "text-amber-600", selected: "bg-amber-600 text-white" },
    ...(metrics.counts.cancelled ? [{ id: "cancelled" as const, label: `${metrics.counts.cancelled} cancelled`, tone: "text-slate-500", selected: "bg-slate-600 text-white" }] : [])
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 text-[#0f203a]">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <button type="button" onClick={onEdit} disabled={loading || Boolean(profileError)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
          <Edit2 size={14} /> Edit Profile
        </button>
      </div>

      {profileError ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{profileError}</p> : null}
      {tasksError ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{tasksError}</p> : null}

      <section aria-label="Profile summary" aria-busy={loading} className="relative overflow-hidden rounded-[24px] bg-[#203d63] px-6 py-7 text-white shadow-[0_8px_16px_rgba(15,23,42,0.14)] sm:px-7">
        <div className="pointer-events-none absolute -right-16 -top-24 size-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative flex items-center gap-5">
          <div className="relative flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#2563eb] text-xl font-bold shadow-md">
            {initials || "?"}
            {user.profilePicture && user.profilePicture !== failedPicture ? <Image src={user.profilePicture} alt="" width={72} height={72} unoptimized onError={() => setFailedPicture(user.profilePicture)} className="absolute inset-0 size-full object-cover" /> : null}
          </div>
          <div className="min-w-0">
            <h2 className="break-words text-xl font-bold tracking-tight sm:text-2xl">{user.fullName || (loading ? "Loading profile…" : "Your profile")}</h2>
            <p className="mt-1 text-xs text-blue-100">{[user.organizationName, user.position || user.role].filter(Boolean).join(" — ") || "No organization set"}</p>
            <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${availabilityClass}`}>
              <span className="size-1.5 rounded-full bg-current" />{user.status || "Status not set"}
            </span>
          </div>
        </div>
      </section>

      <section aria-label="Profile statistics" aria-busy={loading || tasksLoading} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { label: "Workload score", value: `${metrics.workload}%`, tone: metrics.workload >= 80 ? "text-rose-500" : metrics.workload >= 50 ? "text-amber-500" : "text-emerald-500", hint: `${metrics.counts.active + metrics.counts.pending} unfinished tasks / ${PROFILE_TASK_CAPACITY}-task capacity` },
          { label: "Reliability score", value: metrics.reliability === null ? "—" : `${metrics.reliability}%`, tone: "text-blue-600", hint: metrics.reliabilitySampleCount ? `On-time completions across ${metrics.reliabilitySampleCount} tasks with recorded dates` : "No completed tasks with both a completion date and a deadline yet" },
          { label: "Avg match %", value: metrics.averageMatch === null ? "—" : `${metrics.averageMatch}%`, tone: "text-blue-600", hint: "Average of saved assignment match scores" },
          { label: "Tasks done", value: metrics.counts.done, tone: "text-slate-900", hint: "Completed tasks assigned to you" }
        ].map((metric) => <div key={metric.label} title={metric.hint} className={`${cardClass} px-3 py-5 text-center`}>
          <p className={`text-[28px] font-bold leading-none ${metric.tone}`}>{ready ? metric.value : "—"}</p>
          <p className={`mt-2 ${labelClass}`}>{metric.label}</p>
        </div>)}
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-5">
          <section aria-labelledby="performance-heading" className={`${cardClass} p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-blue-600">Leader reviews &amp; performance</p>
                <h3 id="performance-heading" className="mt-1.5 text-sm font-semibold">Performance Rating</h3>
              </div>
              <span className="rounded-xl border border-amber-300 bg-amber-50 p-2 text-amber-500"><Star size={16} /></span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-[32px] font-bold leading-none">{ready && metrics.rating !== null ? metrics.rating.toFixed(1) : "—"}</span>
              <span className="text-xs text-slate-400">/ 5.0</span>
            </div>
            <div className="mt-4 flex items-center gap-1" aria-label={ready && metrics.rating !== null ? `${metrics.rating.toFixed(1)} out of 5 stars` : "No ratings"}>
              {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={16} className={ready && metrics.rating !== null && star <= Math.round(metrics.rating) ? "fill-amber-400 text-amber-400" : "text-slate-200"} />)}
              <span className="ml-2 text-[10px] text-slate-400">{ready ? `(${metrics.ratingCount} ${metrics.ratingCount === 1 ? "rating" : "ratings"})` : "Loading…"}</span>
            </div>
            <div className={`mt-4 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[10px] font-medium ${ready && topPerformer ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
              <Award size={14} className="shrink-0" />
              {ready ? metrics.ratingCount ? topPerformer ? "Top Performer" : "Based on saved leader reviews" : "No ratings yet — awaiting leader reviews" : "Loading performance data…"}
            </div>
          </section>

          <section aria-label="Personal details" className={`${cardClass} px-5 py-2`}>
            <dl className="divide-y divide-slate-100">
              {fields.map(([label, value]) => <div key={label} className="py-3">
                <dt className={labelClass}>{label}</dt>
                <dd className={`mt-1 break-words ${label === "Email" ? "text-[11px]" : "text-xs"}`}>{value || "Not set"}</dd>
              </div>)}
            </dl>
          </section>

          <section aria-labelledby="skills-heading" className={`${cardClass} p-5`}>
            <h3 id="skills-heading" className={labelClass}>Skill keywords</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {user.skills.length ? user.skills.map((skill) => <span key={skill} className="rounded-full bg-[#f0f4f8] px-3 py-1 text-[10px]">{skill}</span>) : <p className="text-xs text-slate-500">No skills added yet. Edit your profile to add skills.</p>}
            </div>
          </section>
        </div>

        <div className="min-w-0 space-y-5">
          <section aria-labelledby="completion-heading" className={`${cardClass} p-5`}>
            <h3 id="completion-heading" className={labelClass}>Sub-task completion — this month</h3>
            <p className="sr-only">{new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}. {ready ? metrics.weeks.map((week) => `${week.label}: ${week.count}`).join(". ") : "Completion data unavailable."}</p>
            {ready && metrics.weeks.every((week) => week.count === 0) ? <p className="mt-3 text-xs text-slate-400">No recorded completions this month.</p> : null}
            <div className="mt-6 flex h-40 gap-3 border-b border-slate-100" aria-hidden="true">
              <div className="flex w-5 shrink-0 flex-col justify-between pb-5 text-right text-[10px] text-slate-400">
                {[4, 3, 2, 1, 0].map((step) => <span key={step}>{(chartMaximum / 4) * step}</span>)}
              </div>
              <div className="grid min-w-0 flex-1 gap-3" style={{ gridTemplateColumns: `repeat(${metrics.weeks.length}, minmax(0, 1fr))` }}>
                {metrics.weeks.map((week) => <div key={week.label} className="flex min-w-0 flex-col items-center justify-end" title={`${week.label} (days ${week.startDay}–${week.endDay}): ${ready ? week.count : "unavailable"}`}>
                  <div className="relative h-full w-9 max-w-full overflow-hidden rounded-t-lg bg-[#f1f5f9]">
                    <div className="absolute inset-x-0 bottom-0 rounded-t-lg bg-[#2860ed] transition-[height] duration-500" style={{ height: ready ? `${(week.count / chartMaximum) * 100}%` : "0%" }} />
                  </div>
                  <span className="shrink-0 py-1.5 text-[10px] text-slate-500">{week.label}</span>
                </div>)}
              </div>
            </div>
            {ready && metrics.undatedCompletions > 0 ? <p className="mt-3 text-[10px] leading-relaxed text-slate-400">{metrics.undatedCompletions} completed {metrics.undatedCompletions === 1 ? "task has" : "tasks have"} no recorded completion date and {metrics.undatedCompletions === 1 ? "is" : "are"} excluded from the chart.</p> : null}
          </section>

          <section aria-labelledby="subtasks-heading" aria-busy={loading || tasksLoading} className={`${cardClass} p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 id="subtasks-heading" className={labelClass}>All sub-tasks</h3>
              <div className="flex flex-wrap items-center gap-1" aria-label="Filter sub-tasks">
                {filters.map((item) => <button key={item.id} type="button" aria-pressed={filter === item.id} disabled={!ready} onClick={() => { setFilter(item.id); setPage(1); }} className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition hover:opacity-80 disabled:opacity-50 ${filter === item.id ? item.selected : item.tone}`}>
                  {ready ? item.label : item.id === "all" ? "All" : item.id}
                </button>)}
              </div>
            </div>

            {!ready ? <p role="status" className="py-12 text-center text-xs text-slate-400">{tasksError || profileError ? "Task data is unavailable. Please refresh and try again." : "Loading your sub-tasks…"}</p>
              : visibleTasks.length === 0 ? <p className="py-12 text-center text-xs text-slate-400">{tasks.length ? "No sub-tasks match this filter." : "No sub-tasks assigned to you yet."}</p>
                : <div className="mt-1 divide-y divide-slate-100">
                  {visibleTasks.map((task) => {
                    const tone = getStatusTheme(task.status || "Pending", task.customStatuses).badge;
                    const match = task.matchPercentage;
                    return <div key={`${task.eventId}:${task.id}`} className="flex items-center justify-between gap-3 py-4">
                      <div className="min-w-0">
                        <h4 className="break-words text-xs font-medium leading-relaxed">{task.title}</h4>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
                          <span className="text-slate-400">• {task.eventTitle}</span>
                          {typeof match === "number" && Number.isFinite(match) && match >= 0 && match <= 100 ? <span className="font-medium text-blue-600">{match}% match</span> : null}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] ${tone}`}>{task.status || "Pending"}</span>
                    </div>;
                  })}
                </div>}

            {ready && filtered.length > 0 ? <div className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <span className="text-[10px] text-slate-500">Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} sub-tasks</span>
              <nav aria-label="Sub-task pages" className="flex items-center gap-1.5">
                <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="flex size-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40"><ChevronLeft size={14} /></button>
                {pages.map((number) => <button key={number} type="button" aria-label={`Page ${number}`} aria-current={currentPage === number ? "page" : undefined} onClick={() => setPage(number)} className={`flex size-7 items-center justify-center rounded-lg text-[10px] font-medium ${currentPage === number ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{number}</button>)}
                <button type="button" aria-label="Next page" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="flex size-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40"><ChevronRight size={14} /></button>
              </nav>
            </div> : null}
          </section>
        </div>
      </div>
    </div>
  );
}
