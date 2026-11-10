"use client";

import { ArrowRight, Compass } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function WelcomeOnboarding({ name, admin, onStart, onDismiss }: { name: string; admin: boolean; onStart: () => void; onDismiss: () => void }) {
  const firstName = name.trim().split(/\s+/)[0];
  return <Dialog open onOpenChange={(open) => { if (!open) onDismiss(); }}>
    <DialogContent data-tour-help overlayClassName="z-[200] motion-reduce:animate-none" className="z-[201] flex max-h-[85dvh] max-w-[calc(100vw-2rem)] flex-col gap-4 overflow-y-auto rounded-2xl border-slate-200 bg-white p-5 text-slate-900 motion-reduce:animate-none sm:max-w-md sm:p-6" onCloseAutoFocus={(event) => { event.preventDefault(); if (!document.querySelector('[data-tour-dialog]')) document.querySelector<HTMLButtonElement>('[data-tour="help"]')?.focus(); }}>
      <Compass aria-hidden="true" className="size-10 rounded-xl bg-blue-50 p-2 text-blue-700" />
      <DialogTitle className="pr-5 text-xl font-bold leading-7">Welcome to Musubi{firstName ? `, ${firstName}` : ""}!</DialogTitle>
      <DialogDescription className="text-sm leading-6 text-slate-600">{admin ? "Review organizations, accounts, and platform activity in one workspace." : "Plan campus events, coordinate tasks, and stay connected with your organization."} Start with a quick look at the navigation. Short page guides will follow as you explore.</DialogDescription>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onStart} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#213f68] px-4 py-2 text-sm font-semibold text-white hover:bg-[#17365c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Let&apos;s Get Started<ArrowRight aria-hidden="true" className="size-4" /></button>
        <button type="button" onClick={onDismiss} className="min-h-11 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">Explore on My Own</button>
      </div>
      <p className="text-xs leading-5 text-slate-500">You can skip any tour, or restart onboarding from Help Center at any time.</p>
    </DialogContent>
  </Dialog>;
}
