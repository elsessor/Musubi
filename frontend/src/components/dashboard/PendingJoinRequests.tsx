"use client";

import { UserPlus } from "lucide-react";
import type { OrganizationJoinRequest } from "@/services/auth.service";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { MemberAvatar } from "./MemberAvatar";

export function PendingJoinRequests({ requests, reviewingRequestId, onReview }: {
  requests: OrganizationJoinRequest[];
  reviewingRequestId: string;
  onReview: (id: string, status: "accepted" | "rejected") => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:w-auto"
        >
          <UserPlus className="size-4 shrink-0" />
          Pending requests
          <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[11px] font-bold">{requests.length}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[80dvh] min-h-0 max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b border-slate-100 px-3 py-3 pr-12 text-left sm:px-5 sm:py-4 sm:pr-12">
          <DialogTitle className="text-base text-slate-900">Pending join requests ({requests.length})</DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-slate-500">
            Review requests to join your organization.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5 sm:p-4">
          {requests.length ? (
            <ul className="space-y-2">
              {requests.map((request) => (
                <li key={request.id} aria-busy={reviewingRequestId === request.id} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-start gap-x-2 rounded-xl border border-slate-200 bg-slate-50/50 p-2 sm:grid-cols-[28px_minmax(0,1fr)_auto] sm:gap-x-2.5 sm:p-2.5">
                  <MemberAvatar member={{ name: request.name }} className="size-6 shrink-0 sm:size-7" />
                  <div className="min-w-0">
                    <p className="break-words text-[13px] font-semibold leading-5 text-slate-900">{request.name}</p>
                    <p className="break-words text-[11px] leading-4 text-slate-500">{request.position}</p>
                    <p className="break-words text-[11px] leading-4 text-slate-500 [overflow-wrap:anywhere]">{request.email}</p>
                    {reviewingRequestId === request.id ? <span role="status" className="text-[11px] text-slate-500">Reviewing request...</span> : null}
                  </div>
                  <div className="col-start-3 row-start-1 flex flex-col gap-1 self-center sm:flex-row sm:items-center sm:gap-1.5">
                    <button
                      type="button"
                      disabled={Boolean(reviewingRequestId)}
                      onClick={() => onReview(request.id, "rejected")}
                      aria-label={`Decline ${request.name}'s join request`}
                      className="min-h-8 rounded-lg border border-rose-200 bg-white px-2.5 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(reviewingRequestId)}
                      onClick={() => onReview(request.id, "accepted")}
                      aria-label={`Accept ${request.name}'s join request`}
                      className="min-h-8 rounded-lg bg-emerald-600 px-2.5 text-[11px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Accept
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-8 text-center">
              <UserPlus className="mx-auto size-7 text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-800">No pending join requests</p>
              <p className="mt-1 text-xs text-slate-500">New requests will appear here.</p>
            </div>
          )}
        </div>
        <DialogFooter className="shrink-0 flex-row justify-end border-t border-slate-100 px-3 py-2 sm:px-5 sm:py-3">
          <DialogClose asChild>
            <button type="button" className="min-h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 sm:min-h-11">
              Close
            </button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
