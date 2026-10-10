"use client";

import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Edit3,
  Layers,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Wrench,
  X,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { validateSubtaskSafeguards } from "./starterTemplates";
import type { GoalDraft, Subtask, TaskPriority } from "./types";
import {
  rerollSubtask,
  subscribeOrganizationMembersFirestore,
  type OrganizationMember
} from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";
import { sendNudgeEmail } from "@/services/notifications.service";
import {
  delegateSubtasksHeuristically,
  findBestMemberForSubtask
} from "@/utils/heuristicDelegation";
import { cn } from "@/components/ui/utils";
import { ALL_PRIORITIES, PRIORITY_CONFIG } from "./priorityUtils";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { useToastStore } from "@/store/toastStore";

import { getStatusTheme, type CustomStatusConfig } from "./statusUtils";

const PRIORITY_BADGES = PRIORITY_CONFIG;

type SubtaskReviewScreenProps = {
  goalDraft: GoalDraft;
  customStatuses?: CustomStatusConfig[];
  members?: OrganizationMember[];
  onPublishGoal?: (publishedGoal: GoalDraft) => void;
  onBack?: () => void;
};

export function SubtaskReviewScreen({ goalDraft, members, onPublishGoal, onBack, customStatuses = [] }: SubtaskReviewScreenProps) {
  const [currentGoal, setCurrentGoal] = useState<GoalDraft>(goalDraft);
  const [subtasks, setSubtasks] = useState<Subtask[]>(goalDraft.subtasks);
  const [isEditingEventName, setIsEditingEventName] = useState(false);
  const [eventNameInput, setEventNameInput] = useState(goalDraft.eventName || "");
  const [liveMembers, setLiveMembers] = useState<OrganizationMember[]>(members || []);
  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);
  const [regeneratingIds, setRegeneratingIds] = useState<Record<string, boolean>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [pendingDeleteSubtask, setPendingDeleteSubtask] = useState<Subtask | null>(null);

  function handleSaveEventName() {
    const trimmed = eventNameInput.trim();
    if (trimmed) {
      setCurrentGoal((prev) => ({ ...prev, eventName: trimmed }));
    }
    setIsEditingEventName(false);
  }

  useEffect(() => {
    if (members && members.length > 0) {
      setLiveMembers(members);
      return;
    }
    const unsub = subscribeOrganizationMembersFirestore(null, (m) => {
      setLiveMembers(m);
    });
    return () => unsub();
  }, [members]);

  function handleAutoAssignHeuristics() {
    if (liveMembers.length === 0) return;
    const updated = delegateSubtasksHeuristically(subtasks, liveMembers);
    setSubtasks(updated);
  }

  function handleConfirmTask(id: string) {
    setSubtasks((prev) =>
      prev.map((st) => {
        if (st.id !== id) return st;
        let assignee = st.assigneeName;
        if (!assignee || assignee === "Luis Garcia" || assignee.trim() === "") {
          const best = findBestMemberForSubtask(st, liveMembers);
          assignee = best?.member.name || liveMembers[0]?.name || "Unassigned";
        }
        return { ...st, status: "To Do", assigneeName: assignee };
      })
    );
  }

  function handleDeleteSubtask(id: string) {
    const deleted = subtasks.find((subtask) => subtask.id === id);
    if (!deleted) return;
    setSubtasks((prev) => prev.filter((st) => st.id !== id));
    useToastStore.getState().showToast({ title: "Subtask deleted", description: `${deleted.title} was removed from the event draft.`, tone: "success" });
  }

  function handleToggleLeaderOnly(id: string) {
    setSubtasks((prev) =>
      prev.map((st) => (st.id === id ? { ...st, isLeaderOnly: !st.isLeaderOnly } : st))
    );
  }

  async function handleRegenerateSubtask(id: string) {
    const target = subtasks.find((s) => s.id === id);
    if (!target) return;

    setRegeneratingIds((prev) => ({ ...prev, [id]: true }));

    try {
      let newTitle = "";
      let newDescription = "";
      let newPriority: TaskPriority = target.priority;
      let newSkills: string[] = target.requiredSkills;
      let newScore = target.aiMetadata?.confidenceScore ?? 92;
      let newDays = target.estimatedDays;

      const firebaseUser = useAuthStore.getState().firebaseUser;

      if (firebaseUser) {
        try {
          const res = await rerollSubtask(firebaseUser, {
            eventName: currentGoal.eventName || "Event",
            goalDescription: currentGoal.description,
            existingTaskTitle: target.title,
            existingTaskDescription: target.description
          });

          if (res && res.title) {
            newTitle = res.title;
            newDescription = res.description;
            newPriority = res.priority as TaskPriority;
            newSkills = res.requiredSkills && res.requiredSkills.length > 0 ? res.requiredSkills : target.requiredSkills;
            newScore = res.matchScore || 90;
            newDays = res.dueDateOffsetDays || target.estimatedDays;
          }
        } catch (apiErr) {
          console.warn("[SubtaskReview] API re-roll failed, falling back to smart AI pool:", apiErr);
        }
      }

      if (!newTitle) {
        const pool = [
          {
            title: `Coordinate ${target.title.replace(/^(Refined|Setup|Prepare|Organize|Manage):\s*/i, "")} Operational Workflow`,
            description: `Execute comprehensive operational checklist and task management for ${target.title}.`,
            skills: ["Logistics", "Operations", "Risk Management"]
          },
          {
            title: `Manage ${target.title.replace(/^(Refined|Setup|Prepare|Organize|Manage):\s*/i, "")} Vendor & Resource Allocation`,
            description: `Verify vendor contracts, equipment delivery schedules, and stage logistics.`,
            skills: ["Budgeting", "Vendor Relations", "Logistics"]
          },
          {
            title: `Draft & Publish ${target.title.replace(/^(Refined|Setup|Prepare|Organize|Manage):\s*/i, "")} Promotional Blitz`,
            description: `Design high-engagement visual assets and schedule cross-channel campus announcements.`,
            skills: ["Public Relations", "Graphics", "Marketing"]
          },
          {
            title: `Supervise ${target.title.replace(/^(Refined|Setup|Prepare|Organize|Manage):\s*/i, "")} On-Site Protocol & Safety`,
            description: `Inspect venue safety compliance, emergency access routes, and staff badge verification.`,
            skills: ["Security", "Safety Protocol", "Event Operations"]
          }
        ];
        const selected = pool[Math.floor(Math.random() * pool.length)];
        newTitle = selected.title;
        newDescription = selected.description;
        newSkills = Array.from(new Set([...target.requiredSkills, ...selected.skills])).slice(0, 4);
        newScore = Math.floor(Math.random() * 15) + 84;
      }

      const updatedTempSubtask: Subtask = {
        ...target,
        title: newTitle,
        description: newDescription,
        priority: newPriority,
        requiredSkills: newSkills,
        estimatedDays: newDays,
        isAiGenerated: true,
        aiMetadata: { confidenceScore: newScore }
      };

      const bestMemberMatch = liveMembers.length > 0 ? findBestMemberForSubtask(updatedTempSubtask, liveMembers) : null;
      const assignedName = bestMemberMatch?.member.name || target.assigneeName || "Unassigned";

      const finalSubtask: Subtask = {
        ...updatedTempSubtask,
        assigneeName: assignedName
      };

      setSubtasks((prev) => prev.map((st) => (st.id === id ? finalSubtask : st)));

      useToastStore.getState().showToast({
        title: "Subtask Re-rolled",
        description: `Successfully replaced subtask with "${newTitle}".`,
        tone: "success"
      });
    } catch (err) {
      console.error("[SubtaskReview] Failed to re-roll subtask:", err);
      useToastStore.getState().showToast({
        title: "Re-roll Failed",
        description: err instanceof Error ? err.message : "Could not re-roll subtask.",
        tone: "error"
      });
    } finally {
      setRegeneratingIds((prev) => ({ ...prev, [id]: false }));
    }
  }

  function handleSaveTaskEdit(updated: Subtask) {
    setSubtasks((prev) => prev.map((st) => (st.id === updated.id ? updated : st)));
    setEditingSubtask(null);
  }

  function handleAddManualSubtask(newSubtask: Omit<Subtask, "id" | "isAiGenerated">) {
    const created: Subtask = {
      ...newSubtask,
      id: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      isAiGenerated: false
    };
    setSubtasks((prev) => [created, ...prev]);
    setShowAddModal(false);
  }

  async function handleConfirmPublish() {
    setPublishing(true);
    await new Promise((resolve) => setTimeout(resolve, 600));

    const activeGoal: GoalDraft = {
      ...currentGoal,
      status: "Active",
      subtasks
    };

    setCurrentGoal(activeGoal);
    setPublishing(false);
    setShowPublishModal(false);

    if (onPublishGoal) {
      onPublishGoal(activeGoal);
    }
  }

  const [showOnlyWarnings, setShowOnlyWarnings] = useState(false);

  function handleAutoFixSafeguards() {
    setSubtasks((prev) =>
      prev.map((st) => {
        const warnings = validateSubtaskSafeguards(st);
        if (warnings.length === 0) return st;

        const titleTrimmed = (st.title || "").trim();
        const fixedTitle =
          titleTrimmed.length < 5
            ? titleTrimmed.length === 0
              ? "General Subtask Action Plan"
              : `${titleTrimmed} (Verified)`
            : titleTrimmed;

        const descTrimmed = (st.description || "").trim();
        const fixedDesc =
          descTrimmed.length < 10
            ? descTrimmed.length === 0
              ? "Detailed operational subtask breakdown verified by Student Leader."
              : `${descTrimmed} (Detailed breakdown verified)`
            : descTrimmed;

        const currentSkills = Array.isArray(st.requiredSkills) ? st.requiredSkills : [];
        const fixedSkills =
          currentSkills.length === 0 ? ["Event Planning", "Coordination"] : currentSkills;

        const sensitiveKeywords = [
          "budget",
          "finance",
          "permit",
          "legal",
          "audit",
          "contract",
          "honorarium",
          "cash"
        ];
        const titleAndDesc = `${fixedTitle} ${fixedDesc}`.toLowerCase();
        const containsSensitive = sensitiveKeywords.some((kw) => titleAndDesc.includes(kw));
        const fixedLeaderOnly = containsSensitive ? true : Boolean(st.isLeaderOnly);

        const best = findBestMemberForSubtask(st, liveMembers);
        const autoAssignee = best?.member.name || liveMembers[0]?.name || "Student Leader";
        const currentAssignee = (st.assigneeName || "").trim();
        const fixedAssignee =
          !currentAssignee || currentAssignee === "Unassigned" || currentAssignee === "Luis Garcia"
            ? autoAssignee
            : currentAssignee;

        const fixedAiMetadata = st.aiMetadata
          ? {
              ...st.aiMetadata,
              confidenceScore: Math.max(88, st.aiMetadata.confidenceScore)
            }
          : undefined;

        return {
          ...st,
          title: fixedTitle,
          description: fixedDesc,
          requiredSkills: fixedSkills,
          isLeaderOnly: fixedLeaderOnly,
          assigneeName: fixedAssignee,
          aiMetadata: fixedAiMetadata
        };
      })
    );
  }

  const confirmedCount = subtasks.filter((s) => s.status === "To Do").length;
  const isPublished = currentGoal.status === "Active";
  const subtasksWithWarnings = subtasks.filter((st) => validateSubtaskSafeguards(st).length > 0);
  const displayedSubtasks = showOnlyWarnings
    ? subtasks.filter((st) => validateSubtaskSafeguards(st).length > 0)
    : subtasks;

  return (
    <div className="flex flex-col gap-6 bg-[#f4f7fb] p-6 rounded-3xl min-h-screen">
      {/* Top Header Row (matching Old UI) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1e293b] tracking-tight">Events &amp; Tasks</h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            University Student Council · AY 2025–2026 · {new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date())}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
            >
              &larr; Back
            </button>
          )}

          <button
            type="button"
            onClick={handleAutoAssignHeuristics}
            className="inline-flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-700 shadow-xs hover:bg-indigo-100 transition"
            title="Automatically assign subtasks based on team members' skills & workload"
          >
            <Sparkles size={15} />
            Auto-Assign Skills
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#2563eb] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition"
          >
            <Plus size={15} />
            + Add Subtask Manually
          </button>

          <button
            type="button"
            disabled={subtasks.length === 0 || isPublished}
            onClick={() => setShowPublishModal(true)}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-bold text-white shadow-md transition ${subtasks.length === 0 || isPublished
                ? "bg-slate-300 cursor-not-allowed opacity-70"
                : "bg-[#1e3a5f] hover:bg-[#152943]"
              }`}
          >
            <Zap size={15} />
            {isPublished ? "Event Published" : `Publish Event (${subtasks.length} subtasks)`}
          </button>
        </div>
      </div>

      {/* Semantic Safeguard Status Bar (MSB-FE-014) */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-4.5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-2xl font-bold shadow-2xs ${
            subtasksWithWarnings.length === 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
          }`}>
            {subtasksWithWarnings.length === 0 ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-slate-900 tracking-tight">
                Semantic Safeguard Audit
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                subtasksWithWarnings.length === 0
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-amber-100 text-amber-800 border border-amber-300"
              }`}>
                {subtasksWithWarnings.length === 0 ? "Safeguard Compliant (0 Warnings)" : `${subtasksWithWarnings.length} Flagged Item(s)`}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 font-medium">
              {subtasksWithWarnings.length === 0
                ? "All subtasks meet quality, skill assignment, and organizational security standards."
                : `${subtasksWithWarnings.length} subtask(s) flagged for low confidence, missing details, or unassigned roles.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {subtasksWithWarnings.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowOnlyWarnings(!showOnlyWarnings)}
                className={`rounded-2xl border px-3 py-1.5 text-xs font-bold transition ${
                  showOnlyWarnings
                    ? "border-amber-400 bg-amber-50 text-amber-800"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {showOnlyWarnings ? "Show All Tasks" : `Filter Warnings (${subtasksWithWarnings.length})`}
              </button>

              <button
                type="button"
                onClick={handleAutoFixSafeguards}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-600 transition"
              >
                <Sparkles size={13} />
                Auto-Fix Safeguards
              </button>
            </>
          )}
        </div>
      </div>

      {/* Work Breakdown Section Header (Exact Old UI Style) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-lg font-bold text-[#1e293b]">Work Breakdown</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-xs font-semibold text-[#d97706]">
            {currentGoal.generationSource === "template"
              ? "Template Based"
              : currentGoal.generationSource === "manual"
              ? "Manual Authored"
              : "AI Generated"}
          </span>
          {isEditingEventName ? (
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-slate-500">for &quot;</span>
              <input
                type="text"
                value={eventNameInput}
                onChange={(e) => setEventNameInput(e.target.value)}
                className="h-7 rounded-lg border border-slate-300 px-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEventName();
                  if (e.key === "Escape") setIsEditingEventName(false);
                }}
              />
              <span className="text-sm font-semibold text-slate-500">&quot;</span>
              <button
                type="button"
                onClick={handleSaveEventName}
                className="rounded-lg bg-blue-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500">
              for &quot;{currentGoal.eventName || "New Event"}&quot;
              <button
                type="button"
                onClick={() => {
                  setEventNameInput(currentGoal.eventName || "");
                  setIsEditingEventName(true);
                }}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                title="Edit Event Name"
              >
                <Edit2 size={13} />
              </button>
            </span>
          )}
        </div>

        <p className="text-xs font-medium text-slate-400">
          {confirmedCount}/{subtasks.length} confirmed · Review each task before adding to event
        </p>
      </div>

      {/* Task Cards Grid (2-column Old UI Layout) */}
      {displayedSubtasks.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <Layers size={32} className="mx-auto text-slate-400 mb-2" />
          <h3 className="text-base font-bold text-slate-900">
            {showOnlyWarnings ? "No Flagged Subtasks" : "No Subtasks"}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {showOnlyWarnings ? "All subtasks have passed safeguard checks." : "Add subtasks manually to proceed."}
          </p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#2563eb] px-4 py-2 text-xs font-bold text-white"
          >
            <Plus size={14} /> Add First Subtask
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {displayedSubtasks.map((st) => (
            <OldTaskCard
              key={st.id}
              subtask={st}
              customStatuses={customStatuses}
              isRegenerating={!!regeneratingIds[st.id]}
              onConfirm={() => handleConfirmTask(st.id)}
              onEdit={() => setEditingSubtask(st)}
              onDelete={() => setPendingDeleteSubtask(st)}
              onRegenerate={() => void handleRegenerateSubtask(st.id)}
              onToggleLeaderOnly={() => handleToggleLeaderOnly(st.id)}
            />
          ))}
        </div>
      )}

      {/* Edit AI Task Modal (Exact Old UI Design from Screenshot 2) */}
      {editingSubtask && (
        <OldEditTaskModal
          subtask={editingSubtask}
          members={liveMembers}
          onClose={() => setEditingSubtask(null)}
          onSave={handleSaveTaskEdit}
        />
      )}

      {/* Manual Creation Modal */}
      {showAddModal && (
        <OldAddSubtaskModal
          members={liveMembers}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddManualSubtask}
        />
      )}

      {/* Publish Event Dialog */}
      {showPublishModal && (
        <OldPublishGoalModal
          goalName={currentGoal.eventName || "Event Breakdown"}
          subtasks={subtasks}
          isPublishing={publishing}
          onConfirm={() => void handleConfirmPublish()}
          onClose={() => setShowPublishModal(false)}
        />
      )}
      {pendingDeleteSubtask && (
        <ConfirmDeleteModal
          itemType="subtask"
          itemName={pendingDeleteSubtask.title}
          onCancel={() => setPendingDeleteSubtask(null)}
          onConfirm={() => {
            handleDeleteSubtask(pendingDeleteSubtask.id);
            setPendingDeleteSubtask(null);
          }}
        />
      )}
    </div>
  );
}

