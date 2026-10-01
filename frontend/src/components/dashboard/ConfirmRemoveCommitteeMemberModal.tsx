"use client";

import { AlertTriangle, Loader2, UserRoundX, X } from "lucide-react";

type ConfirmRemoveCommitteeMemberModalProps = {
  memberName: string;
  committeeName: string;
  organizationRemoval?: boolean;
  isRemoving?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmRemoveCommitteeMemberModal({
  memberName,
  committeeName,
  organizationRemoval = false,
  isRemoving = false,
  onCancel,
  onConfirm
}: ConfirmRemoveCommitteeMemberModalProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="presentation">
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-remove-member-title" className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><AlertTriangle size={20} /></span>
            <div>
              <h2 id="confirm-remove-member-title" className="text-sm font-bold text-slate-900">Remove this member?</h2>
              <p className="mt-1 break-words text-xs leading-relaxed text-slate-500">
                {organizationRemoval ? <><strong className="text-slate-700">{memberName}</strong> will be removed from the organization and unassigned from any committee. Their account will remain active.</> : <><strong className="text-slate-700">{memberName}</strong> will be unassigned from <strong className="text-slate-700">{committeeName}</strong>. They will remain in the organization.</>}
              </p>
            </div>
          </div>
          <button type="button" onClick={onCancel} disabled={isRemoving} aria-label="Close confirmation" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X size={16} /></button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={isRemoving} className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={isRemoving} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:cursor-wait disabled:opacity-70">
            {isRemoving ? <Loader2 size={13} className="animate-spin" /> : <UserRoundX size={13} />}
            {isRemoving ? "Removing..." : "Remove member"}
          </button>
        </div>
      </div>
    </div>
  );
}
