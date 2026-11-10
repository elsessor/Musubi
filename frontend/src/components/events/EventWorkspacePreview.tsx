"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, Columns3, Edit3, Filter, LayoutGrid, Plus, Repeat, Rows, Search, SlidersHorizontal, Table, Users } from "lucide-react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useTutorialView } from "@/hooks/useTutorialView";
import { AddCustomStatusModal } from "./AddCustomStatusModal";
import { CalendarView } from "./CalendarView";
import { getStatusTheme } from "./statusUtils";
import { useTutorialPlaceholders } from "@/components/onboarding/TutorialPreviewContext";
import { EmptyState } from "@/components/ui/EmptyState";

const views = [
  { value: "grid", label: "Grid", icon: LayoutGrid },
  { value: "table", label: "Table", icon: Table },
  { value: "expanded", label: "Expandable list", icon: Rows },
  { value: "kanban", label: "Kanban", icon: Columns3 },
  { value: "calendar", label: "Calendar", icon: Calendar }
];
const statuses = ["To Do", "In Progress", "In Review", "Completed"];
const statusOptions = ["All", ...statuses, "Archived"].map((value) => ({ value, label: value === "All" ? "All Tasks" : value }));
const committeeOptions = [{ value: "All", label: "All Committees" }, { value: "committee", label: "Committee name" }];
const unavailable = "Available after joining an organization";
const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";
const card = "min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs sm:p-4";

