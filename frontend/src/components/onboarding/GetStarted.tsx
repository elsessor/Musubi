"use client";

import { useState } from "react";
import { ArrowRight, BookOpen, Check, Compass, LayoutDashboard, Users, Workflow } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { UserRole } from "@/types/auth";

type Props = {
  role: UserRole;
  hasOrganization: boolean;
  onClose: () => void;
  onContinue?: () => void;
  onExploreOwn?: () => void;
  onWalkthrough?: () => void;
  onFullWalkthrough: () => void;
  onPageGuide?: () => void;
  onHelp: () => void;
  onOrganization: () => void;
};
const sections = [
  { id: "welcome", label: "Welcome" },
  { id: "access", label: "Your access" },
  { id: "workflow", label: "Work flow" },
  { id: "tours", label: "Page tours" }
] as const;
const action = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:text-sm";
const card = "rounded-xl border border-slate-200 bg-white p-3 sm:p-4";

export function GetStarted({ role, hasOrganization, onClose, onContinue, onExploreOwn, onWalkthrough, onFullWalkthrough, onPageGuide, onHelp, onOrganization }: Props) {
  const [section, setSection] = useState<typeof sections[number]["id"]>("welcome");
  const admin = role === "Admin", leader = role === "Student Leader";
  const preview = !admin && !hasOrganization;
  const startWalkthrough = onContinue ?? onWalkthrough;
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent data-tour-help overlayClassName="z-[200] motion-reduce:animate-none" className="z-[201] flex h-[min(42rem,calc(100dvh-2rem))] min-h-0 max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-2xl border-0 bg-slate-50 p-0 text-slate-900 motion-reduce:animate-none [&>button]:text-white sm:max-w-4xl md:h-[min(38rem,85dvh)] md:flex-row md:[&>button]:text-slate-600" onCloseAutoFocus={(event) => { event.preventDefault(); if (!document.querySelector('[data-tour-dialog]')) document.querySelector<HTMLButtonElement>('[data-tour="help"]')?.focus(); }}>
      <aside className="shrink-0 bg-[#17365c] px-3 pb-3 pt-4 text-white sm:px-6 md:flex md:w-60 md:flex-col md:py-7">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200"><Compass aria-hidden="true" className="size-4" />Getting started</div>
        <DialogTitle className="mt-1.5 pr-9 text-lg font-bold tracking-tight sm:text-xl md:mt-5 md:pr-0 md:text-2xl">Welcome to Musubi</DialogTitle>
        <DialogDescription className="sr-only text-blue-100 sm:not-sr-only sm:mt-2 sm:text-xs sm:leading-5 md:text-sm md:leading-6">Learn your workspace, understand your access, and follow the guides at your own pace.</DialogDescription>
        <nav aria-label="Getting started sections" className="mt-2 grid grid-cols-4 gap-1 md:mt-7 md:flex md:flex-col md:gap-2">
          {sections.map((item, index) => <button key={item.id} type="button" aria-current={section === item.id ? "step" : undefined} onClick={() => setSection(item.id)} className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-center text-[10px] font-semibold leading-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:text-xs md:w-full md:flex-row md:justify-start md:gap-2 md:px-3 md:text-left ${section === item.id ? "bg-white/15 text-white" : "text-blue-100 hover:bg-white/10"}`}><span aria-hidden="true" className="shrink-0 font-mono text-blue-100">0{index + 1}</span><span>{item.label}</span></button>)}
        </nav>
        <p className="mt-auto hidden pt-8 text-xs leading-5 text-blue-200 md:block">Reopen this guide from Get Started in Help / User Guide. Use Full Walkthrough to restart the tour.</p>
      </aside>
      <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)_auto] md:grid-rows-[auto_minmax(0,1fr)_auto]">
        <header className="hidden border-b border-slate-200 bg-white px-6 py-4 md:block"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Musubi workspace</p><p className="mt-1 text-sm text-slate-600">Getting started guide</p></header>
        <section aria-label={sections.find((item) => item.id === section)!.label} className="min-h-0 space-y-3 overflow-y-auto overscroll-contain p-3 sm:space-y-4 sm:p-6">
          {section === "welcome" && <>
            <div><h2 className="text-lg font-bold">Your work, in one place</h2><p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm">{admin ? "Musubi brings organization registration, account management, and platform activity into one workspace." : "Musubi helps your organization plan events, assign tasks, and keep members informed."}</p></div>
            <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {[
                { icon: LayoutDashboard, title: "Start with your dashboard", description: admin ? "Review platform statistics and recent administrative activity." : "Review tasks, deadlines, and activity as your organization records work." },
                { icon: Workflow, title: admin ? "Manage the platform" : "Events & Tasks", description: admin ? "Review registration requests and account permissions." : "Review event tasks, schedules, responsibilities, and progress." },
                { icon: Users, title: admin ? "Organizations" : "Your organization", description: admin ? "Browse registered organizations and their membership." : "Find members, committees, and announcements in Organization." }
              ].map(({ icon: Icon, title, description }) => <div key={title} className="flex gap-2.5 p-3 sm:gap-3 sm:p-4"><Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-blue-600 sm:size-5" /><div className="min-w-0"><h3 className="text-xs font-semibold sm:text-sm">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{description}</p></div></div>)}
            </div>
            {preview && <p role="note" className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900">You can follow page tours before joining an organization. Sample cards explain each layout during the tour, then disappear when you finish or skip it.</p>}
          </>}
          {section === "access" && <>
            <div><h2 className="text-lg font-bold">Understand your access</h2><p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm">Your account role is <strong>{role}</strong>. {preview ? "Organization membership is not active yet." : admin ? "You have access to administrative sections." : "Your organization workspace is available."}</p></div>
            <div className={card}><h3 className="text-sm font-semibold">{preview ? "Available before joining" : "Available to your account"}</h3><p className="mt-2 text-xs leading-5 text-slate-600">{preview ? "Explore the dashboard, event views, and Organization tabs. Follow page introductions, take the full walkthrough, and review your profile and available preferences." : admin ? "Review organization applications, manage organizations and accounts, and inspect audit history." : leader ? "Plan events and tasks, review membership requests, organize committees, and publish announcements." : "Review organization updates, claim eligible tasks, and update work assigned to you."}</p></div>
            {preview && <>
              <div className={card}><h3 className="text-sm font-semibold">Available after membership is approved</h3><p className="mt-2 text-xs leading-5 text-slate-600">Your organization&apos;s events, members, committees, and announcements become available. {leader ? "Event creation, task publishing, AI planning, and organization management require active membership." : "Claiming tasks, submitting work, and updating task progress require active membership."}</p></div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">A pending join request does not grant membership. Open Organization to check your request or choose an organization.</div>
              <button type="button" onClick={onOrganization} className={`${action} bg-blue-600 text-white hover:bg-blue-700`}>Open Organization<ArrowRight aria-hidden="true" className="size-4" /></button>
            </>}
          </>}
          {section === "workflow" && <>
            <div><h2 className="text-lg font-bold">How work moves through Musubi</h2><p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm">{preview ? "Review the process here, then start a page tour to explore its layout." : "Follow this sequence to understand where each feature fits."}</p></div>
            <ol className="space-y-3">
              {(admin ? [
                ["Review registration", "Check the organization and requester details before approving or rejecting an application."],
                ["Manage access", "Review accounts, roles, and organization assignments before saving permission changes."],
                ["Monitor activity", "Use platform statistics and audit records to review administrative activity."]
              ] : [
                ["Join your organization", "Submit a join request from Organization and wait for the leader's approval."],
                ["Review the event and its tasks", leader ? "Create an event, define its schedule, and assign tasks. Review any AI task proposals before publishing." : "Open an event and a task to review instructions, deadlines, assignments, and prerequisites."],
                ["Record progress and stay informed", "Update assigned work as it progresses. Review notifications and announcements for changes and reminders."]
              ]).map(([title, description], index) => <li key={title} className={`flex gap-3 ${card}`}><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{index + 1}</span><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{description}</p></div></li>)}
            </ol>
          </>}
          {section === "tours" && <>
            <div><h2 className="text-lg font-bold">Explore with guided instructions</h2><p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm">With guided onboarding enabled, a short introduction appears on your first visit to each page. It highlights the relevant area and explains its purpose.</p></div>
            <div className={card}><BookOpen aria-hidden="true" className="mb-2 size-5 text-blue-600" /><h3 className="text-sm font-semibold">Choose the level of detail</h3><p className="mt-2 text-xs leading-5 text-slate-600">Use the full walkthrough for the main sections, or open Help / User Guide for a page introduction, task guide, or field reference. Use the arrows to move through instructions, or skip at any time.</p><p className="mt-2 text-xs leading-5 text-slate-600">Guides do not save, publish, or approve changes. {preview ? "You can follow them now using the available preview layouts." : "Review any changes before submitting them yourself."}</p></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onFullWalkthrough} className={`${action} bg-blue-600 text-white hover:bg-blue-700`}>Full Walkthrough<ArrowRight aria-hidden="true" className="size-4" /></button>
              {onPageGuide && <button type="button" onClick={onPageGuide} className={`${action} border border-slate-200 bg-white hover:bg-slate-100`}>Replay this page guide</button>}
              <button type="button" onClick={onHelp} className={`${action} border border-slate-200 bg-white hover:bg-slate-100`}>Help / User Guide</button>
            </div>
          </>}
        </section>
        <footer className="space-y-2 border-t border-slate-200 bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:space-y-0 sm:px-6"><p className="text-[11px] leading-4 text-slate-500">Reopen from Help / User Guide → Get Started.</p><div className={`grid min-w-0 gap-2 ${onExploreOwn ? "grid-cols-2" : "grid-cols-1"} sm:flex sm:items-center`}>{onExploreOwn && <button type="button" onClick={onExploreOwn} className={`${action} min-w-0 text-slate-600 hover:bg-slate-100`}>Explore on my own</button>}<button type="button" onClick={startWalkthrough ?? onClose} className={`${action} min-w-0 bg-[#17365c] text-white hover:bg-[#213f68]`}>{startWalkthrough ? <ArrowRight aria-hidden="true" className="hidden size-4 shrink-0 sm:block" /> : <Check aria-hidden="true" className="hidden size-4 shrink-0 sm:block" />}{startWalkthrough ? "Start walkthrough" : "Done"}</button></div></footer>
      </div>
    </DialogContent>
  </Dialog>;
}
