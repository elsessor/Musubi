"use client";

import { AlertTriangle, Calendar, CheckCircle2, Loader2, Sparkles, User, Zap } from "lucide-react";
import { useState } from "react";
import { SubtaskReviewScreen } from "./SubtaskReviewScreen";
import type { Event, GoalDraft, Subtask, TaskPriority, TaskStatus } from "./types";
import { atomizeGoal } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";

const priorityConfig: Record<TaskPriority, { classes: string }> = {
  Low: { classes: "bg-[#f1f5f9] text-[#475569]" },
  Medium: { classes: "bg-[#dbeafe] text-[#1d4ed8]" },
  High: { classes: "bg-[#ffedd5] text-[#c2410c]" },
  Critical: { classes: "bg-[#ffe4e6] text-[#e11d48]" }
};

const STATUS_OPTIONS: TaskStatus[] = ["To Do", "In Progress", "In Review", "Completed"];

type AtomizerFormProps = {
  events: Event[];
};

export function AtomizerForm({ events }: AtomizerFormProps) {
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("To Do");
  const [goalDescription, setGoalDescription] = useState("");
  const [isAtomizing, setIsAtomizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeGoalDraft, setActiveGoalDraft] = useState<GoalDraft | null>(null);

  async function handleAtomize() {
    if (!goalDescription.trim()) return;
    if (!firebaseUser) {
      setErrorMsg("Your session has expired. Please sign in again.");
      return;
    }

    setIsAtomizing(true);
    setErrorMsg("");

    try {
      const selectedEvent = events.find((e) => e.id === selectedEventId);
      const eventName = selectedEvent ? selectedEvent.title : "Culture Week";

      const data = await atomizeGoal(firebaseUser, {
        eventName,
        goalDescription: goalDescription.trim(),
        defaultStatus
      });

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
        subtasks: generatedSubtasks
      };

      setActiveGoalDraft(draft);
    } catch (err: unknown) {
      console.error("[Atomizer] Error running Genkit flow:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to atomize goal using Genkit AI.");
    } finally {
      setIsAtomizing(false);
    }
  }

  function handleDemoReview() {
    const selectedEvent = events.find((e) => e.id === selectedEventId);
    const eventName = selectedEvent ? selectedEvent.title : "Culture Week";

    const demoSubtasks: Subtask[] = [
      {
        id: "st-demo-1",
        title: "Book venue and secure event permits",
        description: "Reserve main campus hall, obtain safety clearance, and secure sound permits.",
        assigneeName: "Luis Garcia",
        requiredSkills: ["Logistics", "Permits", "Administration"],
        estimatedDays: 4,
        isLeaderOnly: true,
        isAiGenerated: true,
        aiMetadata: { confidenceScore: 95 },
        priority: "High"
      },
      {
        id: "st-demo-2",
        title: "Design promotional materials and social assets",
        description: "Create publicity banners, social media cards, and campus flyers.",
        assigneeName: "Beatrice Lim",
        requiredSkills: ["Graphics Design", "Marketing"],
        estimatedDays: 3,
        isLeaderOnly: false,
        isAiGenerated: true,
        aiMetadata: { confidenceScore: 76 },
        priority: "Medium"
      },
      {
        id: "st-demo-3",
        title: "Set up online registration and ticketing",
        description: "Configure participant sign-up forms, pass distribution, and QR check-in.",
        assigneeName: "Marco Dela Cruz",
        requiredSkills: ["Tech Support", "Registration"],
        estimatedDays: 2,
        isLeaderOnly: false,
        isAiGenerated: true,
        aiMetadata: { confidenceScore: 88 },
        priority: "High"
      },
      {
        id: "st-demo-4",
        title: "Coordinate department booth sign-ups",
        description: "Organize booth assignments, power outlets, and table requisitions.",
        assigneeName: "Ana Reyes",
        requiredSkills: ["Coordination", "Vendor Mgmt"],
        estimatedDays: 3,
        isLeaderOnly: true,
        isAiGenerated: false,
        priority: "Medium"
      }
    ];

    setActiveGoalDraft({
      id: `draft-demo-${Date.now()}`,
      eventName,
      description: goalDescription.trim() || "Organize campus culture week with booth sign-ups and performances.",
      status: "Draft",
      subtasks: demoSubtasks
    });
  }

  // If a goal draft is active, show SubtaskReviewScreen in Old UI style
  if (activeGoalDraft) {
    return (
      <SubtaskReviewScreen
        goalDraft={activeGoalDraft}
        onBack={() => setActiveGoalDraft(null)}
        onPublishGoal={(publishedGoal) => {
          setActiveGoalDraft(publishedGoal);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 bg-[#f4f7fb] p-6 rounded-3xl min-h-screen">
      {/* Header */}
      <div className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
          <Zap size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">AI Task Atomizer</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-xs font-bold text-[#d97706]">
              <Zap size={10} />
              AI Powered
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Describe an event macro-goal and Genkit AI will generate subtask recommendations. Leaders review, edit, add, or publish subtasks.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Target Event */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Target Event <span className="text-rose-500">*</span>
              </label>
            </div>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-400 focus:outline-none"
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
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Default Task Status
              </label>
            </div>
            <select
              value={defaultStatus}
              onChange={(e) => setDefaultStatus(e.target.value as TaskStatus)}
              className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-400 focus:outline-none"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Goal description */}
        <div className="mt-5">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Goal Description
          </label>
          <textarea
            value={goalDescription}
            onChange={(e) => setGoalDescription(e.target.value)}
            placeholder='e.g. "Organize a campus-wide culture week with booths, performances, and food stalls for 500+ attendees."'
            rows={4}
            className="w-full resize-none rounded-2xl border border-slate-200 bg-[#f8fafc] p-4 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-400 focus:outline-none"
          />
        </div>

        {errorMsg && (
          <div className="mt-3 rounded-2xl bg-rose-50 p-4 text-xs font-semibold text-rose-600 border border-rose-200">
            {errorMsg}
          </div>
        )}

        {/* Atomize & Demo buttons */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleAtomize}
            disabled={isAtomizing || !goalDescription.trim()}
            className="flex items-center gap-2 rounded-2xl bg-[#1e3a5f] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#152943] disabled:opacity-60"
          >
            {isAtomizing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Zap size={16} />
            )}
            {isAtomizing ? "Atomizing with Genkit..." : "Atomize Goal with AI"}
          </button>
        </div>
      </div>
    </div>
  );
}
