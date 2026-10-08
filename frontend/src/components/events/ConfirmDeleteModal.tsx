"use client";

import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { useState } from "react";

type ConfirmDeleteModalProps = {
  itemType: string;
  itemName: string;
  isDeleting?: boolean;
  requireNameConfirmation?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDeleteModal({ itemType, itemName, isDeleting = false, requireNameConfirmation = false, onCancel, onConfirm }: ConfirmDeleteModalProps) {
  const [confirmationName, setConfirmationName] = useState("");
  const canDelete = !isDeleting && (!requireNameConfirmation || confirmationName === itemName);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="presentation">
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-delete-title" className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><AlertTriangle size={20} /></span>
            <div>
              <h2 id="confirm-delete-title" className="text-sm font-bold text-slate-900">Delete this {itemType}?</h2>
              <p className="mt-1 break-words text-xs leading-relaxed text-slate-500">You’re about to delete <strong className="text-slate-700">{itemName}</strong>. This action can’t be undone.</p>
            </div>
          </div>
          <button type="button" onClick={onCancel} disabled={isDeleting} aria-label="Close confirmation" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X size={16} /></button>
        </div>
        {requireNameConfirmation && (
          <label className="mt-4 block text-xs font-semibold text-slate-700">
            Type the event title exactly to confirm deletion:
            <span className="mt-1 block break-words font-bold text-slate-900">{itemName}</span>
            <input
              autoFocus
              value={confirmationName}
              onChange={(event) => setConfirmationName(event.target.value)}
              disabled={isDeleting}
              autoComplete="off"
              spellCheck={false}
              placeholder="Enter the event title"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:opacity-60"
            />
          </label>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={isDeleting} className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button type="button" onClick={() => { if (canDelete) onConfirm(); }} disabled={!canDelete} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">
            {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
