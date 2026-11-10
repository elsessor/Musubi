"use client";

import { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { CustomSelect } from "@/components/ui/CustomSelect";

const views = [{ value: "grid", label: "Grid" }, { value: "table", label: "Table" }, { value: "expanded", label: "Expandable list" }, { value: "kanban", label: "Kanban" }, { value: "calendar", label: "Calendar" }];
const card = "min-w-0 rounded-xl border border-dashed border-slate-300 bg-white p-4";

// This is a layout preview, never an Event record or a persistence-enabled board.
export function EventWorkspacePreview({ isLeader, onBack }: { isLeader: boolean; onBack: () => void }) {
  const [view, setView] = useState("grid");
  const [status, setStatus] = useState("All");
  const [committee, setCommittee] = useState("All");
  const [query, setQuery] = useState("");
  return <div data-tour="event-workspace" data-event-id="workspace-preview" className="min-w-0 space-y-4">
    <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"><ArrowLeft aria-hidden="true" className="size-4" />Back to events</button>
    <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900">Event workspace preview. Explore the layout and page guide before joining an organization. Event and task information becomes available after membership approval.</p>
    <section data-tour="event-summary" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-700">Event name</h2><p className="mt-2 text-xs leading-5 text-slate-500">Event purpose, description, and expected outcome</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">Event status</span></div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500 sm:grid-cols-4">{["Committee", "Start date", "End date", "Members"].map((label) => <div key={label}><dt className="font-medium">{label}</dt><dd className="mt-1">Not available in preview</dd></div>)}</dl>
      <p className="mt-4 text-xs text-slate-500">Overall task progress</p><div aria-hidden="true" className="mt-2 h-1.5 rounded-full bg-slate-100" />
    </section>
    <div className="flex min-w-0 flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1 basis-32"><label className="mb-1 block text-xs font-medium text-slate-500">Committee</label><CustomSelect tourId="task-committee-filter" value={committee} onChange={setCommittee} options={[{ value: "All", label: "All Committees" }, { value: "committee", label: "Committee name" }]} /></div>
      <div className="min-w-0 flex-1 basis-32"><label className="mb-1 block text-xs font-medium text-slate-500">Status</label><CustomSelect tourId="task-status-filter" value={status} onChange={setStatus} options={["All", "To Do", "In Progress", "In Review", "Completed", "Archived"].map((value) => ({ value, label: value === "All" ? "All tasks" : value }))} /></div>
      <div className="min-w-0 flex-1 basis-32"><label className="mb-1 block text-xs font-medium text-slate-500">View</label><CustomSelect tourId="task-view" value={view} onChange={setView} options={views} /></div>
      <div className="relative min-w-0 flex-1 basis-40"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" /><input data-tour="task-search" aria-label="Search tasks" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks..." className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-400" /></div>
      {isLeader && <div data-tour="task-create-actions" className="flex flex-wrap gap-2">{["Reuse Tasks", "Add Task"].map((label) => <button key={label} type="button" disabled title="Available after joining an organization" className="min-h-11 rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-500 disabled:cursor-not-allowed">{label}</button>)}</div>}
    </div>
    <section data-tour="event-task-workspace" aria-label="Task layout preview" className="min-w-0">
      <p className="mb-3 text-xs leading-5 text-slate-500">These controls let you explore the layout. Your organization&apos;s tasks will appear here after you join.</p>
      {query.trim() || status !== "All" || committee !== "All" ? <div className={card}><p className="text-sm font-medium text-slate-600">No task records in preview</p><p className="mt-2 text-xs leading-5 text-slate-500">Search and filters will narrow your organization&apos;s tasks when membership is active.</p></div>
        : view === "table" ? <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-left text-xs text-slate-500"><caption className="sr-only">Task table layout preview</caption><thead><tr>{["Task", "Status", "Assignee", "Deadline"].map((label) => <th key={label} scope="col" className="p-3 font-semibold">{label}</th>)}</tr></thead><tbody><tr>{["Task title and instructions", "Task status", "Assigned member", "Due date"].map((label) => <td key={label} className="border-t border-slate-100 p-3">{label}</td>)}</tr></tbody></table></div>
        : view === "kanban" ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{["To Do", "In Progress", "In Review", "Completed"].map((label) => <div key={label} className={card}><h3 className="text-xs font-semibold text-slate-600">{label}</h3><p className="mt-4 text-xs leading-5 text-slate-400">Tasks at this stage appear here.</p></div>)}</div>
        : view === "calendar" ? <div className={card}><h3 className="text-sm font-semibold text-slate-600">Task calendar</h3><p className="mt-2 text-xs leading-5 text-slate-500">Scheduled tasks appear on their saved dates.</p><div aria-hidden="true" className="mt-4 grid grid-cols-7 gap-1">{Array.from({ length: 14 }, (_, index) => <div key={index} className="h-12 rounded border border-slate-100 bg-slate-50 sm:h-16" />)}</div></div>
        : <div className={`grid gap-3 ${view === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>{[0, 1].map((index) => <article key={index} className={card}><span className="text-[11px] text-slate-400">Status · Priority</span><h3 className="mt-3 text-sm font-semibold text-slate-600">Task title</h3><p className="mt-2 text-xs leading-5 text-slate-400">Instructions, prerequisites, and expected deliverable</p><dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-400">{["Assigned member", "Deadline", "Attachments"].map((label) => <div key={label}><dt>{label}</dt><dd className="sr-only">Available after joining</dd></div>)}</dl></article>)}</div>}
    </section>
  </div>;
}
