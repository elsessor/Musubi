"use client";

import { CheckCircle2, ChevronDown, Link2, Lock, Search } from "lucide-react";
import { createContext, useContext, useId, useState } from "react";
import { getBlockingDependencies, isDependencyComplete, isTaskArchived, type DependencyTask } from "@/utils/taskDependencies";

export const TaskDependencyTasksContext = createContext<DependencyTask[]>([]);

export function TaskDependencyBadge({ task, compact = false }: {
  task: { dependsOnTaskIds?: string[]; blockedBy?: number; blockedByTaskTitles?: string[] };
  compact?: boolean;
}) {
  const tasks = useContext(TaskDependencyTasksContext);
  const ids = [...new Set(task.dependsOnTaskIds || [])];
  const count = ids.length || task.blockedBy || 0;
  if (!count) return null;
  const blockers = getBlockingDependencies({ id: "", dependsOnTaskIds: ids }, tasks);
  const blocked = task.blockedBy ?? blockers.length;
  const titles = tasks.length && ids.length
    ? ids.map((id) => tasks.find((item) => item.id === id)?.title || "Unavailable prerequisite")
    : task.blockedByTaskTitles || [];
  const description = titles.length ? titles.join(", ") : `${count} prerequisite${count === 1 ? "" : "s"}`;
  const waiting = task.blockedByTaskTitles?.length ? task.blockedByTaskTitles.join(", ") : blockers.map((item) => item.title).join(", ");
  const tooltip = `Depends on: ${description}. ${blocked ? `Waiting for: ${waiting || `${blocked} unfinished prerequisite${blocked === 1 ? "" : "s"}`}.` : "All prerequisites completed."}`;
  const Icon = blocked ? Lock : Link2;
  return (
    <span title={tooltip} aria-label={tooltip} className={compact
      ? "mr-1 inline-flex items-center gap-0.5 align-middle text-[9px]"
      : `inline-flex min-w-0 max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${blocked ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}>
      <Icon size={10} className="shrink-0" />
      <span className={compact ? "" : "min-w-0 truncate"}>
        {compact ? count : `Depends on: ${titles.length ? `${titles[0]}${count > 1 ? ` +${count - 1}` : ""}` : description}`}
      </span>
    </span>
  );
}

type TaskDependencySelectorProps = {
  taskId: string;
  tasks: DependencyTask[];
  value: string[];
  onChange?: (ids: string[]) => void;
  readOnly?: boolean;
};

export function TaskDependencySelector({ taskId, tasks, value, onChange, readOnly = false }: TaskDependencySelectorProps) {
  const fieldId = useId();
  const [search, setSearch] = useState("");
  const blockers = getBlockingDependencies({ id: taskId, dependsOnTaskIds: value }, tasks);
  function createsCycle(candidateId: string): boolean {
    const seen = new Set<string>();
    function reachesCurrent(id: string): boolean {
      if (id === taskId) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return (tasks.find((task) => task.id === id)?.dependsOnTaskIds || []).some(reachesCurrent);
    }
    return reachesCurrent(candidateId);
  }
  const available = tasks.filter((task) => task.id !== taskId && (!isTaskArchived(task) || value.includes(task.id)));
  const missing = value.filter((id) => !tasks.some((task) => task.id === id)).map((id) => ({ id, title: "Unavailable prerequisite", status: "Missing task" }));
  const options = [...available, ...missing].filter((task) => (!readOnly || value.includes(task.id)) && (task.title || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <fieldset className="min-w-0 space-y-2.5 rounded-xl border border-slate-200 bg-white p-3">
      <legend className="px-1.5 text-xs font-semibold text-slate-700">
        <span className="inline-flex items-center gap-1.5"><Link2 size={13} className="text-slate-400" />Depends on</span>
      </legend>
      <p className="text-[11px] leading-4 text-slate-500">{readOnly ? "Prerequisites must finish before this task can start." : "Select tasks that must finish first. Optional."}</p>
      {readOnly && !value.length ? <p className="text-xs text-slate-600">No prerequisites.</p> : (
        <details className="group min-w-0 overflow-hidden rounded-lg border border-slate-200">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 bg-slate-50/70 px-2.5 py-2 text-xs transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1 font-semibold text-slate-700">
              {value.length ? `${value.length} prerequisite${value.length === 1 ? "" : "s"} selected` : "Select prerequisite tasks"}
            </span>
            {value.length ? <span className="shrink-0 text-[11px] font-medium text-blue-600">{readOnly ? "View" : "Edit"}</span> : null}
            <ChevronDown size={14} className="shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-2 border-t border-slate-200 p-2">
            {!readOnly && available.length > 6 ? (
              <div className="relative">
                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input aria-label="Search prerequisites" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks…" className="min-h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2.5 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
              </div>
            ) : null}
            <div className="max-h-48 space-y-1 overflow-y-auto overscroll-contain">
              {options.map((task, index) => {
                const checked = value.includes(task.id);
                const disabled = !checked && createsCycle(task.id);
                const complete = isDependencyComplete(task.status);
                return (
                  <label key={task.id} htmlFor={`${fieldId}-${index}`} className={`flex min-h-11 items-start gap-2 rounded-lg border p-2 text-xs transition ${checked ? "border-blue-100 bg-blue-50/60" : "border-transparent bg-white"} ${disabled ? "cursor-not-allowed opacity-50" : readOnly ? "" : "cursor-pointer hover:border-blue-200 hover:bg-blue-50"}`}>
                    {!readOnly ? <input id={`${fieldId}-${index}`} type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange?.(event.target.checked ? [...value, task.id] : value.filter((id) => id !== task.id))} className="mt-0.5 size-4 shrink-0 rounded accent-blue-600" /> : null}
                    <span className="min-w-0 flex-1 break-words font-medium leading-4 text-slate-700">
                      {task.title || "Untitled task"}
                      <span className={`mt-1 flex items-center gap-1 text-[10px] font-normal ${complete ? "text-emerald-700" : "text-slate-500"}`}>
                        {disabled ? <Lock size={10} className="shrink-0" /> : complete ? <CheckCircle2 size={11} className="shrink-0" /> : <span className="size-1.5 shrink-0 rounded-full bg-slate-400" />}
                        {disabled ? "Would create a circular dependency" : task.status || "To Do"}
                      </span>
                    </span>
                  </label>
                );
              })}
              {!options.length ? <p className="px-2 py-3 text-xs text-slate-500">{available.length ? "No matching tasks." : "No other tasks available yet."}</p> : null}
            </div>
          </div>
        </details>
      )}
      {value.length ? (
        <div role="status" className={`flex items-start gap-2 rounded-lg px-2.5 py-2 text-[11px] leading-4 ${blockers.length ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
          {blockers.length ? <Lock size={12} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={13} className="mt-0.5 shrink-0" />}
          <div className="min-w-0 flex-1 break-words">
            {blockers.length ? <><p className="font-semibold">Waiting on {blockers.length} task{blockers.length === 1 ? "" : "s"}</p><p className="mt-0.5 [overflow-wrap:anywhere]">{blockers.map((task) => task.title).join(", ")}</p></> : <p>All prerequisites completed. Ready to start.</p>}
          </div>
        </div>
      ) : null}
    </fieldset>
  );
}
