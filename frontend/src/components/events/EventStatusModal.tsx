"use client";

import { AlertOctagon, CheckCircle2, X } from "lucide-react";
import { useState } from "react";
import type { EventStatus } from "./types";

type EventStatusModalProps = {
  eventTitle: string;
  targetStatus: "Completed" | "Cancelled";
  unfinishedTaskCount?: number;
  onClose: () => void;
  onConfirm: (targetStatus: EventStatus) => void | Promise<void>;
};

export function EventStatusModal({
  eventTitle,
  targetStatus,
  unfinishedTaskCount = 0,
  onClose,
  onConfirm
}: EventStatusModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isComplete = targetStatus === "Completed";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await onConfirm(targetStatus);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save the event status.");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div role="alertdialog" aria-modal="true" aria-labelledby="event-status-confirm-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span
            className={`flex size-10 items-center justify-center rounded-2xl font-bold ${
              isComplete ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
            }`}
          >
            {isComplete ? <CheckCircle2 size={22} /> : <AlertOctagon size={22} />}
          </span>
          <div className="flex-1">
            <h3 id="event-status-confirm-title" className="text-base font-extrabold text-slate-900">
              {isComplete ? "Mark Event as Completed" : "Cancel Event Confirmation"}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Updating event state for &quot;{eventTitle}&quot;
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close confirmation" className="text-slate-400 hover:text-slate-600 disabled:opacity-50">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          {isComplete
            ? `Mark this event as Completed? Progress will be set to 100%. ${unfinishedTaskCount > 0 ? `${unfinishedTaskCount} unfinished subtask${unfinishedTaskCount === 1 ? "" : "s"} will also be marked Completed.` : "All subtasks are already completed."}`
            : `Cancel this event? ${unfinishedTaskCount > 0 ? `${unfinishedTaskCount} unfinished subtask${unfinishedTaskCount === 1 ? "" : "s"} will keep their current statuses.` : "Subtask statuses will stay the same."}`}
        </p>

        {/* Confirmation actions */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-2xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`rounded-2xl py-2.5 text-xs font-bold text-white shadow-md transition ${
                isComplete
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {saving ? "Saving..." : isComplete ? "Confirm Completed" : "Confirm Cancellation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
