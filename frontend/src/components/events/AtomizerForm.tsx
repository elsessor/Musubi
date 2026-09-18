"use client";

<<<<<<< HEAD
import { Loader2, SlidersHorizontal, Zap } from "lucide-react";
import { useState } from "react";
import { SubtaskReviewScreen } from "./SubtaskReviewScreen";
import type { Event, GoalDraft, Subtask, Task, TaskStatus } from "./types";
import { atomizeGoal } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";

=======
import { AlertTriangle, Calendar, CheckCircle2, Loader2, SlidersHorizontal, User, Zap } from "lucide-react";
import { useState } from "react";
import type { Event, GeneratedTask, TaskPriority, TaskStatus } from "./types";
import { atomizeGoal } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";

import { createEventFirestore } from "@/services/events.service";

const priorityConfig: Record<TaskPriority, { classes: string }> = {
  Low:      { classes: "bg-slate-100 text-slate-600 ring-slate-200" },
  Medium:   { classes: "bg-blue-50 text-blue-600 ring-blue-200" },
  High:     { classes: "bg-amber-50 text-amber-700 ring-amber-200" },
  Critical: { classes: "bg-rose-50 text-rose-600 ring-rose-200" }
};

>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
const STATUS_OPTIONS: TaskStatus[] = ["To Do", "In Progress", "In Review", "Completed"];

type AtomizerFormProps = {
  events: Event[];
<<<<<<< HEAD
  onPublishGoalTasks?: (targetEventId: string, publishedTasks: Task[]) => void;
};

export function AtomizerForm({ events, onPublishGoalTasks }: AtomizerFormProps) {
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
=======
};

export function AtomizerForm({ events }: AtomizerFormProps) {
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const profile = useAuthStore((state) => state.profile);
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
  const [selectedEventId, setSelectedEventId] = useState("");
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("To Do");
  const [goalDescription, setGoalDescription] = useState("");
  const [isAtomizing, setIsAtomizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
<<<<<<< HEAD
  const [activeGoalDraft, setActiveGoalDraft] = useState<GoalDraft | null>(null);
=======
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [tasks, setTasks] = useState<GeneratedTask[]>([]);
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322

  async function handleAtomize() {
    if (!goalDescription.trim()) return;
    if (!firebaseUser) {
      setErrorMsg("Your session has expired. Please sign in again.");
      return;
    }

    setIsAtomizing(true);
    setErrorMsg("");
<<<<<<< HEAD

    try {
      const selectedEvent = events.find((e) => e.id === selectedEventId);
      const eventName = selectedEvent ? selectedEvent.title : "Culture Week";
=======
    setGeneratedTasks([]);

    try {
      const selectedEvent = events.find((e) => e.id === selectedEventId);
      const eventName = selectedEvent
        ? selectedEvent.title
        : selectedEventId === "new-event-atomizer"
        ? "New Event from Atomizer"
        : "Event Goal";
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322

      const data = await atomizeGoal(firebaseUser, {
        eventName,
        goalDescription: goalDescription.trim(),
        defaultStatus
      });

<<<<<<< HEAD
      const generatedSubtasks: Subtask[] = data.tasks.map((item, idx) => ({
        id: `subtask-ai-${Date.now()}-${idx}`,
        title: item.title,
        description: `Actionable subtask breakdown for ${eventName}. Priority: ${item.priority}. Suggested lead: ${item.assigneeName}.`,
        assigneeName: item.assigneeName || (idx % 2 === 0 ? "Luis Garcia" : "Beatrice Lim"),
        requiredSkills:
          idx % 3 === 0
            ? ["Logistics", "Permits"]
            : idx % 3 === 1
              ? ["Design", "Promotions"]
              : ["Coordination", "Ticketing"],
        estimatedDays: item.dueDateOffsetDays || 3,
        isLeaderOnly: idx === 0,
        isAiGenerated: true,
        aiMetadata: { confidenceScore: item.matchScore },
        priority: item.priority,
        status: defaultStatus
      }));

      const draft: GoalDraft = {
        id: `draft-${Date.now()}`,
        eventName,
        description: goalDescription.trim(),
        status: "Draft",
        subtasks: generatedSubtasks,
        generationSource: "ai"
      };

      setActiveGoalDraft(draft);
=======
      const today = new Date();
      const formattedTasks: GeneratedTask[] = data.tasks.map((item, idx) => {
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + (item.dueDateOffsetDays || 3));
        const dateStr = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(dueDate);

        return {
          id: `gen-${Date.now()}-${idx}`,
          title: item.title,
          priority: item.priority,
          assigneeName: item.assigneeName,
          dueDate: dateStr,
          status: defaultStatus,
          matchScore: item.matchScore,
          confirmed: false
        };
      });

      setGeneratedTasks(formattedTasks);
      setTasks(formattedTasks);

      // Save new event to Firestore if creating from atomizer
      if (selectedEventId === "new-event-atomizer" && profile?.organizationId) {
        const eventTitle = goalDescription.trim()
          ? goalDescription.trim().length > 35
            ? `${goalDescription.trim().slice(0, 35)}...`
            : goalDescription.trim()
          : "New Event from Atomizer";

        void createEventFirestore(firebaseUser, profile.organizationId, {
          title: eventTitle,
          description: goalDescription.trim(),
          status: "Planning",
          startDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          endDate: new Date(Date.now() + 14 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          memberCount: 1,
          progress: 0,
          tasks: formattedTasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate,
            assignee: { initials: t.assigneeName.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "AI", color: "bg-blue-500" }
          }))
        });
      }
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
    } catch (err: unknown) {
      console.error("[Atomizer] Error running Genkit flow:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to atomize goal using Genkit AI.");
    } finally {
      setIsAtomizing(false);
    }
  }
