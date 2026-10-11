"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Sparkles, Star, X } from "lucide-react";
import type { Task } from "./types";
import { TaskAttachments } from "./TaskAttachments";
import { CustomSelect } from "@/components/ui/CustomSelect";

export type TaskRatingModalProps = {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  initialTaskId?: string;
  onRate: (taskId: string, rating: number, feedback: string) => Promise<void>;
};

const RATING_DESCRIPTIONS: Record<number, { text: string; color: string }> = {
  0: { text: "Select 1 to 5 stars", color: "text-slate-500 bg-slate-50 border-slate-200" },
  1: { text: "1 / 5 — Unreliable / Needs Major Improvement", color: "text-rose-700 bg-rose-50 border-rose-200" },
  2: { text: "2 / 5 — Below Expectations", color: "text-amber-700 bg-amber-50 border-amber-200" },
  3: { text: "3 / 5 — Satisfactory Completion", color: "text-slate-700 bg-slate-100 border-slate-200" },
  4: { text: "4 / 5 — Great Work & Timely", color: "text-blue-700 bg-blue-50 border-blue-200" },
  5: { text: "5 / 5 — Outstanding Execution", color: "text-emerald-700 bg-emerald-50 border-emerald-200" }
};

export function TaskRatingModal({ eventId, isOpen, onClose, tasks, initialTaskId, onRate }: TaskRatingModalProps) {
  const modalId = useId();
  const [selectedTaskId, setSelectedTaskId] = useState(initialTaskId || tasks[0]?.id || "");
  const [drafts, setDrafts] = useState<Record<string, { rating: number; feedback: string }>>({});
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [viewport, setViewport] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPortalTarget(document.body);
    const visibleViewport = window.visualViewport;
    function updateViewport() {
      setViewport({
        top: visibleViewport?.offsetTop ?? 0,
        left: visibleViewport?.offsetLeft ?? 0,
        width: visibleViewport?.width ?? window.innerWidth,
        height: visibleViewport?.height ?? window.innerHeight
      });
    }
    updateViewport();
    visibleViewport?.addEventListener("resize", updateViewport);
    visibleViewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    return () => {
      visibleViewport?.removeEventListener("resize", updateViewport);
      visibleViewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, [isOpen]);

  const task = tasks.find((submission) => submission.id === selectedTaskId) || tasks[0];
  if (!isOpen || !task || !portalTarget) return null;

  const selectedIndex = tasks.findIndex((submission) => submission.id === task.id);
  const { rating, feedback } = drafts[task.id] || { rating: task.performanceReview?.rating ?? 0, feedback: task.performanceReview?.feedback || "" };
  const activeRating = hoverRating || rating;
  const currentDesc = RATING_DESCRIPTIONS[activeRating] || RATING_DESCRIPTIONS[0];
  const hasRating = Number.isInteger(rating) && rating >= 1 && rating <= 5;
  const assigneeName = task.assignee?.name || task.assignedMemberName || "Organization Member";
  const assigneeInitials = task.assignee?.initials || assigneeName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  function selectTask(taskId: string) {
    if (isSubmitting) return;
    setSelectedTaskId(taskId);
    setHoverRating(0);
    setError("");
  }

  function updateDraft(change: Partial<{ rating: number; feedback: string }>) {
    setDrafts((current) => ({ ...current, [task.id]: { ...(current[task.id] || { rating, feedback }), ...change } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    if (!hasRating) {
      setError("Select a star rating before submitting.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await onRate(task.id, rating, feedback);
      setDrafts((current) => {
        const remaining = { ...current };
        delete remaining[task.id];
        return remaining;
      });
      const nextTask = tasks[selectedIndex + 1] || tasks.find((submission) => submission.id !== task.id);
      if (nextTask) {
        setSelectedTaskId(nextTask.id);
        setHoverRating(0);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "The rating could not be saved. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-900/50 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xs sm:p-4"
      style={viewport || undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${modalId}-title`}
    >
      <div className="grid h-[min(36rem,80%)] max-h-full w-full min-h-0 min-w-0 max-w-lg grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-2xl bg-white shadow-xl border border-slate-200 sm:h-[min(40rem,85%)]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 sm:px-6 sm:py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              STUDENT LEADER REVIEW
            </p>
            <h2 id={`${modalId}-title`} className="break-words text-sm font-extrabold leading-snug text-slate-900 sm:text-base">
              Rate Member Task Performance
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close task rating"
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form content */}
        <form onSubmit={handleSubmit} className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
          <div className="min-h-0 min-w-0 space-y-3 overflow-y-auto overscroll-contain px-3 py-3 sm:space-y-4 sm:px-6 sm:py-4">
          <section aria-label="Select submission" className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-700">Select submission</h3>
            <CustomSelect
              value={task.id}
              onChange={selectTask}
              disabled={isSubmitting}
              options={tasks.map((submission) => {
                const name = submission.assignee?.name || submission.assignedMemberName || "Organization Member";
                const count = submission.attachments?.length || 0;
                return {
                  value: submission.id,
                  label: name,
                  description: `${submission.title} · ${count} attachment${count === 1 ? "" : "s"}`,
                  initials: submission.assignee?.initials || name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
                  color: "bg-[#213f68]"
                };
              })}
              buttonClassName="min-h-11 rounded-xl bg-white"
              dropdownClassName="[&_button]:min-h-11"
              portal
            />
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 sm:gap-2">
              <button type="button" disabled={isSubmitting || selectedIndex === 0} onClick={() => selectTask(tasks[selectedIndex - 1].id)} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg px-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 sm:px-2">
                <ChevronLeft size={14} className="shrink-0" /> Previous
              </button>
              <p role="status" className="min-w-0 text-center text-[11px] leading-4 text-slate-500">{selectedIndex + 1} of {tasks.length} awaiting review</p>
              <button type="button" disabled={isSubmitting || selectedIndex === tasks.length - 1} onClick={() => selectTask(tasks[selectedIndex + 1].id)} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg px-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 sm:px-2">
                Next <ChevronRight size={14} className="shrink-0" />
              </button>
            </div>
          </section>

          {/* Member & Task Context Card */}
          <div className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200/80 p-3 sm:items-center">
            <div className="flex min-w-0 flex-1 basis-40 items-start gap-2 sm:items-center sm:gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#213f68] text-xs font-bold text-white">
                {assigneeInitials}
              </span>
              <div className="min-w-0">
                <p className="break-words text-xs font-bold text-slate-900 [overflow-wrap:anywhere]">{assigneeName}</p>
                <p className="mt-0.5 break-words text-[11px] font-medium leading-5 text-slate-500 [overflow-wrap:anywhere]">
                  {task.title}
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              Completed
            </span>
          </div>

          {task.description ? <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-600 [overflow-wrap:anywhere] sm:text-xs sm:leading-relaxed">{task.description}</p> : null}
          <TaskAttachments key={task.id} eventId={eventId} task={task} canAdd={false} />

          {/* Star Rating Selector */}
          <div className="space-y-2 text-center py-1">
            <p id={`${modalId}-rating-label`} className="block text-xs font-semibold text-slate-700">
              Performance Rating (1 to 5 Stars)
            </p>
            <div role="group" aria-labelledby={`${modalId}-rating-label`} className="flex justify-center items-center gap-0.5 py-1 sm:gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= (hoverRating || rating);
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => { updateDraft({ rating: star }); setError(""); }}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`Rate ${star} ${star === 1 ? "star" : "stars"}`}
                    aria-pressed={rating === star}
                    disabled={isSubmitting}
                    className="flex size-11 shrink-0 items-center justify-center rounded-lg transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    <Star
                      size={26}
                      className={
                        isFilled
                          ? "fill-amber-400 text-amber-500"
                          : "fill-slate-100 text-slate-300"
                      }
                    />
                  </button>
                );
              })}
            </div>

            {/* Rating description badge */}
            <div className={`inline-block max-w-full rounded-md border px-3 py-1 text-xs font-semibold transition-all ${currentDesc.color}`}>
              {currentDesc.text}
            </div>
          </div>

          {/* Leader Feedback Textarea */}
          <div>
            <label htmlFor={`${modalId}-feedback`} className="block text-xs font-semibold text-slate-700 mb-1.5">
              Leader Feedback &amp; AI Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id={`${modalId}-feedback`}
              value={feedback}
              disabled={isSubmitting}
              onChange={(e) => updateDraft({ feedback: e.target.value })}
              placeholder="Add review notes regarding quality, accuracy, and timeliness..."
              rows={3}
              className="min-h-24 w-full resize-y rounded-xl border border-slate-200 p-3 text-base text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#2868ed] focus:ring-1 focus:ring-[#2868ed] sm:text-xs"
            />
          </div>

          {/* Clean Information Notice */}
          <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 border border-slate-200 text-slate-600">
            <Sparkles size={14} className="text-slate-400 shrink-0 mt-0.5" />
            <p className="min-w-0 break-words text-[11px] leading-relaxed [overflow-wrap:anywhere]">
              Submitting this rating updates <strong className="font-semibold text-slate-800">{assigneeName}&apos;s profile metrics</strong> and trains the heuristic delegation model for future task recommendations.
            </p>
          </div>

          {error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</p> : null}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 items-center gap-2 border-t border-slate-100 bg-white px-3 py-2.5 sm:flex sm:justify-end sm:px-6 sm:py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-11 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !hasRating}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#213f68] hover:bg-[#1a3254] px-3 py-2 text-xs font-semibold text-white shadow-xs active:scale-98 transition disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer sm:px-4"
            >
              {isSubmitting ? (
                "Saving..."
              ) : (
                <>
                  <Star size={14} className="fill-white" /> Submit Rating
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    portalTarget
  );
}