// Preview controls only change local presentation; no Event or Task record is created.
export function EventWorkspacePreview({ isLeader, onBack }: { isLeader: boolean; onBack: () => void }) {
  const teaching = useTutorialPlaceholders();
  const [view, setView] = useState("grid");
  const tutorialViewRef = useTutorialView(setView);
  const [status, setStatus] = useState("All");
  const [committee, setCommittee] = useState("All");
  const [query, setQuery] = useState("");
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!teaching) { setFiltersOpen(false); setStatusModalOpen(false); }
  }, [teaching]);

  useEffect(() => {
    if (!filtersOpen) return;
    const media = window.matchMedia("(max-width: 639px)");
    if (!media.matches) { setFiltersOpen(false); return; }
    const dialog = filtersRef.current;
    const closeOnDesktop = () => { if (!media.matches) setFiltersOpen(false); };
    dialog?.showModal();
    media.addEventListener("change", closeOnDesktop);
    return () => { media.removeEventListener("change", closeOnDesktop); dialog?.close(); };
  }, [filtersOpen]);

  if (!teaching) return <div ref={tutorialViewRef} data-tour-view-scope="tasks" data-tour-view={view} data-tour="event-workspace" data-event-id="workspace-preview" className="min-w-0 space-y-4">
    <button type="button" onClick={onBack} className={`inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-600 ${focus}`}><ChevronLeft aria-hidden="true" className="size-4" />Back to events</button>
    <div data-tour="event-task-workspace"><EmptyState title="No tasks to display yet" description="Join an organization and open an event to see its assigned tasks." icon={Calendar} /></div>
  </div>;

  function searchInput(mobile = false) {
    return <div className={`relative ${mobile ? "w-full" : "w-44 max-w-full"}`}>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input data-tour="task-search" aria-label="Search tasks" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks..." className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-400 sm:min-h-9 sm:text-xs" />
    </div>;
  }

  function createActions(mobile = false) {
    return isLeader && <div data-tour="task-create-actions" className={`flex shrink-0 items-center gap-1.5 ${mobile ? "basis-full justify-end min-[400px]:basis-auto" : ""}`}>
      <button type="button" disabled title={unavailable} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-500 disabled:cursor-not-allowed sm:min-h-9"><Repeat aria-hidden="true" className="size-3.5 text-blue-500" />{mobile ? "Reuse" : "Reuse Tasks"}</button>
      <button data-tour="add-task" type="button" disabled title={unavailable} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white opacity-50 disabled:cursor-not-allowed sm:min-h-9"><Plus aria-hidden="true" className="size-3.5" />{mobile ? "Task" : "Add Task"}</button>
    </div>;
  }

  function customStatusButton(mobile = false) {
    return isLeader && <button data-tour="task-custom-status" type="button" onClick={() => { setFiltersOpen(false); setStatusModalOpen(true); }} title="Preview custom progress labels" className={`inline-flex items-center gap-1 border bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 ${focus} ${mobile ? "min-h-11 rounded-xl border-blue-100" : "min-h-9 rounded-full border-dashed border-slate-300"}`}><Plus aria-hidden="true" className="size-3.5" />{mobile ? "Manage statuses" : "Custom Status"}</button>;
  }

  function taskPlaceholder(index: number) {
    return <article key={index} aria-label="Task card layout placeholder" className={`${card} flex flex-col justify-between p-[clamp(0.5rem,2.4vw,0.75rem)]`}>
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-semibold sm:text-[11px]">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-500">Priority</span><span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-500">Task status</span>
        </div>
        <h3 className="break-words text-xs font-semibold leading-5 text-slate-800 sm:text-sm">Task title</h3>
        <p className="mt-2 hidden text-xs leading-5 text-slate-500 sm:line-clamp-2">Task instructions and expected deliverable appear here.</p>
        <p className="mt-3 hidden text-[11px] leading-5 text-slate-400 sm:block">Prerequisites and attachments, when provided</p>
      </div>
      <div className="mt-4 flex min-w-0 flex-col gap-2 border-t border-slate-100 pt-3 text-[10px] text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:text-xs">
        <span className="inline-flex min-w-0 items-center gap-2"><span aria-hidden="true" className="size-6 shrink-0 rounded-full bg-slate-100" /><span className="truncate">Assigned member</span></span><span className="inline-flex items-center gap-1"><Calendar aria-hidden="true" className="size-3 shrink-0" />Deadline</span>
      </div>
    </article>;
  }

  const filtered = query.trim() || status !== "All" || committee !== "All";
  return <div ref={tutorialViewRef} data-tour-view-scope="tasks" data-tour-view={view} data-tour="event-workspace" data-event-id="workspace-preview" className="flex min-h-full min-w-0 flex-col">
    <nav aria-label="Event breadcrumb" className="mb-4 flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
      <button type="button" onClick={onBack} aria-label="Back to events" className={`inline-flex min-h-9 items-center gap-1 font-bold text-slate-700 hover:text-blue-600 ${focus}`}><ChevronLeft aria-hidden="true" className="size-4" />Events &amp; Tasks</button><span aria-hidden="true">/</span><span className="truncate font-semibold text-slate-900">Event name</span>
    </nav>
    <p className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900">Event workspace preview. This layout follows the organization workspace. Placeholders show where event details and tasks will appear after you join.</p>
    <section data-tour="event-summary" className="mb-3 min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs sm:mb-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <h1 className="break-words text-base font-semibold tracking-tight text-slate-900 sm:text-xl">Event name</h1>
            {isLeader && <button type="button" disabled title={unavailable} aria-label="Edit event details" className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-400 disabled:cursor-not-allowed"><Edit3 aria-hidden="true" className="size-3.5" />Edit</button>}
            <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-bold text-slate-500">Event status</span><span className={`${summaryExpanded ? "inline-flex" : "hidden sm:inline-flex"} rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500`}>Committee</span>
          </div>
          <p className={`${summaryExpanded ? "block" : "hidden sm:block"} mt-1 max-w-2xl break-words text-xs leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6`}>Event purpose, description, and expected outcome</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-semibold text-slate-500 sm:mt-3 sm:gap-4">
            <span className={`${summaryExpanded ? "flex" : "hidden sm:flex"} items-center gap-1.5`}><Calendar aria-hidden="true" className="size-3.5 text-slate-400" />Start date – End date</span><span className={`${summaryExpanded ? "flex" : "hidden sm:flex"} items-center gap-1.5`}><Users aria-hidden="true" className="size-3.5 text-slate-400" />Members</span><span><span aria-label="Task count unavailable">—</span> total tasks</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end sm:gap-0 sm:border-l sm:border-slate-100 sm:pl-5"><p aria-label="Progress unavailable" className="text-sm font-semibold text-slate-700 sm:text-2xl">—</p><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Progress</p></div>
      </div>
      <button type="button" aria-expanded={summaryExpanded} onClick={() => setSummaryExpanded((value) => !value)} className={`mt-1 min-h-11 text-xs font-semibold text-blue-600 sm:hidden ${focus}`}>{summaryExpanded ? "Hide event details" : "Show event details"}</button><div role="img" aria-label="Overall task progress appears after joining" className="mt-2 h-1.5 w-full rounded-full bg-slate-100 sm:mt-4 sm:h-2.5" />
    </section>

    <div className="mb-4 space-y-3 sm:hidden">
      <div className="flex flex-wrap items-center gap-2"><button data-tour="task-filter-panel" type="button" onClick={() => setFiltersOpen(true)} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold ${focus}`}><Filter aria-hidden="true" className="size-4" />Filters</button><div className="min-w-28 flex-1"><CustomSelect tourId="task-view" value={view} onChange={setView} options={views} buttonClassName="min-h-11 rounded-xl bg-white text-sm" portal /></div>{createActions(true)}</div>
      {searchInput(true)}
    </div>
    <div className="mb-4 hidden min-w-0 flex-wrap items-center justify-between gap-3 sm:flex">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <CustomSelect tourId="task-committee-filter" value={committee} onChange={setCommittee} options={committeeOptions} icon={<SlidersHorizontal aria-hidden="true" className="size-3.5 text-slate-400" />} containerClassName="w-auto min-w-[150px]" buttonClassName="min-h-9 rounded-xl bg-white text-xs font-semibold" portal />
        <div data-tour="task-status-filter" role="group" aria-label="Filter tasks by status" className="flex flex-wrap items-center gap-1">
          {statusOptions.map(({ value, label }) => { const active = status === value; const theme = getStatusTheme(value); return <button key={value} type="button" aria-pressed={active} onClick={() => setStatus(value)} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium ${focus} ${active ? value === "All" ? "bg-slate-900 text-white shadow-sm" : theme.active : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{value !== "All" && <span aria-hidden="true" className={`size-1.5 rounded-full ${theme.dot}`} />}{label}<span aria-label="Count unavailable" className="opacity-60">—</span></button>; })}
          {customStatusButton()}
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {searchInput()}<div data-tour="task-view" role="group" aria-label="Task views" className="flex items-center gap-0.5 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">{views.map(({ value, label, icon: Icon }) => <button key={value} type="button" title={`${label} view`} aria-label={`${label} view`} aria-pressed={view === value} onClick={() => setView(value)} className={`rounded-lg p-2 ${focus} ${view === value ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}><Icon aria-hidden="true" className="size-3.5" /></button>)}</div>{createActions()}
      </div>
    </div>

    <section data-tour="event-task-workspace" aria-label="Task layout preview" className="min-w-0">
      {filtered && <p role="status" className="mb-3 rounded-lg bg-slate-100 p-3 text-xs leading-5 text-slate-500">No task records in preview. Search and filters will narrow your organization&apos;s tasks after you join. The layout remains visible below.</p>}
      {view === "grid" && <div className="grid min-w-0 grid-cols-2 items-stretch gap-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">{[0, 1, 2, 3].map(taskPlaceholder)}</div>}
      {view === "table" && <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="min-w-[900px] w-full text-left text-xs text-slate-500"><caption className="sr-only">Task table layout preview</caption><thead className="bg-slate-50 text-[11px] uppercase"><tr>{["Task Title", "Committee", "Status", "Priority", "Assignee", "Due Date", "Flags / Info", "Actions"].map((label) => <th key={label} scope="col" className="px-4 py-3.5">{label}</th>)}</tr></thead><tbody>{[0, 1].map((index) => <tr key={index} className="border-t border-slate-100">{["Task title and instructions", "Committee", "Task status", "Priority", "Assigned member", "Deadline", "Prerequisites and attachments", "Available after joining"].map((label) => <td key={label} className="px-4 py-4">{label}</td>)}</tr>)}</tbody></table></div>}
      {view === "expanded" && <div className="space-y-3">{[0, 1].map((index) => <details key={index} open={index === 0} className={card}><summary className={`min-h-11 cursor-pointer py-2 text-sm font-semibold text-slate-700 ${focus}`}>Task title</summary><p className="mt-2 text-xs leading-5 text-slate-500">Task instructions, prerequisites, expected deliverable, and attachments</p><dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">{["Status", "Priority", "Assigned member", "Deadline"].map((label) => <div key={label}><dt>{label}</dt><dd className="mt-1 text-slate-400">Available after joining</dd></div>)}</dl></details>)}</div>}
      {view === "kanban" && <div className="flex min-w-0 snap-x snap-proximity items-start gap-3 overflow-x-auto overscroll-x-contain pb-4 pt-1 sm:gap-4">{(status === "Archived" ? ["Archived"] : statuses).map((label, index) => <div key={label} className="w-[min(18rem,85vw)] shrink-0 snap-start rounded-2xl border border-slate-200 bg-slate-100 p-3"><h3 className="mb-3 flex items-center gap-2 px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-600"><span aria-hidden="true" className={`size-2 rounded-full ${getStatusTheme(label).dot}`} />{label}<span className="ml-auto text-slate-400">—</span></h3>{taskPlaceholder(index)}</div>)}</div>}
      {view === "calendar" && <CalendarView items={[]} itemLabel="tasks" getId={() => ""} getTitle={() => ""} getStatus={() => ""} isScheduled={() => false} onSelect={() => {}} />}
    </section>
    <p className="mt-4 text-center text-xs font-semibold text-slate-500">Task completion and overall progress appear here after joining.</p>

    {filtersOpen && <dialog ref={filtersRef} onCancel={() => setFiltersOpen(false)} aria-labelledby="preview-task-filters-title" className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl backdrop:bg-slate-950/40 sm:hidden">
      <div className="mb-5 flex items-center justify-between"><h2 id="preview-task-filters-title" className="text-lg font-bold">Filter tasks</h2><button data-tour="task-filter-done" type="button" onClick={() => setFiltersOpen(false)} className={`min-h-11 rounded-lg px-3 text-sm font-semibold text-blue-600 ${focus}`}>Done</button></div>
      <div className="space-y-4"><div className="space-y-2"><p className="text-sm font-semibold text-slate-600">Committee</p><CustomSelect tourId="task-committee-filter" value={committee} onChange={setCommittee} options={committeeOptions} buttonClassName="min-h-11 rounded-xl bg-white" /></div><div className="space-y-2"><p className="text-sm font-semibold text-slate-600">Status</p><CustomSelect tourId="task-status-filter" value={status} onChange={setStatus} options={statusOptions} buttonClassName="min-h-11 rounded-xl bg-white" /></div><div className="flex flex-wrap justify-between gap-2"><button type="button" onClick={() => { setStatus("All"); setCommittee("All"); setQuery(""); }} className={`min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold ${focus}`}>Clear filters</button>{customStatusButton(true)}</div></div>
    </dialog>}
    {isLeader && <AddCustomStatusModal isOpen={statusModalOpen} preview type="task" onClose={() => setStatusModalOpen(false)} statusOrder={statuses} defaultStatuses={statuses} onAddStatus={() => {}} onReorderStatusOrder={() => {}} />}
  </div>;
}