<<<<<<< HEAD
  // If a goal draft is active, show SubtaskReviewScreen.
  if (activeGoalDraft) {
    return (
      <SubtaskReviewScreen
        goalDraft={activeGoalDraft}
        onBack={() => setActiveGoalDraft(null)}
        onPublishGoal={(publishedGoal) => {
          setActiveGoalDraft(publishedGoal);
          const targetId = selectedEventId || events[0]?.id || "culture-week";
          const publishedTasks: Task[] = publishedGoal.subtasks.map((st) => ({
            id: st.id,
            title: st.title,
            description: st.description,
            status: st.status || "To Do",
            priority: st.priority,
            dueDate: "Aug 30",
            assignee: {
              initials: st.assigneeName ? st.assigneeName.split(" ").map((n) => n[0]).join("") : "LG",
              color: "bg-[#1e3a5f]",
              name: st.assigneeName || "Luis Garcia"
            },
            requiredSkills: st.requiredSkills,
            isLeaderOnly: st.isLeaderOnly,
            isAiGenerated: st.isAiGenerated
          }));

          if (onPublishGoalTasks) {
            onPublishGoalTasks(targetId, publishedTasks);
          }
        }}
      />
    );
  }

=======

  function confirmTask(id: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, confirmed: true } : t)));
  }

  function editTask(id: string) {
    console.log("edit task", id);
  }

  const confirmedCount = tasks.filter((t) => t.confirmed).length;
  const selectedEvent = events.find((e) => e.id === selectedEventId);

>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
  return (
    <div className="flex flex-col gap-6">
      {/* Unified Main Card Container */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        {/* Header Section */}
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100/70 text-blue-500">
            <Zap size={18} />
          </div>
<<<<<<< HEAD
          <div className="flex-1">
=======
          <div>
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">AI Task Atomizer</h2>
              <span className="inline-flex items-center rounded-full bg-blue-100/70 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600">
                AI Powered
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Describe an event or task goal and the AI will break it into specific, actionable tasks with suggested assignees, deadlines, and priorities.
            </p>
          </div>
        </div>

        {/* Form Controls */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Target Event */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                Target Event <span className="text-rose-500">*</span>
              </label>
<<<<<<< HEAD
              <button type="button" className="text-xs font-medium text-blue-600 hover:underline">
=======
              <button
                type="button"
                onClick={() => setSelectedEventId("new-event-atomizer")}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
                + Create from Description
              </button>
            </div>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200/60 bg-[#F0F4F8] px-4 py-2.5 text-sm text-slate-700 transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">— Select an event —</option>
<<<<<<< HEAD
=======
              <option value="new-event-atomizer">New Event from Atomizer (Planning)</option>
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({ev.status})
                </option>
              ))}
            </select>
          </div>

          {/* Default Task Status */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                Default Task Status
              </label>
              <button type="button" className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
                <SlidersHorizontal size={13} />
                Manage
              </button>
            </div>
            <select
              value={defaultStatus}
              onChange={(e) => setDefaultStatus(e.target.value as TaskStatus)}
              className="w-full rounded-2xl border border-slate-200/60 bg-[#F0F4F8] px-4 py-2.5 text-sm text-slate-700 transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Goal description */}
        <div className="mt-5">
          <label className="mb-2 block text-[11px] font-bold tracking-wider uppercase text-slate-400">
            Goal Description
          </label>
          <textarea
            value={goalDescription}
            onChange={(e) => setGoalDescription(e.target.value)}
            placeholder='e.g. "Organize a campus-wide culture week celebration across all departments"'
            rows={4}
            className="w-full resize-none rounded-2xl border border-slate-200/60 bg-[#F0F4F8] p-4 text-sm text-slate-700 placeholder:text-slate-400 transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {errorMsg && (
<<<<<<< HEAD
          <div className="mt-3 rounded-2xl bg-rose-50 p-4 text-xs font-semibold text-rose-600 border border-rose-200">
=======
          <div className="mt-3 rounded-xl bg-rose-50 px-4 py-2.5 text-xs text-rose-600 border border-rose-200">
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
            {errorMsg}
          </div>
        )}

<<<<<<< HEAD
        {/* Action Controls */}
        <div className="mt-6 flex items-center gap-3">
=======
        {/* Atomize button */}
        <div className="mt-5 flex items-center gap-3">
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
          <button
            type="button"
            onClick={handleAtomize}
            disabled={isAtomizing || !goalDescription.trim()}
<<<<<<< HEAD
            className="flex items-center gap-2 rounded-2xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
=======
            className="flex items-center gap-2 rounded-2xl bg-blue-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
          >
            {isAtomizing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Zap size={16} />
            )}
<<<<<<< HEAD
            {isAtomizing ? "Atomizing with Genkit..." : "Atomize Goal with AI"}
          </button>
        </div>
      </div>
=======
            {isAtomizing ? "Atomizing with Genkit..." : "Atomize"}
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
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
    </div>
  );
}
