"use client";

import { AlertTriangle, Calendar, CheckCircle2, Loader2, RefreshCw, ShieldAlert, SlidersHorizontal, User, Wrench, Zap } from "lucide-react";
import { useState } from "react";
import { AIFallbackScreen } from "./AIFallbackScreen";
import { SubtaskReviewScreen } from "./SubtaskReviewScreen";
import type { Event, GoalDraft, StarterTemplate, Subtask, TaskPriority, TaskStatus } from "./types";
import { atomizeGoal } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";

const STATUS_OPTIONS: TaskStatus[] = ["To Do", "In Progress", "In Review", "Completed"];

type AtomizerFormProps = {
  events: Event[];
};

export function AtomizerForm({ events }: AtomizerFormProps) {
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("To Do");
  const [goalDescription, setGoalDescription] = useState("");
  const [isAtomizing, setIsAtomizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeGoalDraft, setActiveGoalDraft] = useState<GoalDraft | null>(null);

  // MSB-FE-014: AI Fallback & Error State state
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackError, setFallbackError] = useState("");
  const [retryCount, setRetryCount] = useState(3);

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
        subtasks: generatedSubtasks,
        generationSource: "ai"
      };

      setActiveGoalDraft(draft);
    } catch (err: unknown) {
      console.error("[Atomizer] Error running Genkit flow:", err);
      const msg = err instanceof Error ? err.message : "Failed to atomize goal using Genkit AI.";
      setFallbackError(msg);
      setShowFallback(true);
    } finally {
      setIsAtomizing(false);
    }
  }

  function handleSimulateFailure() {
    const selectedEvent = events.find((e) => e.id === selectedEventId);
    const eventName = selectedEvent ? selectedEvent.title : "Campus Culture Week";

    setFallbackError("Genkit AI Gateway timeout after 3 exhausted attempts (504 Gateway Timeout). Semantic Fallback Safeguard automatically triggered.");
    setRetryCount(3);
    setShowFallback(true);
  }

  function handleSimulateMalformedOutput() {
    const selectedEvent = events.find((e) => e.id === selectedEventId);
    const eventName = selectedEvent ? selectedEvent.title : "Campus Culture Week";

    const malformedSubtasks: Subtask[] = [
      {
        id: `st-mal-1`,
        title: "Book", // < 5 chars title warning
        description: "Reserve venue.", // < 10 chars description warning
        assigneeName: "", // Unassigned warning
        requiredSkills: [], // Missing skills warning
        estimatedDays: 2,
        isLeaderOnly: false,
        isAiGenerated: true,
        aiMetadata: { confidenceScore: 52 }, // Low AI confidence <70% warning
        priority: "High",
        status: "To Do"
      },
      {
        id: `st-mal-2`,
        title: "Process Budget & Financial Honorarium Payments",
        description: "Handle Cash disbursement and legal contract sign-offs for guest performers.",
        assigneeName: "Beatrice Lim",
        requiredSkills: ["Finance"],
        estimatedDays: 4,
        isLeaderOnly: false, // Governance warning: sensitive keywords without leader restriction
        isAiGenerated: true,
        aiMetadata: { confidenceScore: 68 }, // Low confidence warning
        priority: "Critical",
        status: "To Do"
      },
      {
        id: `st-mal-3`,
        title: "Setup Publicity Posters & Campus Social Media Banners",
        description: "Design promotional graphics, print flyers, and post event announcements on Instagram.",
        assigneeName: "Marco Dela Cruz",
        requiredSkills: ["Graphics", "Promotions"],
        estimatedDays: 3,
        isLeaderOnly: false,
        isAiGenerated: true,
        aiMetadata: { confidenceScore: 92 },
        priority: "Medium",
        status: "To Do"
      }
    ];

    setActiveGoalDraft({
      id: `draft-malformed-${Date.now()}`,
      eventName,
      description: goalDescription.trim() || "Simulated malformed AI breakdown response for validation testing.",
      status: "Draft",
      subtasks: malformedSubtasks,
      generationSource: "ai"
    });
  }

  function handleSelectStarterTemplate(template: StarterTemplate) {
    const selectedEvent = events.find((e) => e.id === selectedEventId);
    const eventName = selectedEvent ? selectedEvent.title : "Campus Event";

    const loadedSubtasks: Subtask[] = template.subtasks.map((st, idx) => ({
      ...st,
      id: `subtask-tpl-${Date.now()}-${idx}`
    }));

    setActiveGoalDraft({
      id: `draft-tpl-${Date.now()}`,
      eventName,
      description: goalDescription.trim() || template.description,
      status: "Draft",
      subtasks: loadedSubtasks,
      generationSource: "template"
    });

    setShowFallback(false);
  }

  function handleStartFromScratch() {
    const selectedEvent = events.find((e) => e.id === selectedEventId);
    const eventName = selectedEvent ? selectedEvent.title : "Campus Event";

    setActiveGoalDraft({
      id: `draft-manual-${Date.now()}`,
      eventName,
      description: goalDescription.trim() || "Manual Goal Breakdown Workspace",
      status: "Draft",
      subtasks: [],
      generationSource: "manual"
    });

    setShowFallback(false);
  }

  // 1. Show Fallback Failure Screen if AI generation fails or is triggered
  if (showFallback) {
    const selectedEvent = events.find((e) => e.id === selectedEventId);
    const eventName = selectedEvent ? selectedEvent.title : "Campus Culture Week";

    return (
      <AIFallbackScreen
        eventName={eventName}
        goalDescription={goalDescription}
        errorMessage={fallbackError}
        retryCount={retryCount}
        onSelectTemplate={handleSelectStarterTemplate}
        onStartFromScratch={handleStartFromScratch}
        onRetryGeneration={() => {
          setShowFallback(false);
          void handleAtomize();
        }}
        onBackToForm={() => setShowFallback(false)}
      />
    );
  }

  // 2. If a goal draft is active, show SubtaskReviewScreen
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
    <div className="flex flex-col gap-6">
      {/* Unified Main Card Container */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        {/* Header Section */}
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100/70 text-blue-500">
            <Zap size={18} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">AI Task Atomizer</h2>
              <span className="inline-flex items-center rounded-full bg-blue-100/70 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600">
                AI Powered
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                Fallback Safeguard Active
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
              <button type="button" className="text-xs font-medium text-blue-600 hover:underline">
                + Create from Description
              </button>
            </div>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200/60 bg-[#F0F4F8] px-4 py-2.5 text-sm text-slate-700 transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">— Select an event —</option>
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
          <div className="mt-3 rounded-2xl bg-rose-50 p-4 text-xs font-semibold text-rose-600 border border-rose-200">
            {errorMsg}
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleAtomize}
            disabled={isAtomizing || !goalDescription.trim()}
            className="flex items-center gap-2 rounded-2xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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
