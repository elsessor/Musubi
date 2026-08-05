"use client";

import React from "react";
import { Search, CirclePlus } from "lucide-react";

type Props = {
  search: string;
  members: any[];
  onSearch: (v: string) => void;
  joinRequests: any[];
  isLeader: boolean;
  reviewingRequestId: string;
  onReview: (id: string, status: "accepted" | "rejected") => void;
  onOpenInvite?: () => void;
};

export default function MembersPanel({ search, members, onSearch, joinRequests, isLeader, reviewingRequestId, onReview, onOpenInvite }: Props) {
  return (
    <div className="mt-6">
      {isLeader && joinRequests.length > 0 && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-bold text-amber-950">Pending join requests ({joinRequests.length})</h3>
          <div className="mt-3 space-y-3">
            {joinRequests.map((request) => (
              <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{request.name}</p>
                  <p className="text-xs text-slate-500">{request.position} · {request.email}</p>
                </div>
                <div className="flex gap-2">
                  <button disabled={reviewingRequestId === request.id} onClick={() => onReview(request.id, "rejected")} className="h-8 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-600">Decline</button>
                  <button disabled={reviewingRequestId === request.id} onClick={() => onReview(request.id, "accepted")} className="h-8 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white">Accept</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[21px] font-bold">Member Management</h2>
      </div>

      <div className="mt-5 flex items-start justify-between gap-3">
        <label className="flex h-10 items-center gap-3 rounded-xl border border-[#dce3ed] bg-white px-3 flex-1">
          <Search className="size-4 text-slate-500" />
          <input className="w-full bg-transparent text-[13px] outline-none placeholder:text-slate-500" onChange={(event) => onSearch(event.target.value)} placeholder="Search by name, role, or skill..." value={search} />
        </label>
        {isLeader ? (
          <button onClick={onOpenInvite} className="ml-3 h-10 rounded-xl bg-[#213f68] px-4 text-[12px] font-semibold text-white flex items-center gap-2">
            <CirclePlus className="size-4" />Invite
          </button>
        ) : null}
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-[#dce3ed] bg-white">
        <table className="min-w-[1180px] w-full border-collapse text-left">
          <thead className="bg-[#e8eef7] text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Member Name</th>
              <th className="px-3 py-3 font-semibold">Role</th>
              <th className="px-3 py-3 font-semibold">Committee</th>
              <th className="px-3 py-3 font-semibold">Skills</th>
              <th className="px-3 py-3 font-semibold">Workload</th>
              <th className="px-3 py-3 font-semibold">Reliability</th>
              <th className="px-3 py-3 font-semibold">Availability</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.map((member: any) => (
              <tr className="border-t border-[#dfe5ee] text-[13px]" key={member.name}>
                <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#213f68] text-[9px] font-bold text-white">{(member.name || "").split(" ").map((p: string) => p[0]).slice(0,2).join("")}</span><span className="font-medium">{member.name}</span></div></td>
                <td className="px-3 py-3 text-slate-500">{member.role}</td>
                <td className="px-3 py-3"><span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] text-violet-700">{member.committee}</span></td>
                <td className="px-3 py-3"><div className="flex max-w-[410px] flex-wrap gap-1">{(member.skills || []).map((skill: string) => <span className="rounded bg-[#e8eef7] px-2 py-0.5 text-[11px] text-[#214574]" key={skill}>{skill}</span>)}</div></td>
                <td className="px-3 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-20 rounded bg-slate-100"><div className={`h-full rounded ${member.workload >= 80 ? "bg-rose-500" : member.workload >= 60 ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${member.workload}%` }} /></div><span className="text-[11px] text-slate-500">{member.workload}%</span></div></td>
                <td className="px-3 py-3 text-[11px] font-semibold">{member.reliability}</td>
                <td className="px-3 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${member.availability === "Available" ? "bg-emerald-50 text-emerald-600" : member.availability === "Busy" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"}`}>{member.availability}</span></td>
                <td className="px-4 py-3 text-right text-[12px] font-medium text-[#2868ed]">View Profile</td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No members match your search.</p>}
      </div>
    </div>
  );
}
