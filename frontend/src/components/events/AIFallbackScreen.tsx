"use client";

import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  HeartHandshake,
  Landmark,
  Layers,
  Palette,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trophy,
  Zap
} from "lucide-react";
import { useState } from "react";
import { STARTER_TEMPLATES } from "./starterTemplates";
import type { OrgCategory, StarterTemplate, Subtask } from "./types";

const CATEGORY_ICONS: Record<OrgCategory, React.ComponentType<{ className?: string; size?: number }>> = {
  Governing: Landmark,
  Academic: GraduationCap,
  "Socio-Civic": HeartHandshake,
  "Arts & Culture": Palette,
  "Sports & Recreation": Trophy
};

type AIFallbackScreenProps = {
  eventName: string;
  goalDescription: string;
  errorMessage?: string;
  retryCount?: number;
  onSelectTemplate: (template: StarterTemplate) => void;
  onStartFromScratch: () => void;
  onRetryGeneration: () => void;
  onBackToForm?: () => void;
};

export function AIFallbackScreen({
  eventName,
  goalDescription,
  errorMessage,
  retryCount = 3,
  onSelectTemplate,
  onStartFromScratch,
  onRetryGeneration,
  onBackToForm
}: AIFallbackScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<OrgCategory>("Governing");
  const activeTemplate = STARTER_TEMPLATES.find((t) => t.category === selectedCategory) || STARTER_TEMPLATES[0];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Fallback Header & Alert Banner */}
      <div className="rounded-3xl border border-amber-200/90 bg-amber-50/50 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md">
            <ShieldAlert size={26} />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-amber-800 border border-amber-300/80">
                  Semantic Fallback Safeguard
                </span>
                <span className="text-xs font-semibold text-amber-700">
                  Automated generation aborted ({retryCount} retries exhausted)
                </span>
              </div>

              {onBackToForm && (
                <button
                  type="button"
                  onClick={onBackToForm}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 underline"
                >
                  Edit Goal Prompt
                </button>
              )}
            </div>

            <h2 className="mt-2 text-xl font-extrabold text-slate-900 tracking-tight">
              AI Generation Encountered an Issue
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-700 font-medium max-w-3xl">
              {errorMessage ||
                "The AI model was unable to atomize your goal after multiple automated retries. To prevent workflow blockage and ensure your event stays on schedule, Musubi's Semantic Safeguard has activated."}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onRetryGeneration}
                className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition active:scale-95"
              >
                <RefreshCw size={14} />
                Retry AI Atomizer
              </button>
              <span className="text-xs font-medium text-slate-500">
                Target: <strong className="text-slate-800">{eventName || "Campus Event"}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Choice Grid: Starter Template vs Start From Scratch */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Option A: Starter Template (Lg 8 cols) */}
        <div className="lg:col-span-8 flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 font-bold">
                <BookOpen size={20} />
              </span>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Option 1: Use a Starter Template
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Pre-filled actionable subtasks curated for your organization&apos;s category
                </p>
              </div>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
              Recommended
            </span>
          </div>

          {/* Category Tabs */}
          <div className="mt-5 flex flex-wrap gap-2">
            {STARTER_TEMPLATES.map((tpl) => {
              const IconComp = CATEGORY_ICONS[tpl.category] || Landmark;
              const isSelected = selectedCategory === tpl.category;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedCategory(tpl.category)}
                  className={`flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-[#1e3a5f] text-white shadow-md"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200/80"
                  }`}
                >
                  <IconComp size={15} />
                  {tpl.category}
                </button>
              );
            })}
          </div>

          {/* Selected Template Details & Preview */}
          <div className="mt-5 flex-1 rounded-2xl border border-slate-200/80 bg-[#f8fafc] p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">{activeTemplate.title}</h4>
                <p className="mt-0.5 text-xs text-slate-600">{activeTemplate.description}</p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-200 px-3 py-1 text-[11px] font-bold text-slate-700">
                {activeTemplate.subtasks.length} Subtasks
              </span>
            </div>

            {/* Subtask Preview List */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Pre-filled Actionable Subtasks:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeTemplate.subtasks.map((st, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200/60 bg-white p-3 shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400">
                        {st.priority} Priority
                      </span>
                      {st.isLeaderOnly && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          Leader Only
                        </span>
                      )}
                    </div>
                    <h5 className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">
                      {st.title}
                    </h5>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{st.description}</p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>Assigned to: <strong className="text-slate-700">{st.assigneeName}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Select Template CTA Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onSelectTemplate(activeTemplate)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#2563eb] py-3 text-xs font-extrabold text-white shadow-md hover:bg-blue-700 transition active:scale-[0.99]"
              >
                <CheckCircle2 size={16} />
                Load &quot;{activeTemplate.category}&quot; Starter Template ({activeTemplate.subtasks.length} subtasks)
              </button>
            </div>
          </div>
        </div>

        {/* Option B: Start From Scratch (Lg 4 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 font-bold">
                <Plus size={20} />
              </span>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Option 2: Start from Scratch
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Build custom subtasks manually
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              If your event goal is highly specialized, bypass pre-built templates and open the manual task creation workspace directly.
            </p>

            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Sparkles size={14} className="text-amber-500" />
                Manual Flow Highlights:
              </div>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-medium">
                <li>Full control over subtask titles and deadlines</li>
                <li>Assign committee leads and skill tags</li>
                <li>Set Leader-Only restricted permissions</li>
                <li>Zero AI latency or output dependency</li>
              </ul>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="button"
              onClick={onStartFromScratch}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-800 bg-slate-900 py-3 text-xs font-extrabold text-white shadow-md hover:bg-slate-800 transition active:scale-[0.99]"
            >
              <Plus size={16} />
              Start with Blank Workspace
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
