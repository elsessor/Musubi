"use client";

import { Check, ChevronDown, Loader2, SlidersHorizontal, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AddCustomStatusModal } from "./AddCustomStatusModal";
import { SubtaskReviewScreen } from "./SubtaskReviewScreen";
import type { Event, GoalDraft, Subtask, Task, TaskStatus } from "./types";
import type { CustomStatusConfig, StatusThemeColor } from "./statusUtils";
import { atomizeGoal } from "@/services/auth.service";
import { delegateSubtasksHeuristically } from "@/utils/heuristicDelegation";
import type { OrganizationMember } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";

const DEFAULT_STATUS_LIST: TaskStatus[] = ["To Do", "In Progress", "In Review", "Completed"];

function ModernStatusDropdown({
  value,
  onChange,
  options
}: {
  value: string;
  onChange: (val: TaskStatus) => void;
  options: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "To Do":
        return { bg: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" };
      case "In Progress":
        return { bg: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" };
      case "In Review":
        return { bg: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" };
      case "Completed":
        return { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
      default:
        return { bg: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" };
    }
  };

  const activeBadge = getStatusBadge(value);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-11 w-full items-center justify-between rounded-2xl border border-slate-200/80 bg-[#F0F4F8] px-4 text-sm font-semibold text-slate-800 shadow-xs transition-all hover:border-blue-300 hover:bg-white focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
      >
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${activeBadge.bg}`}>
            <span className={`size-1.5 rounded-full ${activeBadge.dot}`} />
            {value}
          </span>
        </div>
        <ChevronDown className={`size-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-2xl border border-slate-200/90 bg-white/95 py-1.5 shadow-xl shadow-slate-900/10 backdrop-blur-md transition-all">
          {options.map((status) => {
            const badge = getStatusBadge(status);
            const isSelected = value === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => {
                  onChange(status as TaskStatus);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm font-semibold transition ${
                  isSelected
                    ? "bg-blue-50/80 text-blue-900 font-bold"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${badge.bg}`}>
                    <span className={`size-1.5 rounded-full ${badge.dot}`} />
                    {status}
                  </span>
                </div>
                {isSelected && <Check className="size-4 text-blue-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ModernEventDropdown({
  events,
  value,
  onChange
}: {
  events: Event[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedEvent = events.find((e) => e.id === value);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-11 w-full items-center justify-between rounded-2xl border border-slate-200/80 bg-[#F0F4F8] px-4 text-sm font-semibold text-slate-800 shadow-xs transition-all hover:border-blue-300 hover:bg-white focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
      >
        <span className="truncate">
          {selectedEvent ? `${selectedEvent.title} (${selectedEvent.status || "Planning"})` : "— Select an event —"}
        </span>
        <ChevronDown className={`size-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-2xl border border-slate-200/90 bg-white/95 py-1.5 shadow-xl shadow-slate-900/10 backdrop-blur-md transition-all">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm font-medium transition ${
              !value ? "bg-blue-50/80 font-bold text-blue-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <span>— Select an event —</span>
            {!value && <Check className="size-4 text-blue-600" />}
          </button>
          {events.map((ev) => {
            const isSelected = value === ev.id;
            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => {
                  onChange(ev.id);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition ${
                  isSelected
                    ? "bg-blue-50/80 font-bold text-blue-900"
                    : "text-slate-700 font-semibold hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate">{ev.title}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                    {ev.status || "Planning"}
                  </span>
                </div>
                {isSelected && <Check className="size-4 shrink-0 text-blue-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type AtomizerFormProps = {
  events: Event[];
  members?: OrganizationMember[];
  onPublishGoalTasks?: (
    targetEventId: string,
    publishedTasks: Task[],
    newEventDetails?: { title: string; description: string }
  ) => void;
};

export function AtomizerForm({ events, members = [], onPublishGoalTasks }: AtomizerFormProps) {
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [isCreateFromDescription, setIsCreateFromDescription] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("To Do");
  const [goalDescription, setGoalDescription] = useState("");
  const [isAtomizing, setIsAtomizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeGoalDraft, setActiveGoalDraft] = useState<GoalDraft | null>(null);

  // Manage Statuses Modal State
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [customStatuses, setCustomStatuses] = useState<CustomStatusConfig[]>([]);
  const [statusOrder, setStatusOrder] = useState<string[]>(DEFAULT_STATUS_LIST);

  function handleAddStatus(name: string, color: StatusThemeColor, insertIndex?: number) {
    const newConfig: CustomStatusConfig = { name, color };
    setCustomStatuses((prev) => [...prev, newConfig]);
    setStatusOrder((prev) => {
      const idx = typeof insertIndex === "number" ? insertIndex : prev.length;
      const copy = [...prev];
      copy.splice(idx, 0, name);
      return copy;
    });
  }

  function handleReorderStatusOrder(newOrder: string[]) {
    setStatusOrder(newOrder);
  }

  function handleDeleteStatus(name: string) {
    setCustomStatuses((prev) => prev.filter((s) => s.name !== name));
    setStatusOrder((prev) => prev.filter((s) => s !== name));
  }

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
      const eventName = isCreateFromDescription
        ? "New Event from Atomizer"
        : selectedEvent
          ? selectedEvent.title
          : "Culture Week";

      const data = await atomizeGoal(firebaseUser, {
        eventName,
        goalDescription: goalDescription.trim(),
        defaultStatus
      });

      const rawSubtasks: Subtask[] = data.tasks.map((item, idx) => ({
        id: `subtask-ai-${Date.now()}-${idx}`,
        title: item.title,
        description: `Actionable subtask breakdown for ${eventName}. Priority: ${item.priority}.`,
        assigneeName: item.assigneeName || "",
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

      // Heuristically delegate subtasks to organization members with matching skills
      const delegatedSubtasks = members && members.length > 0
        ? delegateSubtasksHeuristically(rawSubtasks, members)
        : rawSubtasks;

      const draft: GoalDraft = {
        id: `draft-${Date.now()}`,
        eventName,
        description: goalDescription.trim(),
        status: "Draft",
        subtasks: delegatedSubtasks,
        generationSource: "ai"
      };

      setActiveGoalDraft(draft);
    } catch (err: unknown) {
      console.error("[Atomizer] Error running Genkit flow:", err);
      const rawMsg = err instanceof Error ? err.message : "Failed to atomize goal using Genkit AI.";
      if (rawMsg.includes("429") || rawMsg.includes("quota") || rawMsg.includes("Too Many Requests")) {
        setErrorMsg("Gemini API rate limit reached (5 requests/min on Free Tier). Please wait ~30 seconds before trying again.");
      } else {
        setErrorMsg(rawMsg);
      }
    } finally {
      setIsAtomizing(false);
    }
  }

  // If a goal draft is active, show SubtaskReviewScreen.
  if (activeGoalDraft) {
    return (
      <SubtaskReviewScreen
        goalDraft={activeGoalDraft}
        members={members}
        onBack={() => setActiveGoalDraft(null)}
        onPublishGoal={(publishedGoal) => {
          setActiveGoalDraft(publishedGoal);
          const targetId = isCreateFromDescription
            ? "CREATE_NEW"
            : selectedEventId || events[0]?.id || "culture-week";
          const publishedTasks: Task[] = publishedGoal.subtasks.map((st) => ({
            id: st.id,
            title: st.title,
            description: st.description,
            status: st.status || "To Do",
            priority: st.priority,
            dueDate: "Aug 30",
            assignee: {
              initials: st.assigneeName && st.assigneeName !== "Unassigned" ? st.assigneeName.split(" ").map((n) => n[0]).join("") : "UA",
              color: "bg-[#1e3a5f]",
              name: st.assigneeName || "Unassigned"
            },
            requiredSkills: st.requiredSkills,
            isLeaderOnly: st.isLeaderOnly,
            isAiGenerated: st.isAiGenerated
          }));

          if (onPublishGoalTasks) {
            onPublishGoalTasks(
              targetId,
              publishedTasks,
              isCreateFromDescription
                ? { title: "New Event from Atomizer", description: goalDescription }
                : undefined
            );
          }
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
              <button
                type="button"
                onClick={() => setIsCreateFromDescription((prev) => !prev)}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                {isCreateFromDescription ? "Select Existing Event" : "+ Create from Description"}
              </button>
            </div>
            {isCreateFromDescription ? (
              <div className="w-full rounded-2xl border border-slate-200/60 bg-[#F0F4F8] px-4 py-2.5 text-sm text-slate-800">
                New Event from Atomizer (Planning)
              </div>
            ) : (
              <ModernEventDropdown
                events={events}
                value={selectedEventId}
                onChange={setSelectedEventId}
              />
            )}
          </div>

          {/* Default Task Status */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                Default Task Status
              </label>
              <button
                type="button"
                onClick={() => setIsManageModalOpen(true)}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
              >
                <SlidersHorizontal size={13} />
                Manage
              </button>
            </div>
            <ModernStatusDropdown
              value={defaultStatus}
              onChange={setDefaultStatus}
              options={statusOrder}
            />
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

      {/* Manage Task Statuses Modal */}
      <AddCustomStatusModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        type="task"
        customStatuses={customStatuses}
        statusOrder={statusOrder}
        defaultStatuses={DEFAULT_STATUS_LIST}
        onAddStatus={handleAddStatus}
        onReorderStatusOrder={handleReorderStatusOrder}
        onDeleteStatus={handleDeleteStatus}
      />
    </div>
  );
}
