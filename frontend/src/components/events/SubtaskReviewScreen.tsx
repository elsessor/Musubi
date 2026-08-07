"use client";

import {
  AlertCircle,
  AlertTriangle,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
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
  Sparkles,
  Trash2,
  User,
  Wrench,
  X,
  Zap
} from "lucide-react";
import { useState } from "react";
import type { GoalDraft, Subtask, TaskPriority } from "./types";

const PRIORITY_BADGES: Record<TaskPriority, { bg: string; text: string }> = {
  Low: { bg: "bg-[#f1f5f9]", text: "text-[#475569]" },
  Medium: { bg: "bg-[#dbeafe]", text: "text-[#1d4ed8]" },
  High: { bg: "bg-[#ffedd5]", text: "text-[#c2410c]" },
  Critical: { bg: "bg-[#ffe4e6]", text: "text-[#e11d48]" }
};

type SubtaskReviewScreenProps = {
  goalDraft: GoalDraft;
  onPublishGoal?: (publishedGoal: GoalDraft) => void;
  onBack?: () => void;
};

export function SubtaskReviewScreen({ goalDraft, onPublishGoal, onBack }: SubtaskReviewScreenProps) {
  const [currentGoal, setCurrentGoal] = useState<GoalDraft>(goalDraft);
  const [subtasks, setSubtasks] = useState<Subtask[]>(goalDraft.subtasks);
  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);
  const [regeneratingIds, setRegeneratingIds] = useState<Record<string, boolean>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);

  function handleConfirmTask(id: string) {
    setSubtasks((prev) =>
      prev.map((st) => (st.id === id ? { ...st, status: "To Do", assigneeName: st.assigneeName || "Luis Garcia" } : st))
    );
  }

  function handleDeleteSubtask(id: string) {
    setSubtasks((prev) => prev.filter((st) => st.id !== id));
  }

  function handleToggleLeaderOnly(id: string) {
    setSubtasks((prev) =>
      prev.map((st) => (st.id === id ? { ...st, isLeaderOnly: !st.isLeaderOnly } : st))
    );
  }

  async function handleRegenerateSubtask(id: string) {
    setRegeneratingIds((prev) => ({ ...prev, [id]: true }));
    await new Promise((resolve) => setTimeout(resolve, 750));

    const skillsPool = ["Logistics", "Budgeting", "Public Relations", "Catering", "AV Operations", "Graphics", "Security"];
    const randomSkill = skillsPool[Math.floor(Math.random() * skillsPool.length)];
    const randomScore = Math.floor(Math.random() * 20) + 78;

    setSubtasks((prev) =>
      prev.map((st) => {
        if (st.id !== id) return st;
        const newSkills = Array.from(new Set([...st.requiredSkills, randomSkill])).slice(0, 4);
        return {
          ...st,
          title: `Refined: ${st.title.replace(/^Refined:\s*/, "")}`,
          description: `${st.description} (Re-optimized by AI for committee workflow)`,
          estimatedDays: Math.max(1, st.estimatedDays + (Math.random() > 0.5 ? 1 : -1)),
          requiredSkills: newSkills,
          isAiGenerated: true,
          aiMetadata: { confidenceScore: randomScore }
        };
      })
    );
    setRegeneratingIds((prev) => ({ ...prev, [id]: false }));
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

  const confirmedCount = subtasks.filter((s) => s.status === "To Do").length;
  const isPublished = currentGoal.status === "Active";

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
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-bold text-white shadow-md transition ${
              subtasks.length === 0 || isPublished
                ? "bg-slate-300 cursor-not-allowed opacity-70"
                : "bg-[#1e3a5f] hover:bg-[#152943]"
            }`}
          >
            <Zap size={15} />
            {isPublished ? "Goal Published" : `Publish Goal (${subtasks.length} subtasks)`}
          </button>
        </div>
      </div>

      {/* Work Breakdown Section Header (Exact Old UI Style) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-lg font-bold text-[#1e293b]">Work Breakdown</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-xs font-semibold text-[#d97706]">
            AI Generated
          </span>
          <span className="text-sm font-semibold text-slate-500">
            for &quot;{currentGoal.eventName || "Culture Week"}&quot;
          </span>
        </div>

        <p className="text-xs font-medium text-slate-400">
          {confirmedCount}/{subtasks.length} confirmed · Review each task before adding to event
        </p>
      </div>

      {/* Task Cards Grid (2-column Old UI Layout) */}
      {subtasks.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <Layers size={32} className="mx-auto text-slate-400 mb-2" />
          <h3 className="text-base font-bold text-slate-900">No Subtasks</h3>
          <p className="text-xs text-slate-500 mt-1">Add subtasks manually to proceed.</p>
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
          {subtasks.map((st) => (
            <OldTaskCard
              key={st.id}
              subtask={st}
              isRegenerating={!!regeneratingIds[st.id]}
              onConfirm={() => handleConfirmTask(st.id)}
              onEdit={() => setEditingSubtask(st)}
              onDelete={() => handleDeleteSubtask(st.id)}
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
          onClose={() => setEditingSubtask(null)}
          onSave={handleSaveTaskEdit}
        />
      )}

      {/* Manual Creation Modal */}
      {showAddModal && (
        <OldAddSubtaskModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddManualSubtask}
        />
      )}

      {/* Publish Goal Dialog */}
      {showPublishModal && (
        <OldPublishGoalModal
          goalName={currentGoal.eventName || "Goal Breakdown"}
          subtasks={subtasks}
          isPublishing={publishing}
          onConfirm={() => void handleConfirmPublish()}
          onClose={() => setShowPublishModal(false)}
        />
      )}
    </div>
  );
}

// ── Old Task Card Component (Matching Screenshot 1) ──────────────────────────

type OldTaskCardProps = {
  subtask: Subtask;
  isRegenerating: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRegenerate: () => void;
  onToggleLeaderOnly: () => void;
};

function OldTaskCard({
  subtask,
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

  const scoreColor =
    matchScore >= 85 ? "text-[#10b981]" : matchScore >= 70 ? "text-[#f59e0b]" : "text-[#ef4444]";

  const barColor =
    matchScore >= 85 ? "bg-[#10b981]" : matchScore >= 70 ? "bg-[#f59e0b]" : "bg-[#ef4444]";

  const isHighWorkload = matchScore >= 95 && subtask.assigneeName === "Luis Garcia";

  return (
    <div
      className={`relative flex flex-col rounded-3xl bg-white p-6 shadow-sm transition-all border-2 ${
        isConfirmed
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
        <div className="flex items-center gap-2">
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

          {!subtask.isAiGenerated && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
              <Wrench size={10} /> Leader Authored
            </span>
          )}
        </div>

        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${priorityBadge.bg} ${priorityBadge.text}`}>
          {subtask.priority}
        </span>
      </div>

      {/* Title */}
      <h3 className="mt-4 text-base font-bold text-[#1e293b] leading-snug">{subtask.title}</h3>

      {/* Assignee & Date Row */}
      <div className="mt-2.5 flex items-center gap-4 text-xs font-medium text-slate-500">
        <span className="flex items-center gap-1.5">
          <User size={13} className="text-slate-400" />
          {subtask.assigneeName || "Luis Garcia"}
        </span>

        <span className="flex items-center gap-1.5">
          <CalendarIcon size={13} className="text-slate-400" />
          Aug 11, 2026
        </span>
      </div>

      {/* Status Box */}
      <div className="mt-3.5 flex items-center justify-between rounded-xl bg-[#f1f5f9] px-4 py-2.5 text-xs">
        <span className="font-semibold text-slate-500">Status:</span>
        <span className="font-bold text-slate-800">{subtask.status || "To Do"}</span>
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
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
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

// ── Old Edit Task Modal (Exact Design from Screenshot 2) ─────────────────────

type OldEditTaskModalProps = {
  subtask: Subtask;
  onClose: () => void;
  onSave: (updated: Subtask) => void;
};

function OldEditTaskModal({ subtask, onClose, onSave }: OldEditTaskModalProps) {
  const [title, setTitle] = useState(subtask.title);
  const [description, setDescription] = useState(subtask.description);
  const [assigneeName, setAssigneeName] = useState(subtask.assigneeName || "Luis Garcia");
  const [priority, setPriority] = useState<TaskPriority>(subtask.priority);
  const [estimatedDays, setEstimatedDays] = useState(subtask.estimatedDays);
  const [isLeaderOnly, setIsLeaderOnly] = useState(subtask.isLeaderOnly);
  const [skills, setSkills] = useState<string[]>(subtask.requiredSkills);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [selectedDay, setSelectedDay] = useState<number>(11);

  function handleAddSkill() {
    const trimmed = newSkillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setNewSkillInput("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      ...subtask,
      title: title.trim(),
      description: description.trim(),
      assigneeName,
      priority,
      estimatedDays: Math.max(1, Number(estimatedDays) || 1),
      isLeaderOnly,
      requiredSkills: skills
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

          {/* Assignee Selection (Matching Screenshot 2) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Assignee
            </label>
            <select
              value={assigneeName}
              onChange={(e) => setAssigneeName(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
            >
              <option value="Luis Garcia">Luis Garcia</option>
              <option value="Beatrice Lim">Beatrice Lim</option>
              <option value="Marco Dela Cruz">Marco Dela Cruz</option>
              <option value="Ana Reyes">Ana Reyes</option>
            </select>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Original AI suggestion: <span className="font-bold text-slate-700">{subtask.assigneeName || "Luis Garcia"} ({subtask.aiMetadata?.confidenceScore ?? 95}% match)</span>
            </p>
          </div>

          {/* Interactive Calendar Deadline Picker (Exact Screenshot 2 Style) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Deadline</span>
              <span className="text-xs font-bold text-blue-600">Aug {selectedDay}, 2026 · 11:59</span>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4 bg-white">
              <div className="flex items-center justify-between mb-3 px-2">
                <button type="button" className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
                  <ChevronLeft size={16} />
                </button>
                <span className="font-bold text-slate-900 text-sm">August 2026</span>
                <button type="button" className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 mb-2">
                <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-700">
                <span className="py-1 opacity-30"></span><span className="py-1 opacity-30"></span><span className="py-1 opacity-30"></span><span className="py-1 opacity-30"></span><span className="py-1 opacity-30"></span><span className="py-1 opacity-30"></span>
                <button type="button" onClick={() => setSelectedDay(1)} className={`py-1.5 rounded-xl ${selectedDay === 1 ? "bg-[#1e3a5f] text-white" : "hover:bg-slate-100"}`}>1</button>
                <button type="button" onClick={() => setSelectedDay(2)} className={`py-1.5 rounded-xl ${selectedDay === 2 ? "bg-[#1e3a5f] text-white" : "hover:bg-slate-100"}`}>2</button>
                <button type="button" onClick={() => setSelectedDay(3)} className={`py-1.5 rounded-xl ${selectedDay === 3 ? "bg-[#1e3a5f] text-white" : "hover:bg-slate-100"}`}>3</button>
                <button type="button" onClick={() => setSelectedDay(4)} className={`py-1.5 rounded-xl ${selectedDay === 4 ? "bg-[#1e3a5f] text-white" : "hover:bg-slate-100"}`}>4</button>
                <button type="button" onClick={() => setSelectedDay(5)} className={`py-1.5 rounded-xl ${selectedDay === 5 ? "bg-[#1e3a5f] text-white" : "hover:bg-slate-100"}`}>5</button>
                <button type="button" onClick={() => setSelectedDay(6)} className={`py-1.5 rounded-xl ${selectedDay === 6 ? "bg-[#1e3a5f] text-white" : "hover:bg-slate-100"}`}>6</button>
                <button type="button" onClick={() => setSelectedDay(7)} className={`py-1.5 rounded-xl bg-blue-100 text-blue-700 ${selectedDay === 7 ? "bg-[#1e3a5f] text-white" : ""}`}>7</button>
                <button type="button" onClick={() => setSelectedDay(8)} className={`py-1.5 rounded-xl ${selectedDay === 8 ? "bg-[#1e3a5f] text-white" : "hover:bg-slate-100"}`}>8</button>
                <button type="button" onClick={() => setSelectedDay(9)} className={`py-1.5 rounded-xl ${selectedDay === 9 ? "bg-[#1e3a5f] text-white" : "hover:bg-slate-100"}`}>9</button>
                <button type="button" onClick={() => setSelectedDay(10)} className={`py-1.5 rounded-xl ${selectedDay === 10 ? "bg-[#1e3a5f] text-white" : "hover:bg-slate-100"}`}>10</button>
                <button type="button" onClick={() => setSelectedDay(11)} className={`py-1.5 rounded-xl font-black ${selectedDay === 11 ? "bg-[#1e293b] text-white" : "hover:bg-slate-100"}`}>11</button>
                <button type="button" onClick={() => setSelectedDay(12)} className={`py-1.5 rounded-xl ${selectedDay === 12 ? "bg-[#1e3a5f] text-white" : "hover:bg-slate-100"}`}>12</button>
                <button type="button" onClick={() => setSelectedDay(13)} className={`py-1.5 rounded-xl ${selectedDay === 13 ? "bg-[#1e3a5f] text-white" : "hover:bg-slate-100"}`}>13</button>
                <button type="button" onClick={() => setSelectedDay(14)} className={`py-1.5 rounded-xl ${selectedDay === 14 ? "bg-[#1e3a5f] text-white" : "hover:bg-slate-100"}`}>14</button>
                <button type="button" onClick={() => setSelectedDay(15)} className={`py-1.5 rounded-xl ${selectedDay === 15 ? "bg-[#1e3a5f] text-white" : "hover:bg-slate-100"}`}>15</button>
              </div>
            </div>
          </div>

          {/* Priority & Estimated Days */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2.5 text-xs font-semibold text-slate-800"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Estimated Days</label>
              <input
                type="number"
                min={1}
                max={30}
                value={estimatedDays}
                onChange={(e) => setEstimatedDays(Number(e.target.value))}
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
  onClose: () => void;
  onAdd: (subtask: Omit<Subtask, "id" | "isAiGenerated">) => void;
};

function OldAddSubtaskModal({ onClose, onAdd }: OldAddSubtaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeName, setAssigneeName] = useState("Luis Garcia");
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
              <select
                value={assigneeName}
                onChange={(e) => setAssigneeName(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2 text-xs font-semibold text-slate-800"
              >
                <option value="Luis Garcia">Luis Garcia</option>
                <option value="Beatrice Lim">Beatrice Lim</option>
                <option value="Marco Dela Cruz">Marco Dela Cruz</option>
                <option value="Ana Reyes">Ana Reyes</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2 text-xs font-semibold text-slate-800"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
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
            <h3 className="text-base font-extrabold text-slate-900">Publish Goal Confirmation</h3>
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
