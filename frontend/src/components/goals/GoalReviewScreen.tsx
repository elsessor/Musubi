"use client";

import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  GitBranch,
  Layers,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Zap
} from "lucide-react";
import { useState } from "react";

import type { CommitteeScope, GoalDraft, GoalPriority, Subtask, TaskComplexity } from "@/types/goal";
import { Button } from "@/components/ui/Button";

interface GoalReviewScreenProps {
  goal: GoalDraft;
  onEdit: () => void;
  onSave: (finalGoal: GoalDraft) => void;
}

const COMPLEXITY_COLORS: Record<TaskComplexity, string> = {
  XS: "bg-emerald-100 text-emerald-800 border-emerald-300",
  S: "bg-teal-100 text-teal-800 border-teal-300",
  M: "bg-blue-100 text-blue-800 border-blue-300",
  L: "bg-amber-100 text-amber-800 border-amber-300",
  XL: "bg-rose-100 text-rose-800 border-rose-300"
};

const PRIORITY_COLORS: Record<GoalPriority, string> = {
  Low: "bg-slate-100 text-slate-700",
  Medium: "bg-blue-100 text-blue-800",
  High: "bg-amber-100 text-amber-800",
  Urgent: "bg-rose-100 text-rose-800"
};

export function GoalReviewScreen({ goal, onEdit, onSave }: GoalReviewScreenProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>(goal.subtasks ?? []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskHours, setNewSubtaskHours] = useState(4);
  const [newSubtaskScope, setNewSubtaskScope] = useState<CommitteeScope>(
    goal.committeeScope || "Org-Wide"
  );
  const [isAdding, setIsAdding] = useState(false);

  const handleDeleteSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((st) => st.id !== id));
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;

    const newSt: Subtask = {
      id: `st-custom-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      description: "Manually added subtask during lead review.",
      committeeScope: newSubtaskScope,
      priority: goal.priority || "High",
      estimatedHours: newSubtaskHours,
      complexity: newSubtaskHours > 8 ? "L" : newSubtaskHours > 4 ? "M" : "S",
      dependencies: []
    };

    setSubtasks((prev) => [...prev, newSt]);
    setNewSubtaskTitle("");
    setNewSubtaskHours(4);
    setIsAdding(false);
  };

  const totalHours = subtasks.reduce((sum, st) => sum + st.estimatedHours, 0);

  const handleFinalSave = () => {
    onSave({
      ...goal,
      subtasks,
      status: "In Progress"
    });
  };

  return (
    <div className="space-y-6">
      {/* Review Screen Header */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-900 via-[#134e4a] to-[#1e3a8a] p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-200 backdrop-blur-md border border-emerald-400/30">
              <CheckCircle2 className="size-3.5 text-emerald-300" />
              MSB-FE-013: AI Subtask Review &amp; Approval
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Review Generated Subtasks</h2>
            <p className="max-w-2xl text-sm text-emerald-100/90">
              Review and refine the AI-decomposed subtasks, estimated effort, and committee assignments before saving into your workspace.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onEdit}
              className="h-10 px-4 rounded-xl border border-white/30 bg-white/10 text-white hover:bg-white/20 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="size-4" />
              Edit Goal Form
            </Button>

            <Button
              type="button"
              onClick={handleFinalSave}
              className="h-10 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-md shadow-emerald-900/30 flex items-center gap-1.5 transition"
            >
              <ShieldCheck className="size-4" />
              Approve &amp; Save Goal
            </Button>
          </div>
        </div>
      </div>

      {/* Goal Summary Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-200/60 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Goal</span>
            <h3 className="text-xl font-extrabold text-slate-900">{goal.title}</h3>
          </div>

          <div className="flex items-center gap-2">
            <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${PRIORITY_COLORS[goal.priority]}`}>
              Priority: {goal.priority}
            </span>
            <span className="rounded-md bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 text-xs font-bold flex items-center gap-1">
              <Users className="size-3.5" />
              {goal.committeeScope}
            </span>
            <span className="rounded-md bg-slate-100 text-slate-700 px-2.5 py-1 text-xs font-bold flex items-center gap-1">
              <Calendar className="size-3.5" />
              Due: {goal.targetDate}
            </span>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">{goal.description}</p>

        {/* AI Prompt-Chaining Execution Summary metadata */}
        {goal.aiMetadata && (
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5 text-blue-900">
                <Sparkles className="size-4 text-blue-600" />
                Prompt-Chaining Metadata ({goal.aiMetadata.model})
              </span>
              <span className="text-slate-500">
                Execution Time: {goal.aiMetadata.executionTimeMs}ms • Tokens: {goal.aiMetadata.tokensUsed} • Confidence: {Math.round((goal.aiMetadata.confidenceScore || 0.9) * 100)}%
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-4 pt-1">
              {goal.aiMetadata.promptChainSteps.map((step, idx) => (
                <div key={step.id} className="rounded-lg bg-white p-2 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span className="truncate">{idx + 1}. {step.name}</span>
                    <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{step.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Subtasks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="size-5 text-blue-600" />
              Atomized Subtasks ({subtasks.length})
            </h4>
            <p className="text-xs text-slate-500">
              Total estimated effort: <strong className="text-slate-800">{totalHours} hours</strong> across subtasks
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsAdding(!isAdding)}
            className="h-9 px-3 rounded-xl border border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Plus className="size-4" />
            Add Custom Subtask
          </Button>
        </div>

        {/* Add Manual Subtask Form */}
        {isAdding && (
          <div className="rounded-xl border border-blue-300 bg-blue-50/40 p-4 space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-blue-900">Add Manual Subtask</h5>
            <div className="grid gap-3 sm:grid-cols-[1fr_120px_160px_auto]">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Subtask title..."
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <input
                type="number"
                min={1}
                max={40}
                value={newSubtaskHours}
                onChange={(e) => setNewSubtaskHours(parseInt(e.target.value) || 1)}
                placeholder="Hours"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <select
                value={newSubtaskScope}
                onChange={(e) => setNewSubtaskScope(e.target.value as CommitteeScope)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Org-Wide">Org-Wide</option>
                <option value="Logistics">Logistics</option>
                <option value="Marketing">Marketing</option>
                <option value="Finance">Finance</option>
                <option value="Sponsorship">Sponsorship</option>
                <option value="Program">Program</option>
                <option value="Technical">Technical</option>
              </select>
              <Button
                type="button"
                onClick={handleAddSubtask}
                className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                Add
              </Button>
            </div>
          </div>
        )}

        {/* Subtask Cards List */}
        <div className="grid gap-3">
          {subtasks.map((st) => {
            const hasDeps = st.dependencies && st.dependencies.length > 0;
            const depTitles = (st.dependencies || [])
              .map((depId) => subtasks.find((s) => s.id === depId)?.title)
              .filter(Boolean);

            return (
              <div
                key={st.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-slate-300 hover:shadow-sm space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900">{st.title}</span>

                      {/* Complexity badge */}
                      <span className={`rounded-md border px-2 py-0.5 text-[11px] font-extrabold ${COMPLEXITY_COLORS[st.complexity]}`}>
                        Complexity {st.complexity}
                      </span>

                      {/* Committee scope badge */}
                      <span className="rounded-md bg-slate-100 text-slate-700 px-2 py-0.5 text-[11px] font-semibold flex items-center gap-1">
                        <Users className="size-3 text-slate-500" />
                        {st.committeeScope}
                      </span>

                      {/* Est Hours */}
                      <span className="rounded-md bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 text-[11px] font-bold flex items-center gap-1">
                        <Clock className="size-3 text-amber-600" />
                        {st.estimatedHours}h est.
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">{st.description}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteSubtask(st.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition shrink-0"
                    title="Remove subtask"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                {/* Dependencies mapping */}
                {hasDeps && (
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 font-medium border-t border-slate-100">
                    <GitBranch className="size-3.5 text-blue-600" />
                    <span>Prerequisites:</span>
                    <div className="flex flex-wrap gap-1">
                      {depTitles.map((dt, i) => (
                        <span key={i} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700 font-mono">
                          {dt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="pt-4 flex items-center justify-between border-t border-slate-200">
        <Button
          type="button"
          variant="secondary"
          onClick={onEdit}
          className="h-11 px-5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs flex items-center gap-2"
        >
          <ArrowLeft className="size-4" />
          Back to Goal Parameters
        </Button>

        <Button
          type="button"
          onClick={handleFinalSave}
          className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md shadow-emerald-900/20 flex items-center gap-2"
        >
          <ShieldCheck className="size-5" />
          Confirm &amp; Publish Goal
        </Button>
      </div>
    </div>
  );
}
