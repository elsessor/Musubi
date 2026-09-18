"use client";

import { AlertOctagon, CheckCircle2, X } from "lucide-react";
import { useState } from "react";
import type { EventStatus } from "./types";

type EventStatusModalProps = {
  eventTitle: string;
  targetStatus: "Completed" | "Cancelled";
  onClose: () => void;
  onConfirm: (targetStatus: EventStatus, notes?: string) => void;
};

export function EventStatusModal({
  eventTitle,
  targetStatus,
  onClose,
  onConfirm
}: EventStatusModalProps) {
  const [notes, setNotes] = useState("");
  const isComplete = targetStatus === "Completed";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onConfirm(targetStatus, notes.trim());
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
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
            <h3 className="text-base font-extrabold text-slate-900">
              {isComplete ? "Mark Event as Completed" : "Cancel Event Confirmation"}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Updating event state for &quot;{eventTitle}&quot;
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          {isComplete
            ? "Are you sure you want to mark this event as Completed? Event progress will be set to 100% and all subtasks archived into council records."
            : "Are you sure you want to cancel this event? The event status will be updated to Cancelled and recorded in the audit log."}
        </p>

        {/* Notes form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              {isComplete ? "Completion Summary (Optional)" : "Cancellation Reason (Optional)"}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isComplete
                  ? "e.g. All event activities successfully concluded and reported."
                  : "e.g. Cancelled due to venue scheduling conflicts."
              }
              className="w-full resize-none rounded-2xl border border-slate-200 bg-[#f8fafc] p-3 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Back
            </button>
            <button
              type="submit"
              className={`rounded-2xl py-2.5 text-xs font-bold text-white shadow-md transition ${
                isComplete
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {isComplete ? "Confirm Completed" : "Confirm Cancellation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
