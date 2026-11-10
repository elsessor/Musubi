"use client";

import Link from "next/link";
import { ArrowRight, Building2, Clock3, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import type { MyOrganizationJoinRequest } from "@/services/auth.service";

export function OrganizationMembershipNotice({ request, loading = false, error = "", onRetry, action }: {
  request: MyOrganizationJoinRequest | null;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  action?: ReactNode;
}) {
  const pending = Boolean(request);
  const checking = loading && !request;
  const Icon = pending ? Clock3 : checking ? Loader2 : Building2;
  const title = pending ? "Join request pending" : checking ? "Checking organization status" : error ? "Unable to check join request" : "You haven’t joined an organization yet";
  const badge = pending ? "Pending approval" : checking ? "Checking" : "Not a member";
  return <section role="status" aria-live="polite" aria-atomic="true" className={`flex min-w-0 flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 ${pending ? "border-amber-200 bg-amber-50/80" : "border-slate-200 bg-white"}`}>
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${pending ? "bg-amber-100 text-amber-700" : "bg-blue-50 text-blue-600"}`}><Icon aria-hidden="true" className={`size-5 ${checking ? "animate-spin" : ""}`} /></span>
      <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2"><h2 className="text-sm font-semibold text-slate-900">{title}</h2><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${pending ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{badge}</span></div>
        <p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm">{request ? <>Your request to join <strong className="font-semibold text-slate-800">{request.organizationName.trim() || "the organization"}</strong> has been submitted. You are not a member yet. Events and tasks become available after your request is accepted.</> : checking ? "You are not currently in an organization. We’re checking whether you have a pending join request." : error ? "You are not currently in an organization. Your request status could not be confirmed." : "Join an organization to access its events, tasks, members, and updates."}</p>
        {error && <p className="mt-2 text-xs leading-5 text-amber-800">{error}</p>}
      </div>
    </div>
    {(action !== null || Boolean(error && onRetry)) && <div className="flex shrink-0 flex-wrap items-center gap-2">
      {error && onRetry && <button type="button" onClick={onRetry} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50">Try again</button>}
      {action === undefined ? <Link href="/dashboard/organization" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#213f68] px-4 text-xs font-semibold text-white hover:bg-[#17365c]">{pending ? "View join request" : checking || error ? "View Organization" : "Find an organization"}<ArrowRight aria-hidden="true" className="size-4 shrink-0" /></Link> : action}
    </div>}
  </section>;
}
