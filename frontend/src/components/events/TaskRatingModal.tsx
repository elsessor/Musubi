"use client";

import { useState } from "react";
import { Check, Sparkles, Star, X } from "lucide-react";
import type { Task } from "./types";

export type TaskRatingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onRate: (taskId: string, rating: number, feedback: string) => Promise<void>;
};

const RATING_DESCRIPTIONS: Record<number, { text: string; color: string }> = {
  1: { text: "1 / 5 — Unreliable / Needs Major Improvement", color: "text-rose-700 bg-rose-50 border-rose-200" },
  2: { text: "2 / 5 — Below Expectations", color: "text-amber-700 bg-amber-50 border-amber-200" },
  3: { text: "3 / 5 — Satisfactory Completion", color: "text-slate-700 bg-slate-100 border-slate-200" },
  4: { text: "4 / 5 — Great Work & Timely", color: "text-blue-700 bg-blue-50 border-blue-200" },
  5: { text: "5 / 5 — Outstanding Execution", color: "text-emerald-700 bg-emerald-50 border-emerald-200" }
};

export function TaskRatingModal({ isOpen, onClose, task, onRate }: TaskRatingModalProps) {
  const [rating, setRating] = useState<number>(task?.performanceReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>((task?.performanceReview as any)?.feedback || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !task) return null;

  const activeRating = hoverRating || rating;
  const currentDesc = RATING_DESCRIPTIONS[activeRating] || RATING_DESCRIPTIONS[5];
  const assigneeName = task.assignee?.name || task.assignedMemberName || "Organization Member";
  const assigneeInitials = task.assignee?.initials || assigneeName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onRate(task!.id, rating, feedback);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error("Failed to rate task:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rating-modal-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              STUDENT LEADER REVIEW
            </p>
            <h2 id="rating-modal-title" className="text-base font-extrabold text-slate-900">
              Rate Member Task Performance
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form content */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* Member & Task Context Card */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200/80 p-3">
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#213f68] text-xs font-bold text-white">
                {assigneeInitials}
              </span>
              <div>
                <p className="text-xs font-bold text-slate-900">{assigneeName}</p>
                <p className="text-[11px] text-slate-500 line-clamp-1 font-medium mt-0.5">
                  {task.title}
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              Completed
            </span>
          </div>

          {/* Star Rating Selector */}
          <div className="space-y-2 text-center py-1">
            <label className="block text-xs font-semibold text-slate-700">
              Performance Rating (1 to 5 Stars)
            </label>
            <div className="flex justify-center items-center gap-1.5 py-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= (hoverRating || rating);
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform transform hover:scale-110 focus:outline-none cursor-pointer"
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
            <div className={`inline-block rounded-md border px-3 py-1 text-xs font-semibold transition-all ${currentDesc.color}`}>
              {currentDesc.text}
            </div>
          </div>

          {/* Leader Feedback Textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Leader Feedback &amp; AI Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Add review notes regarding quality, accuracy, and timeliness..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#2868ed] focus:ring-1 focus:ring-[#2868ed]"
            />
          </div>

          {/* Clean Information Notice */}
          <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 border border-slate-200 text-slate-600">
            <Sparkles size={14} className="text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Submitting this rating updates <strong className="font-semibold text-slate-800">{assigneeName}&apos;s profile metrics</strong> and trains the heuristic delegation model for future task recommendations.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isSuccess}
              className="flex items-center gap-1.5 rounded-xl bg-[#213f68] hover:bg-[#1a3254] px-4 py-2 text-xs font-semibold text-white shadow-xs active:scale-98 transition disabled:opacity-50 cursor-pointer"
            >
              {isSuccess ? (
                <>
                  <Check size={14} /> Saved Rating
                </>
              ) : isSubmitting ? (
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
    </div>
  );
}
