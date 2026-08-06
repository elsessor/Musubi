"use client";

import { AlertTriangle, Calendar, CheckCircle2, Loader2, User, Zap } from "lucide-react";
import { useState } from "react";
import type { Event, GeneratedTask, TaskPriority, TaskStatus } from "./types";

const priorityConfig: Record<TaskPriority, { classes: string }> = {
  Low:      { classes: "bg-slate-100 text-slate-600 ring-slate-200" },
  Medium:   { classes: "bg-blue-50 text-blue-600 ring-blue-200" },
  High:     { classes: "bg-amber-50 text-amber-700 ring-amber-200" },
  Critical: { classes: "bg-rose-50 text-rose-600 ring-rose-200" }
};

const MOCK_GENERATED: GeneratedTask[] = [
  { id: "g1", title: "Define event scope, goals, and success metrics", priority: "High", assigneeName: "Ana Reyes", dueDate: "Aug 8, 2026", status: "To Do", matchScore: 73, confirmed: false },
  { id: "g2", title: "Develop detailed action plan and timeline", priority: "High", assigneeName: "Marco Dela Cruz", dueDate: "Aug 9, 2026", status: "To Do", matchScore: 79, confirmed: false },
  { id: "g3", title: "Prepare and approve event budget", priority: "Critical", assigneeName: "Sophia Tan", dueDate: "Aug 9, 2026", status: "To Do", matchScore: 78, confirmed: false },
  { id: "g4", title: "Assign task leads and brief the team", priority: "Medium", assigneeName: "Ana Reyes", dueDate: "Aug 10, 2026", status: "To Do", matchScore: 91, confirmed: false },
  { id: "g5", title: "Finalize venue and logistics coordination", priority: "High", assigneeName: "Marco Dela Cruz", dueDate: "Aug 11, 2026", status: "To Do", matchScore: 85, confirmed: false },
  { id: "g6", title: "Launch promotional campaign", priority: "Medium", assigneeName: "Sophia Tan", dueDate: "Aug 12, 2026", status: "To Do", matchScore: 68, confirmed: false },
  { id: "g7", title: "Conduct volunteer orientation", priority: "Low", assigneeName: "Ana Reyes", dueDate: "Aug 13, 2026", status: "To Do", matchScore: 72, confirmed: false },
  { id: "g8", title: "Post-event evaluation and report", priority: "Medium", assigneeName: "Marco Dela Cruz", dueDate: "Aug 15, 2026", status: "To Do", matchScore: 88, confirmed: false }
];

const STATUS_OPTIONS: TaskStatus[] = ["To Do", "In Progress", "In Review", "Completed"];

type AtomizerFormProps = {
  events: Event[];
};

export function AtomizerForm({ events }: AtomizerFormProps) {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("To Do");
  const [goalDescription, setGoalDescription] = useState("");
  const [isAtomizing, setIsAtomizing] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [tasks, setTasks] = useState<GeneratedTask[]>([]);

  async function handleAtomize() {
    if (!goalDescription.trim()) return;
    setIsAtomizing(true);
    setGeneratedTasks([]);
    // Simulate AI latency
    await new Promise((r) => setTimeout(r, 1600));
    const seeded = MOCK_GENERATED.map((t) => ({ ...t, status: defaultStatus, confirmed: false }));
    setGeneratedTasks(seeded);
    setTasks(seeded);
    setIsAtomizing(false);
  }

  function confirmTask(id: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, confirmed: true } : t)));
  }

  function editTask(id: string) {
    // placeholder — would open inline editing
    console.log("edit", id);
  }

  const confirmedCount = tasks.filter((t) => t.confirmed).length;
  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow">
          <Zap size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">AI Task Atomizer</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
              <Zap size={10} />
              AI Powered
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Describe an event or task goal and the AI will break it into specific, actionable tasks with suggested assignees, deadlines, and priorities.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Target Event */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Target Event <span className="text-rose-500">*</span>
              </label>
              <button type="button" className="text-xs font-medium text-blue-600 hover:underline">+ Create from Description</button>
            </div>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({ev.status})
                </option>
              ))}
            </select>
          </div>

          {/* Default Task Status */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Default Task Status</label>
              <button type="button" className="text-xs font-medium text-slate-400 hover:text-slate-600">⚙ Manage</button>
            </div>
            <select
              value={defaultStatus}
              onChange={(e) => setDefaultStatus(e.target.value as TaskStatus)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Goal description */}
        <div className="mt-5">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Goal Description
          </label>
          <textarea
            value={goalDescription}
            onChange={(e) => setGoalDescription(e.target.value)}
            placeholder='e.g. "Organize a campus-wide culture week with booths, performances, and food stalls for 500+ attendees."'
            rows={4}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* Atomize button */}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleAtomize}
            disabled={isAtomizing || !goalDescription.trim()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAtomizing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Zap size={16} />
            )}
            {isAtomizing ? "Atomizing…" : "Atomize"}
          </button>

          {generatedTasks.length > 0 && !isAtomizing && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 size={13} />
              {generatedTasks.length} tasks generated
            </span>
          )}
        </div>
      </div>

      {/* Work breakdown */}
      {tasks.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-3">
            <h3 className="text-sm font-bold text-slate-900">Work Breakdown</h3>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
              AI Generated
            </span>
            {selectedEvent && (
              <span className="text-xs text-slate-500">for "{selectedEvent.title}"</span>
            )}
            <span className="text-xs text-slate-400">
              · {confirmedCount} confirmed · Review each task before adding to event
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {tasks.map((task) => (
              <GeneratedTaskCard
                key={task.id}
                task={task}
                onConfirm={() => confirmTask(task.id)}
                onEdit={() => editTask(task.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Generated Task Card ───────────────────────────────────────────────────────

type GeneratedTaskCardProps = {
  task: GeneratedTask;
  onConfirm: () => void;
  onEdit: () => void;
};

function GeneratedTaskCard({ task, onConfirm, onEdit }: GeneratedTaskCardProps) {
  const pCfg = priorityConfig[task.priority];
  const scoreColor =
    task.matchScore >= 80 ? "text-emerald-600" :
    task.matchScore >= 60 ? "text-amber-600" :
    "text-rose-500";
  const scoreBar =
    task.matchScore >= 80 ? "bg-emerald-400" :
    task.matchScore >= 60 ? "bg-amber-400" :
    "bg-rose-400";

  return (
    <div className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition-all ${
      task.confirmed
        ? "border-emerald-300 ring-1 ring-emerald-200"
        : "border-amber-300 ring-1 ring-amber-100"
    }`}>
      {/* Header: Needs Review / Confirmed + priority */}
      <div className="mb-3 flex items-center justify-between">
        {task.confirmed ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <CheckCircle2 size={11} />
            Confirmed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
            <AlertTriangle size={11} />
            Needs Review
          </span>
        )}
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${pCfg.classes}`}>
          {task.priority}
        </span>
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-slate-900">{task.title}</h4>

      {/* Assignee + date */}
      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <User size={11} />
          {task.assigneeName}
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={11} />
          {task.dueDate}
        </span>
      </div>

      {/* Status row */}
      <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
        <span className="text-slate-500">Status:</span>
        <span className="font-medium text-slate-700">{task.status}</span>
      </div>

      {/* AI match score */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-slate-500">AI Match Score</span>
          <span className={`font-bold ${scoreColor}`}>{task.matchScore}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${scoreBar}`}
            style={{ width: `${task.matchScore}%` }}
          />
        </div>
      </div>

      {/* Action buttons */}
      {!task.confirmed && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  );
}
