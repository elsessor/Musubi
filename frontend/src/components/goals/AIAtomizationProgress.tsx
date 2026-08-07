"use client";

import { CheckCircle2, Loader2, Sparkles, XCircle, AlertCircle, Clock } from "lucide-react";
import { useEffect, useState } from "react";

import type { GoalDraft, PromptChainStep } from "@/types/goal";
import { Button } from "@/components/ui/Button";

interface AIAtomizationProgressProps {
  goal: GoalDraft;
  steps: PromptChainStep[];
  currentStepIndex: number;
  onCancel: () => void;
}

export function AIAtomizationProgress({
  goal,
  steps,
  currentStepIndex,
  onCancel
}: AIAtomizationProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const totalSteps = steps.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  return (
    <div className="rounded-2xl border border-blue-200 bg-white p-6 sm:p-8 shadow-xl ring-1 ring-blue-500/10 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="relative flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md">
            <Sparkles className="size-6 text-amber-300 animate-pulse" />
            <span className="absolute -bottom-1 -right-1 flex size-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-4 bg-blue-500 border-2 border-white"></span>
            </span>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">AI Task Atomization in Progress</h3>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Goal: <span className="text-blue-900 underline font-bold">{goal.title}</span>
            </p>
          </div>
        </div>

        {/* Timer & Status */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
            <Clock className="size-3.5 text-slate-500" />
            <span>00:{elapsedSeconds.toString().padStart(2, "0")}</span>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="h-9 px-3 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <XCircle className="size-4 text-rose-600" />
            Cancel Generation
          </Button>
        </div>
      </div>

      {/* Main Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-600">
          <span>Prompt Chaining Sequence ({completedCount}/{totalSteps} Steps)</span>
          <span className="text-blue-700 font-extrabold">{progressPercent}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-700 transition-all duration-500 ease-out shadow-sm"
            style={{ width: `${Math.max(5, progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Multi-Stage Loading Steps Cards */}
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const isCompleted = step.status === "completed";
          const isInProgress = step.status === "in_progress";
          const isPending = step.status === "idle";
          const isError = step.status === "error";

          return (
            <div
              key={step.id}
              className={`flex items-start gap-4 rounded-xl border p-4 transition-all duration-300 ${
                isInProgress
                  ? "border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-400/20"
                  : isCompleted
                  ? "border-emerald-200 bg-emerald-50/30"
                  : isError
                  ? "border-rose-200 bg-rose-50/30"
                  : "border-slate-200/80 bg-slate-50/40 opacity-70"
              }`}
            >
              {/* Icon */}
              <div className="mt-0.5 shrink-0">
                {isCompleted && <CheckCircle2 className="size-6 text-emerald-600" />}
                {isInProgress && <Loader2 className="size-6 text-blue-600 animate-spin" />}
                {isPending && (
                  <div className="flex size-6 items-center justify-center rounded-full border-2 border-slate-300 text-xs font-bold text-slate-400">
                    {idx + 1}
                  </div>
                )}
                {isError && <AlertCircle className="size-6 text-rose-600" />}
              </div>

              {/* Text & Metadata */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`text-sm font-bold ${
                    isInProgress ? "text-blue-950" : isCompleted ? "text-slate-900" : "text-slate-600"
                  }`}>
                    {step.label}
                  </h4>

                  {/* Step status badge */}
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                    isCompleted
                      ? "bg-emerald-100 text-emerald-800"
                      : isInProgress
                      ? "bg-blue-100 text-blue-800 animate-pulse"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {isCompleted ? "Completed" : isInProgress ? "Active..." : "Pending"}
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-500 line-clamp-1">{step.description}</p>

                {/* Step detail note */}
                {step.details && (
                  <p className="mt-1.5 text-[11px] font-mono font-medium text-slate-600 bg-white/70 rounded px-2 py-1 border border-slate-200/60 inline-block">
                    {step.details}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <Sparkles className="size-4 text-blue-500 shrink-0" />
        <span>
          Prompt chain model: <strong>Musubi Atomizer v2.4</strong> • Simulating prompt steps in real time...
        </span>
      </div>
    </div>
  );
}
