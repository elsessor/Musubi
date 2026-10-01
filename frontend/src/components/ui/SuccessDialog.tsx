"use client";

import { Check } from "lucide-react";

type SuccessDialogProps = {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
};

export function SuccessDialog({ title, description, actionLabel, onAction }: SuccessDialogProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="presentation">
      <section
        aria-labelledby="success-dialog-title"
        aria-describedby="success-dialog-description"
        aria-modal="true"
        className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-2xl sm:p-8"
        role="dialog"
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="size-7" strokeWidth={2.5} />
        </div>
        <h2 id="success-dialog-title" className="mt-5 text-xl font-bold text-slate-900">{title}</h2>
        <p id="success-dialog-description" className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
        <button
          type="button"
          autoFocus
          onClick={onAction}
          className="mt-6 w-full rounded-xl bg-[#244775] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#193960] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#244775] focus-visible:ring-offset-2"
        >
          {actionLabel}
        </button>
      </section>
    </div>
  );
}
