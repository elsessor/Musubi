"use client";

import { useEffect, useMemo, useState } from "react";
import { User, X } from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import {
  getOrganizationRequests,
  reviewOrganizationRequest
} from "@/services/auth.service";

type RequestStatus = "pending" | "approved" | "rejected";

export type OrganizationRequestItem = {
  id: string;
  orgName: string;
  orgType: string;
  description: string;
  status: RequestStatus;
  rejectionReason?: string;
  submittedAt: string;
  requestedBy: {
    uid: string;
    name: string;
    email: string;
  };
};

const DEFAULT_PENDING_REQUESTS: OrganizationRequestItem[] = [
  {
    id: "req-1",
    orgName: "Engineering Student Association",
    orgType: "Academic",
    description:
      "A student organization dedicated to engineering disciplines, bridging academic learning with real-world application through projects and industry visits.",
    status: "pending",
    submittedAt: "Jul 28, 2026",
    requestedBy: {
      uid: "u-1",
      name: "Carlo Mendoza",
      email: "carlo.mendoza@university.edu.ph"
    }
  },
  {
    id: "req-2",
    orgName: "Environmental Advocates Club",
    orgType: "Socio-Civic",
    description:
      "Promotes environmental awareness and sustainability initiatives across the university campus through clean-up drives, seminars, and eco-campaigns.",
    status: "pending",
    submittedAt: "Jul 30, 2026",
    requestedBy: {
      uid: "u-2",
      name: "Tricia Navarro",
      email: "tricia.navarro@university.edu.ph"
    }
  }
];

const DEFAULT_REVIEWED_REQUESTS: OrganizationRequestItem[] = [
  {
    id: "req-3",
    orgName: "Business and Economics Society",
    orgType: "Academic",
    description: "Fostering leadership in business and economic analysis.",
    status: "approved",
    submittedAt: "Jun 10, 2026",
    requestedBy: {
      uid: "u-3",
      name: "Miguel Santos",
      email: "miguel.santos@university.edu.ph"
    }
  },
  {
    id: "req-4",
    orgName: "Heritage Arts Collective",
    orgType: "Cultural",
    description: "Promoting local campus arts and cultural traditions.",
    status: "rejected",
    rejectionReason:
      "Duplicate of an existing registered cultural organization. Please coordinate with the Cultural Arts Society instead.",
    submittedAt: "May 22, 2026",
    requestedBy: {
      uid: "u-4",
      name: "Lara Villanueva",
      email: "lara.villanueva@university.edu.ph"
    }
  }
];