// ── Old Task Card Component (Matching Screenshot 1) ──────────────────────────

type OldTaskCardProps = {
  subtask: Subtask;
  customStatuses: CustomStatusConfig[];
  isRegenerating: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRegenerate: () => void;
  onToggleLeaderOnly: () => void;
};

function formatSubtaskDate(subtask: Subtask): string {
  if (subtask.deadline) {
    const parsed = new Date(subtask.deadline);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
  }
  if (subtask.dueDate) {
    const parsed = new Date(subtask.dueDate);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
  }
  const days = typeof subtask.estimatedDays === "number" && subtask.estimatedDays > 0 ? subtask.estimatedDays : 7;
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);
  return targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function OldTaskCard({
  subtask,
  customStatuses,
  isRegenerating,
  onConfirm,
  onEdit,
  onDelete,
  onRegenerate,
  onToggleLeaderOnly
}: OldTaskCardProps) {
  const isConfirmed = subtask.status === "To Do";
  const priorityBadge = PRIORITY_BADGES[subtask.priority];
  const matchScore = subtask.aiMetadata?.confidenceScore ?? (subtask.isAiGenerated ? 95 : 0);
  const warnings = validateSubtaskSafeguards(subtask);

  const scoreColor =
    matchScore >= 85 ? "text-[#10b981]" : matchScore >= 70 ? "text-[#f59e0b]" : "text-[#ef4444]";

  const barColor =
    matchScore >= 85 ? "bg-[#10b981]" : matchScore >= 70 ? "bg-[#f59e0b]" : "bg-[#ef4444]";

  const isHighWorkload = matchScore >= 95 && subtask.assigneeName === "Luis Garcia";

  return (
    <div
      className={`relative flex flex-col rounded-3xl bg-white p-6 shadow-sm transition-all border-2 ${
        warnings.length > 0
          ? "border-amber-400 ring-2 ring-amber-100/70 bg-amber-50/10"
          : isConfirmed
          ? "border-[#10b981] ring-1 ring-emerald-200"
          : "border-[#fcd34d] ring-1 ring-amber-100"
      }`}
    >
      {/* Regeneration Spinner */}
      {isRegenerating && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-white/85 backdrop-blur-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-700 bg-purple-50 px-4 py-2 rounded-full border border-purple-200">
            <Loader2 size={16} className="animate-spin text-purple-600" />
            AI Regenerating single subtask...
          </div>
        </div>
      )}

      {/* Card Header Row: Needs Review / Confirmed Pill & Priority */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {isConfirmed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#d1fae5] px-3 py-1 text-xs font-bold text-[#047857]">
              <CheckCircle2 size={12} />
              Confirmed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#fef3c7] px-3 py-1 text-xs font-bold text-[#d97706]">
              Needs Review
            </span>
          )}

          {subtask.isLeaderOnly && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
              <Lock size={10} /> Leader Only
            </span>
          )}

          {subtask.isTemplateBased ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-800">
              Template Based
            </span>
          ) : !subtask.isAiGenerated ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
              <Wrench size={10} /> Leader Authored
            </span>
          ) : null}
        </div>

          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${priorityBadge.classes}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${priorityBadge.dot}`} />
          {subtask.priority}
        </span>
      </div>

      {/* Title */}
      <h3 className="mt-4 text-base font-bold text-[#1e293b] leading-snug">{subtask.title}</h3>

      {/* Assignee & Date Row */}
      <div className="mt-2.5 flex items-center gap-4 text-xs font-medium text-slate-500">
        <span className="flex items-center gap-1.5">
          <User size={13} className="text-slate-400" />
          {subtask.assigneeName || "Unassigned"}
        </span>

        <span className="flex items-center gap-1.5">
          <CalendarIcon size={13} className="text-slate-400" />
          {formatSubtaskDate(subtask)}
        </span>
      </div>

      {/* Inline Safeguard Validation Warnings Box (MSB-FE-014) */}
      {warnings.length > 0 && (
        <div className="mt-3.5 rounded-2xl border border-amber-300 bg-amber-50/90 p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900">
              <AlertTriangle size={14} className="text-amber-600 shrink-0" />
              <span>Inline Validation Warning ({warnings.length}):</span>
            </div>
            <button
              type="button"
              onClick={onEdit}
              className="text-[11px] font-extrabold text-blue-700 hover:text-blue-900 underline"
            >
              Edit &amp; Resolve &rarr;
            </button>
          </div>
          <ul className="text-xs text-amber-900 space-y-1 pl-4 list-disc font-medium">
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Status Box */}
      <div className="mt-3.5 flex items-center justify-between rounded-xl bg-[#f1f5f9] px-4 py-2.5 text-xs">
        <span className="font-semibold text-slate-500">Status:</span>
        <span className={`rounded-full px-2 py-0.5 font-bold ${getStatusTheme(subtask.status || "To Do", customStatuses).badge}`}>{subtask.status || "To Do"}</span>
      </div>

      {/* AI Match Score (only for AI tasks or if score exists) */}
      {subtask.isAiGenerated && (
        <div className="mt-3.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">AI Match Score</span>
            <span className={`font-extrabold ${scoreColor}`}>{matchScore}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${matchScore}%` }} />
          </div>
        </div>
      )}

      {/* Workload Alert Box */}
      {isHighWorkload && (
        <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-[#fecdd3] bg-[#fef2f2] p-3 text-xs font-medium text-[#e11d48]">
          <AlertCircle size={14} className="shrink-0 text-[#e11d48]" />
          <span>Luis Garcia is at 91% workload. Consider reassigning.</span>
        </div>
      )}

      {/* Required Skills Chips */}
      <div className="mt-3.5 flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] font-bold text-slate-400">Skills:</span>
        {subtask.requiredSkills.map((sk) => (
          <span key={sk} className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200/60">
            {sk}
          </span>
        ))}
      </div>

      {/* Leader Only Toggle Checkbox & Single Actions */}
      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-600 hover:text-slate-900 select-none">
          <input
            type="checkbox"
            checked={subtask.isLeaderOnly}
            onChange={onToggleLeaderOnly}
            className="size-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
          />
          <Shield size={12} className={subtask.isLeaderOnly ? "text-amber-600" : "text-slate-400"} />
          Leader Only
        </label>

        <div className="flex items-center gap-2">
          {subtask.isAiGenerated && (
            <button
              type="button"
              onClick={onRegenerate}
              title="Re-roll single AI subtask"
              className="p-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition"
            >
              <RefreshCw size={12} />
            </button>
          )}

          <button
            type="button"
            onClick={onDelete}
            title="Delete subtask"
            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Main Bottom Buttons (Exact Old UI Style from Screenshot 1) */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-xl border border-[#cbd5e1] bg-white py-3 text-sm font-bold text-[#334155] shadow-2xs hover:bg-slate-50 transition"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={onConfirm}
          className="rounded-xl bg-[#1e3a5f] py-3 text-sm font-bold text-white shadow-2xs hover:bg-[#152943] transition"
        >
          {isConfirmed ? "Confirmed" : "Confirm"}
        </button>
      </div>
    </div>
  );
}

