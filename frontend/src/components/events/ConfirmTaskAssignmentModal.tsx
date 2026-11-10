"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { UserRoundPlus, Loader2, X } from "lucide-react";
import type { Task } from "./types";

export function ConfirmTaskAssignmentModal({ task, pending, error, disabled = false, onCancel, onConfirm }: {
  task: Task;
  pending: boolean;
  error?: string;
  disabled?: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <AlertDialog.Root open onOpenChange={(open) => { if (!open && !pending) onCancel(); }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm" />
        <AlertDialog.Content onEscapeKeyDown={(event) => { if (pending) event.preventDefault(); }}
          className="fixed left-1/2 top-1/2 z-[70] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><UserRoundPlus size={20} /></span>
            <div className="min-w-0 flex-1">
              <AlertDialog.Title className="text-sm font-bold text-slate-900">Assign this task to yourself?</AlertDialog.Title>
              <AlertDialog.Description className="mt-1 break-words text-xs leading-relaxed text-slate-500">
                <strong className="text-slate-700">{task.title || "Untitled task"}</strong> will be assigned to you. It will remain To Do until you start working. Any prerequisites must be completed first.
              </AlertDialog.Description>
            </div>
            <AlertDialog.Cancel asChild>
              <button type="button" disabled={pending} aria-label="Close confirmation" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X size={16} /></button>
            </AlertDialog.Cancel>
          </div>
          {error ? <p role="alert" className="mt-3 break-words text-xs text-rose-600">{error}</p> : null}
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button type="button" disabled={pending} className="min-h-10 rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            </AlertDialog.Cancel>
            <button type="button" onClick={() => { if (!pending && !disabled) void onConfirm(); }} disabled={pending || disabled}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {pending ? <Loader2 size={13} className="animate-spin" /> : <UserRoundPlus size={13} />}{pending ? "Assigning..." : "Confirm assignment"}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