export function AdminOrgRequestsView() {
  const firebaseUser = useAuthStore((state) => state.firebaseUser);

  const [requests, setRequests] = useState<OrganizationRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingItem, setRejectingItem] = useState<OrganizationRequestItem | null>(null);
  const [rejectionInput, setRejectionInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchRequests = async () => {
    if (!firebaseUser) return;
    try {
      setLoading(true);
      const data = await getOrganizationRequests(firebaseUser);
      setRequests(
        data.map((item) => ({
          id: item.id,
          orgName: item.orgName,
          orgType: item.orgType || "Academic",
          description: item.description || "Student organization request.",
          status: (item.status === "approved" || item.status === "rejected" ? item.status : "pending") as RequestStatus,
          rejectionReason: item.rejectionReason || undefined,
          submittedAt: item.submittedAt || "Recent",
          requestedBy: {
            uid: item.requestedBy?.uid || "u",
            name: item.requestedBy?.name || "Student Leader",
            email: item.requestedBy?.email || "student@university.edu.ph"
          }
        }))
      );
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRequests();
  }, [firebaseUser]);

  const pendingRequests = useMemo(() => {
    if (requests.length > 0) {
      const p = requests.filter((r) => r.status === "pending");
      return p.length > 0 ? p : [];
    }
    return DEFAULT_PENDING_REQUESTS;
  }, [requests]);

  const reviewedRequests = useMemo(() => {
    if (requests.length > 0) {
      const r = requests.filter((r) => r.status !== "pending");
      return r.length > 0 ? r : DEFAULT_REVIEWED_REQUESTS;
    }
    return DEFAULT_REVIEWED_REQUESTS;
  }, [requests]);

  const pendingCount = pendingRequests.length;

  const handleApprove = async (req: OrganizationRequestItem) => {
    if (!firebaseUser) return;
    try {
      setSubmitting(true);
      setError("");
      await reviewOrganizationRequest(firebaseUser, req.id, "approved", null);
      setRequests((prev) =>
        prev.map((item) => (item.id === req.id ? { ...item, status: "approved" as const } : item))
      );
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to approve request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !rejectingItem) return;
    try {
      setSubmitting(true);
      setError("");
      await reviewOrganizationRequest(
        firebaseUser,
        rejectingItem.id,
        "rejected",
        rejectionInput.trim()
      );
      setRequests((prev) =>
        prev.map((item) =>
          item.id === rejectingItem.id
            ? { ...item, status: "rejected" as const, rejectionReason: rejectionInput.trim() }
            : item
        )
      );
      setRejectingItem(null);
      setRejectionInput("");
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reject request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      {/* Header & Pending Badge */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Organization Requests</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Review and approve or reject new organization requests from student leaders.
          </p>
        </div>
        {pendingCount > 0 ? (
          <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-amber-500 px-3.5 py-1 text-xs font-bold text-white shadow-xs">
            {pendingCount} pending
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl bg-rose-50 p-4 text-xs font-medium text-rose-700">{error}</p>
      ) : null}

      {/* Section 1: PENDING REVIEW */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          PENDING REVIEW
        </h2>

        {pendingRequests.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/80">
            <p className="text-sm font-medium text-slate-500">No pending organization requests.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="rounded-2xl bg-white p-6 shadow-sm border border-amber-200/80"
              >
                {/* Top Row: Title, Type Badge & Pending Approval Status */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      {req.orgName}
                    </h3>
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
                      {req.orgType}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600 border border-amber-200">
                    Pending Approval
                  </span>
                </div>

                {/* Middle Row: Description */}
                <p className="mt-3 text-sm font-normal text-slate-500 leading-relaxed">
                  {req.description}
                </p>

                {/* Metadata Row: Requester & Date */}
                <div className="mt-4 flex items-center justify-between border-b border-slate-100 pb-4 text-xs font-medium text-slate-400">
                  <div className="flex items-center gap-2">
                    <User className="size-3.5 text-slate-400" />
                    <span>{req.requestedBy.name}</span>
                    <span className="text-slate-300">·</span>
                    <span>{req.requestedBy.email}</span>
                  </div>
                  <span>{req.submittedAt}</span>
                </div>

                {/* Action Buttons Row */}
                <div className="mt-4 flex flex-col sm:flex-row items-center gap-4">
                  <button
                    onClick={() => void handleApprove(req)}
                    disabled={submitting}
                    className="flex-1 w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-emerald-500 hover:bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setRejectingItem(req);
                      setRejectionInput("");
                    }}
                    disabled={submitting}
                    className="flex-1 w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white hover:bg-rose-50 px-6 py-2.5 text-sm font-bold text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: PREVIOUSLY REVIEWED */}
      <section className="space-y-4 pt-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          PREVIOUSLY REVIEWED
        </h2>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 divide-y divide-slate-100">
          {reviewedRequests.map((req) => {
            const isApproved = req.status === "approved";
            return (
              <div key={req.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      {req.orgName}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {req.requestedBy.name} · {req.submittedAt}
                    </p>
                    {req.rejectionReason ? (
                      <p className="mt-1.5 text-xs text-rose-500 italic font-normal">
                        &quot;{req.rejectionReason}&quot;
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      isApproved
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-rose-50 text-rose-600"
                    }`}
                  >
                    {isApproved ? "Approved" : "Rejected"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Rejection Modal */}
      {rejectingItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Reject Request</h3>
              <button
                onClick={() => setRejectingItem(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="mt-4 space-y-4">
              <p className="text-xs font-medium text-slate-600">
                Please provide a rejection reason for <strong>{rejectingItem.orgName}</strong>:
              </p>
              <textarea
                rows={3}
                required
                value={rejectionInput}
                onChange={(e) => setRejectionInput(e.target.value)}
                placeholder="e.g. Duplicate of an existing registered organization..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-rose-500"
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingItem(null)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !rejectionInput.trim()}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {submitting ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
