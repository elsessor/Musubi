"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock3, Mail, X } from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { getOrganizationRequests, reviewOrganizationRequest } from "@/services/auth.service";
import { useLogout } from "@/hooks/useLogout";
import { useAuthStore } from "@/store/authStore";
import { getDashboardNavItems } from "@/utils/routes";

type RequestStatus = "pending" | "approved" | "rejected";
type OrganizationRequest = {
  id: string;
  orgName: string;
  orgType: string;
  description: string;
  status: RequestStatus;
  rejectionReason?: string;
  submittedAt: string;
  requestedBy: { uid: string; name: string; email: string };
};

const statusStyles: Record<RequestStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200"
};

function formatGreetingDate() {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());
}

function formatSubmittedAt(value: unknown): string {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(value.toDate());
  }
  return "Date unavailable";
}

function parseStatus(value: unknown): RequestStatus {
  return value === "approved" || value === "rejected" ? value : "pending";
}

export default function AdminOrgRequestsPage() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const loading = useAuthStore((state) => state.loading);
  const logout = useLogout();
  const [requests, setRequests] = useState<OrganizationRequest[]>([]);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestError, setRequestError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [filter, setFilter] = useState<RequestStatus | "all">("pending");
  const [selectedRequest, setSelectedRequest] = useState<OrganizationRequest | null>(null);
  const [dialog, setDialog] = useState<"details" | "approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (!loading && (!profile || profile.role !== "Admin")) router.replace(profile ? "/dashboard" : "/sign-in");
  }, [loading, profile, router]);

  useEffect(() => {
    if (!profile || profile.role !== "Admin" || !firebaseUser) return;
    let cancelled = false;
    void getOrganizationRequests(firebaseUser).then((records) => {
      if (cancelled) return;
      setRequests(records.map((record) => ({ ...record, status: parseStatus(record.status), rejectionReason: record.rejectionReason ?? undefined, submittedAt: record.submittedAt ? formatSubmittedAt({ toDate: () => new Date(record.submittedAt as string) }) : "Date unavailable" })));
      setRequestError("");
    }).catch(() => { if (!cancelled) setRequestError("Unable to load organization requests. Please try again."); }).finally(() => { if (!cancelled) setRequestsLoading(false); });
    return () => { cancelled = true; };
  }, [firebaseUser, profile]);

  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const visibleRequests = useMemo(() => requests.filter((request) => filter === "all" || request.status === filter), [filter, requests]);
  const navItems = useMemo(() => getDashboardNavItems("Admin").map((item) => item.id === "org-requests" ? { ...item, badge: pendingCount || undefined } : item), [pendingCount]);

  function openDetails(request: OrganizationRequest) {
    setSelectedRequest(request);
    setRejectionReason(request.rejectionReason ?? "");
    setDialog("details");
  }

  async function updateStatus(status: RequestStatus) {
    if (!selectedRequest) return;
    setIsUpdating(true);
    try {
      if (!firebaseUser) throw new Error("Your session has expired.");
      await reviewOrganizationRequest(firebaseUser, selectedRequest.id, status === "approved" ? "approved" : "rejected", status === "rejected" ? rejectionReason.trim() : null);
      setRequests((current) => current.map((request) => request.id === selectedRequest.id ? { ...request, status, rejectionReason: status === "rejected" ? rejectionReason.trim() : undefined } : request));
      setSelectedRequest(null);
      setDialog(null);
      setRejectionReason("");
    } catch {
      setRequestError("Unable to update this request. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  }

  if (loading || !profile || profile.role !== "Admin") return <div className="flex min-h-screen items-center justify-center bg-[#eef1f5] text-slate-500">Loading organization requests...</div>;

  return (
    <DashboardLayout activeNavId="org-requests" activities={[]} goals={[]} kpis={[]} navItems={navItems} notificationCount={0} onLogout={logout} user={{ name: profile.fullName, role: "Admin", roleLabel: profile.position ?? "Admin", organizationName: "University Campus", academicYear: "", greetingDate: formatGreetingDate() }}>
      <section className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">Administration</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Organization requests</h2><p className="mt-1 text-sm text-slate-500">Review and decide on student organization registration requests.</p></div>
          <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200"><span className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-amber-100 text-xs text-amber-700">{pendingCount}</span>Pending requests</div>
        </div>

        <div className="mt-6 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">{(["pending", "approved", "rejected", "all"] as const).map((status) => <button key={status} type="button" onClick={() => setFilter(status)} className={`rounded-lg px-3 py-2 text-sm font-bold capitalize transition ${filter === status ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{status}{status === "pending" ? ` (${pendingCount})` : ""}</button>)}</div>
            <p className="text-sm text-slate-500">{visibleRequests.length} request{visibleRequests.length === 1 ? "" : "s"}</p>
          </div>

          {requestError ? <p className="mx-5 mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{requestError}</p> : null}
          {requestsLoading ? <div className="px-6 py-16 text-center text-sm font-medium text-slate-500">Loading organization requests...</div> : visibleRequests.length ? <div className="divide-y divide-slate-100">{visibleRequests.map((request) => <button key={request.id} type="button" onClick={() => openDetails(request)} className="grid w-full gap-3 px-5 py-5 text-left transition hover:bg-slate-50 md:grid-cols-[minmax(0,1.4fr)_minmax(160px,.7fr)_minmax(180px,.9fr)_auto] md:items-center">
            <div className="min-w-0"><p className="truncate text-base font-extrabold text-slate-900">{request.orgName}</p><p className="mt-1 text-sm text-slate-500">{request.orgType}</p></div>
            <div className="text-sm text-slate-600"><p className="font-semibold text-slate-800">{request.requestedBy.name}</p><p className="mt-1 truncate text-slate-500">{request.requestedBy.email}</p></div>
            <div className="flex items-center gap-2 text-sm text-slate-500"><Clock3 className="size-4" />{request.submittedAt}</div>
            <StatusPill status={request.status} />
          </button>)}</div> : <div className="px-6 py-16 text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Check className="size-6" /></div><h3 className="mt-4 font-extrabold text-slate-900">No {filter === "all" ? "organization requests" : `${filter} requests`}</h3><p className="mt-1 text-sm text-slate-500">{filter === "pending" ? "You are all caught up." : "Requests in this status will appear here."}</p></div>}
        </div>
      </section>

      {selectedRequest && dialog ? <RequestDialog dialog={dialog} request={selectedRequest} rejectionReason={rejectionReason} isUpdating={isUpdating} setRejectionReason={setRejectionReason} onClose={() => { if (!isUpdating) { setDialog(null); setSelectedRequest(null); setRejectionReason(""); } }} onApprove={() => dialog === "approve" ? void updateStatus("approved") : setDialog("approve")} onReject={() => dialog === "reject" ? void updateStatus("rejected") : setDialog("reject")} /> : null}
    </DashboardLayout>
  );
}

function StatusPill({ status }: { status: RequestStatus }) { return <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-extrabold capitalize ring-1 ${statusStyles[status]}`}>{status}</span>; }

function RequestDialog({ dialog, request, rejectionReason, isUpdating, setRejectionReason, onClose, onApprove, onReject }: { dialog: "details" | "approve" | "reject"; request: OrganizationRequest; rejectionReason: string; isUpdating: boolean; setRejectionReason: (value: string) => void; onClose: () => void; onApprove: () => void; onReject: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-label="Organization request details"><div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-200 p-5"><div><p className="text-sm font-bold text-blue-600">Organization request</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">{dialog === "approve" ? "Approve this request?" : dialog === "reject" ? "Reject this request" : request.orgName}</h2></div><button type="button" disabled={isUpdating} onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="size-5" /></button></div><div className="space-y-5 p-5">{dialog === "details" ? <><Detail label="Organization type" value={request.orgType} /><Detail label="Description" value={request.description} /><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Requester</p><p className="mt-2 font-bold text-slate-900">{request.requestedBy.name}</p><p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><Mail className="size-4" />{request.requestedBy.email}</p></div>{request.status === "pending" ? <div className="flex flex-col-reverse gap-3 sm:flex-row"><button type="button" onClick={() => { setRejectionReason(""); onReject(); }} className="h-11 flex-1 rounded-xl border border-rose-200 text-sm font-extrabold text-rose-600 hover:bg-rose-50">Reject</button><button type="button" onClick={onApprove} className="h-11 flex-1 rounded-xl bg-emerald-600 text-sm font-extrabold text-white hover:bg-emerald-700">Approve</button></div> : request.rejectionReason ? <Detail label="Rejection reason" value={request.rejectionReason} /> : null}</> : dialog === "approve" ? <><p className="text-sm leading-6 text-slate-600">Approve <strong>{request.orgName}</strong>? The request will be marked as approved and removed from the pending queue.</p><div className="flex gap-3"><button type="button" onClick={onClose} disabled={isUpdating} className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">Cancel</button><button type="button" disabled={isUpdating} onClick={onApprove} className="h-11 flex-1 rounded-xl bg-emerald-600 text-sm font-extrabold text-white">{isUpdating ? "Saving..." : "Confirm approval"}</button></div></> : <><p className="text-sm text-slate-600">Provide a reason before rejecting <strong>{request.orgName}</strong>.</p><textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} className="min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100" placeholder="Explain why this request cannot be approved." /><div className="flex gap-3"><button type="button" onClick={onClose} disabled={isUpdating} className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">Cancel</button><button type="button" disabled={isUpdating || !rejectionReason.trim()} onClick={onReject} className="h-11 flex-1 rounded-xl bg-rose-600 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40">{isUpdating ? "Saving..." : "Confirm rejection"}</button></div></>}</div></div></div>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1.5 text-sm leading-6 text-slate-700">{value}</p></div>; }
