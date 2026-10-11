"use client";

import { Archive, Loader2, X } from "lucide-react";
import { useId, useState } from "react";

export function ConfirmArchiveModal({ itemType, itemName, isArchiving = false, onCancel, onConfirm }: {
  itemType: string;
  itemName: string;
  isArchiving?: boolean;
  onCancel: () => void;
  onConfirm: () => void | boolean | Promise<void | boolean>;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = busy || isArchiving;
  async function confirm() {
    if (pending) return;
    setBusy(true);
    setError("");
    try { await onConfirm(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to archive. Please try again."); }
    finally { setBusy(false); }
  }
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Archive size={20} /></span>
          <div className="min-w-0 flex-1">
            <h2 id={`${id}-title`} className="text-sm font-bold text-slate-900">Archive this {itemType}?</h2>
            <p id={`${id}-description`} className="mt-1 break-words text-xs leading-relaxed text-slate-500"><strong className="text-slate-700">{itemName}</strong> will move out of the active views. Its details and history will be kept, and you can restore it later.</p>
          </div>
          <button type="button" onClick={onCancel} disabled={pending} aria-label="Close confirmation" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X size={16} /></button>
        </div>
        {error ? <p role="alert" className="mt-3 text-xs text-rose-600">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={pending} className="min-h-10 rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button type="button" onClick={() => { void confirm(); }} disabled={pending} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#213f68] px-3.5 text-xs font-bold text-white hover:bg-[#1a3254] disabled:opacity-50">
            {pending ? <Loader2 size={13} className="animate-spin" /> : <Archive size={13} />}{pending ? "Archiving..." : "Archive"}
          </button>
        </div>
      </div>
    </div>
  );
}