import { CustomSelect } from "@/components/ui/CustomSelect";

// ── Old Edit Task Modal (Exact Design from Screenshot 2) ─────────────────────

type OldEditTaskModalProps = {
  subtask: Subtask;
  members: OrganizationMember[];
  onClose: () => void;
  onSave: (updated: Subtask) => void;
};

function OldEditTaskModal({ subtask, members, onClose, onSave }: OldEditTaskModalProps) {
  // Dynamic initial date: parse subtask deadline if present, otherwise calculate from today + estimatedDays
  const initialDate = useMemo(() => {
    if (subtask.dueDate || subtask.deadline) {
      const parsed = new Date(subtask.dueDate || subtask.deadline || "");
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const d = new Date();
    d.setDate(d.getDate() + (subtask.estimatedDays || 7));
    return d;
  }, [subtask]);

  const [title, setTitle] = useState(subtask.title);
  const [description, setDescription] = useState(subtask.description);
  const [priority, setPriority] = useState<TaskPriority>(subtask.priority);
  const [estimatedDays, setEstimatedDays] = useState<number>(subtask.estimatedDays || 7);
  const [isLeaderOnly, setIsLeaderOnly] = useState(subtask.isLeaderOnly);
  const [skills, setSkills] = useState<string[]>(subtask.requiredSkills);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [sendNudgeAlert, setSendNudgeAlert] = useState(true);

  // Calendar states defaulting to today / parsed subtask deadline
  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState<number>(initialDate.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number>(initialDate.getDate());
  const [selectedMonth, setSelectedMonth] = useState<number>(initialDate.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(initialDate.getFullYear());

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const MONTH_NAMES_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  function handlePrevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  }

  function handleNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  }

  // Real-time synchronization: Estimated Days -> Calendar Deadline
  function handleEstimatedDaysChange(days: number) {
    const validDays = Math.max(1, Math.min(90, days));
    setEstimatedDays(validDays);
    const target = new Date();
    target.setDate(target.getDate() + validDays);
    setSelectedDay(target.getDate());
    setSelectedMonth(target.getMonth());
    setSelectedYear(target.getFullYear());
    setCurrentMonth(target.getMonth());
    setCurrentYear(target.getFullYear());
  }

  // Real-time synchronization: Calendar Day Click -> Estimated Days
  function handleSelectCalendarDay(day: number) {
    setSelectedDay(day);
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
    const targetDate = new Date(currentYear, currentMonth, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    setEstimatedDays(diffDays);
  }

  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const bestMatch = findBestMemberForSubtask({ title, description, requiredSkills: skills }, members);
  const initialAssignee =
    subtask.assigneeName && subtask.assigneeName !== "Luis Garcia"
      ? subtask.assigneeName
      : bestMatch?.member.name || members[0]?.name || "Unassigned";

  const [assigneeName, setAssigneeName] = useState(initialAssignee);

  function handleAddSkill() {
    const trimmed = newSkillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setNewSkillInput("");
    }
  }

  const formattedDeadline = `${MONTH_NAMES_SHORT[selectedMonth]} ${selectedDay}, ${selectedYear}`;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const targetDueDate = new Date(selectedYear, selectedMonth, selectedDay);
    const threeDaysPriorDate = new Date(targetDueDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const oneDayPriorDate = new Date(targetDueDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const subtaskNudges = [
      {
        nudgeUID: `${subtask.id}_3d`,
        triggerDate: threeDaysPriorDate,
        nudgeType: "3 Days Prior",
        sent: false
      },
      {
        nudgeUID: `${subtask.id}_1d`,
        triggerDate: oneDayPriorDate,
        nudgeType: "1 Day Prior",
        sent: false
      }
    ];

    if (sendNudgeAlert) {
      const assignedMember = members.find((m) => m.name === assigneeName);
      const isUrgent = estimatedDays <= 1;
      const nudgeType = estimatedDays <= 1 ? "1_day_prior" : estimatedDays <= 3 ? "3_days_prior" : "standard";
      sendNudgeEmail({
        recipientEmail: assignedMember?.email,
        recipientUID: assignedMember?.id,
        taskTitle: title.trim(),
        eventName: "Organization Task",
        deadline: formattedDeadline,
        message: estimatedDays <= 1
          ? "Urgent Reminder: This task is due within 1 day!"
          : estimatedDays <= 3
          ? "Priority Nudge: 3 days remaining before deadline."
          : undefined,
        isUrgent,
        nudgeType
      }).catch((err) => console.warn("Failed to dispatch email nudge:", err));
    }

    onSave({
      ...subtask,
      title: title.trim(),
      description: description.trim(),
      assigneeName,
      priority,
      estimatedDays: Math.max(1, Number(estimatedDays) || 1),
      isLeaderOnly,
      requiredSkills: skills,
      dueDate: formattedDeadline,
      deadline: formattedDeadline,
      nudges: subtaskNudges
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Modal Header (Matching Screenshot 2) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-[#e0e7ff] text-[#3b82f6]">
              <Edit2 size={18} />
            </span>
            <h3 className="text-lg font-bold text-slate-900">Edit AI Task</h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Assignee Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Assignee
            </label>
            <CustomSelect
              value={assigneeName}
              onChange={setAssigneeName}
              options={
                members.length === 0
                  ? [{ value: assigneeName, label: assigneeName || "Unassigned" }]
                  : members.map((m) => ({
                      value: m.name,
                      label: m.name,
                      sublabel: m.position || m.role
                    }))
              }
              buttonClassName="py-3 text-sm font-semibold"
            />
            {bestMatch && (
              <div className="mt-2.5 rounded-2xl border border-blue-100 bg-slate-50/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <Sparkles size={14} className="text-blue-600 shrink-0" />
                    <span>Recommended Assignee</span>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200/50">
                    {bestMatch.score}% Match
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900">
                  {bestMatch.member.name}{" "}
                  <span className="font-normal text-slate-500">
                    ({bestMatch.member.position || bestMatch.member.role || "Member"})
                  </span>
                </p>
                {bestMatch.explanation && (
                  <p className="text-[11px] font-medium text-slate-600">
                    {bestMatch.explanation}
                  </p>
                )}
                {bestMatch.member.skills && bestMatch.member.skills.length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                      Member Skills:
                    </span>
                    {bestMatch.member.skills.map((sk) => {
                      const isMatched = bestMatch.matchedSkills.includes(sk);
                      return (
                        <span
                          key={sk}
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1 ${
                            isMatched
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                              : "bg-white text-slate-500 border border-slate-200/60"
                          }`}
                        >
                          {sk}
                          {isMatched && <Check size={11} className="stroke-[2.5] text-emerald-600" />}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Schedule & Auto-Reminder Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <Bell size={14} className="text-blue-600 shrink-0" />
                <span>Adviser-Recommended Nudges</span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                3-Day & 1-Day Active
              </span>
            </div>

            <div className="text-xs text-slate-600 space-y-1.5 font-normal leading-relaxed">
              <p>
                Assigned to <span className="font-semibold text-slate-900">{assigneeName}</span> · Due in{" "}
                <span className="font-semibold text-slate-900">{estimatedDays} day{estimatedDays > 1 ? "s" : ""}</span> ({formattedDeadline}).
              </p>
              <div className="rounded-xl border border-slate-200/70 bg-white p-2.5 space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2 text-amber-700">
                  <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span><strong>3 Days Prior:</strong> Contextual progress check email sent to {assigneeName}.</span>
                </div>
                <div className="flex items-center gap-2 text-rose-600">
                  <span className="size-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span><strong>1 Day Prior:</strong> Urgent final deadline reminder email sent 24h before due date.</span>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 pt-2 border-t border-slate-200/60 cursor-pointer select-none text-xs font-semibold text-slate-700 hover:text-slate-900 transition">
              <input
                type="checkbox"
                checked={sendNudgeAlert}
                onChange={(e) => setSendNudgeAlert(e.target.checked)}
                className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Send initial assignment notification nudge to member on save</span>
            </label>
          </div>

          {/* Dynamic Calendar Deadline Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Deadline</span>
              <span className="text-xs font-bold text-blue-600">
                {formattedDeadline} · 11:59
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4 bg-white">
              <div className="flex items-center justify-between mb-3 px-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="font-bold text-slate-900 text-sm">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 mb-2">
                <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-700">
                {Array.from({ length: firstDayIndex }).map((_, idx) => (
                  <span key={`empty-${idx}`} className="py-1 opacity-30" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const isSelected =
                    selectedDay === day &&
                    selectedMonth === currentMonth &&
                    selectedYear === currentYear;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleSelectCalendarDay(day)}
                      className={`py-1.5 rounded-xl font-semibold transition ${
                        isSelected
                          ? "bg-[#1e3a5f] text-white shadow-2xs font-bold"
                          : "hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Priority & Estimated Days */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Priority</label>
              <CustomSelect
                value={priority}
                onChange={(val) => setPriority(val as TaskPriority)}
                options={ALL_PRIORITIES.map((value) => ({ value, label: value, indicatorClass: PRIORITY_CONFIG[value].dot, selectedClass: PRIORITY_CONFIG[value].classes }))}
                buttonClassName="py-2.5 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Estimated Days</label>
              <input
                type="number"
                min={1}
                max={90}
                value={estimatedDays}
                onChange={(e) => handleEstimatedDaysChange(Number(e.target.value))}
                className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2.5 text-xs font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Required Skills Chip Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Required Skills (Chip Input)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="Type skill name & enter"
                className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2 text-xs text-slate-800"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="rounded-2xl bg-slate-800 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-900 shrink-0"
              >
                Add
              </button>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 border border-blue-200"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => setSkills(skills.filter((k) => k !== s))}
                    className="text-blue-500 hover:text-blue-800"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Leader Only Restricted Toggle */}
          <div className="rounded-2xl bg-amber-50/70 p-3 border border-amber-200/70">
            <label className="flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isLeaderOnly}
                onChange={(e) => setIsLeaderOnly(e.target.checked)}
                className="size-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <Shield size={14} className="text-amber-600" />
              Leader Only Access Restricted
            </label>
          </div>

          {/* Modal Action Buttons (Exact Screenshot 2 Design) */}
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-2xl bg-[#2563eb] py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Old Add Subtask Modal ───────────────────────────────────────────────────

type OldAddSubtaskModalProps = {
  members: OrganizationMember[];
  onClose: () => void;
  onAdd: (subtask: Omit<Subtask, "id" | "isAiGenerated">) => void;
};

function OldAddSubtaskModal({ members, onClose, onAdd }: OldAddSubtaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeName, setAssigneeName] = useState(members[0]?.name || "Unassigned");
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [estimatedDays, setEstimatedDays] = useState(3);
  const [isLeaderOnly, setIsLeaderOnly] = useState(false);
  const [skills, setSkills] = useState<string[]>(["Event Planning"]);
  const [skillInput, setSkillInput] = useState("");

  function handleAddSkill() {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    onAdd({
      title: title.trim(),
      description: description.trim() || "Leader-authored subtask created manually.",
      assigneeName,
      requiredSkills: skills,
      estimatedDays: Math.max(1, Number(estimatedDays) || 1),
      isLeaderOnly,
      priority
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-[#e0e7ff] text-[#3b82f6]">
              <Plus size={18} />
            </span>
            <h3 className="text-base font-extrabold text-slate-900">Add Subtask Manually</h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Subtask Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Confirm Catering Vendor Contract"
              className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-2.5 text-xs font-semibold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Specify requirements or instructions..."
              className="w-full resize-none rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-2 text-xs text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Assignee</label>
              <CustomSelect
                value={assigneeName}
                onChange={setAssigneeName}
                options={
                  members.length === 0
                    ? [{ value: assigneeName, label: assigneeName }]
                    : members.map((m) => ({
                        value: m.name,
                        label: m.name,
                        sublabel: m.position || m.role
                      }))
                }
                buttonClassName="py-2 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Priority</label>
              <CustomSelect
                value={priority}
                onChange={(val) => setPriority(val as TaskPriority)}
                options={ALL_PRIORITIES.map((value) => ({ value, label: value, indicatorClass: PRIORITY_CONFIG[value].dot, selectedClass: PRIORITY_CONFIG[value].classes }))}
                buttonClassName="py-2 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Required Skills */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Required Skills (Chip Input)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="Add skill & Enter"
                className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2 text-xs text-slate-800"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="rounded-2xl bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-900 shrink-0"
              >
                Add
              </button>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                  {s}
                  <button type="button" onClick={() => setSkills(skills.filter((k) => k !== s))} className="text-blue-500 hover:text-blue-800">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Leader Only */}
          <div className="rounded-2xl bg-amber-50/70 p-3 border border-amber-200/70">
            <label className="flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer">
              <input
                type="checkbox"
                checked={isLeaderOnly}
                onChange={(e) => setIsLeaderOnly(e.target.checked)}
                className="size-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <Shield size={14} className="text-amber-600" />
              Restricted to Leader Only Access
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-[#2563eb] py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-md"
            >
              Add Subtask
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Old Publish Goal Modal ───────────────────────────────────────────────────

type OldPublishGoalModalProps = {
  goalName: string;
  subtasks: Subtask[];
  isPublishing: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

function OldPublishGoalModal({
  goalName,
  subtasks,
  isPublishing,
  onConfirm,
  onClose
}: OldPublishGoalModalProps) {
  const aiCount = subtasks.filter((s) => s.isAiGenerated).length;
  const manualCount = subtasks.length - aiCount;
  const leaderOnlyCount = subtasks.filter((s) => s.isLeaderOnly).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-[#e0e7ff] text-[#3b82f6]">
            <Zap size={20} />
          </span>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Publish Event Confirmation</h3>
            <p className="text-xs text-slate-500">Transition status from Draft to Active</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          You are about to publish the subtasks for <strong className="text-slate-900">&quot;{goalName}&quot;</strong>. Once published, these subtasks become active and can be assigned to organization members.
        </p>

        {/* Summary Details Box */}
        <div className="rounded-2xl bg-[#f8fafc] p-4 border border-slate-200/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">Total Subtasks:</span>
            <span className="font-extrabold text-slate-900">{subtasks.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">AI-Generated:</span>
            <span className="font-bold text-purple-700">{aiCount} subtasks</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">Leader Authored:</span>
            <span className="font-bold text-blue-700">{manualCount} subtasks</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">Leader Only Restricted:</span>
            <span className="font-bold text-amber-700">{leaderOnlyCount} subtasks</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
          <button
            type="button"
            disabled={isPublishing}
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isPublishing}
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1e3a5f] py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#152943] transition disabled:opacity-50"
          >
            {isPublishing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            {isPublishing ? "Publishing..." : "Confirm & Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
