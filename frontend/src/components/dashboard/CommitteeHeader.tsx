import { ClipboardList, Pencil } from "lucide-react";
import type { OrganizationCommitteeRecord } from "@/services/auth.service";

export function CommitteeHeader({ committee, organizationName, headName, memberCount, activeGoals, onEdit }: {
  committee: OrganizationCommitteeRecord;
  organizationName: string;
  headName?: string;
  memberCount: number;
  activeGoals: number;
  onEdit?: () => void;
}) {
  const created = committee.createdAt ? new Date(committee.createdAt) : null;
  const createdLabel = created && Number.isFinite(created.getTime())
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(created) : null;
  return (
    <article className="mt-5 overflow-hidden rounded-2xl border border-[#d9e1ec] bg-white">
      <div className="relative overflow-hidden bg-[#213f68] px-6 py-6 text-white sm:px-7">
        <div aria-hidden="true" className="absolute -right-8 -top-16 size-44 rounded-full bg-[#385779]" />
        <div className="relative flex min-w-0 flex-wrap items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#2868ed]">
            <ClipboardList className="size-6" />
          </div>
          <div className="min-w-0 flex-1 basis-48">
            <h1 className="break-words text-[21px] font-bold tracking-[-0.02em]">{committee.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full bg-white/15 px-2.5 py-0.5">Committee</span>
              <span className="break-words text-blue-100">{organizationName}</span>
              {createdLabel && <span className="text-blue-100">Created {createdLabel}</span>}
            </div>
            {committee.description && <p className="mt-3 max-w-3xl break-words text-sm leading-relaxed text-blue-100">{committee.description}</p>}
            <p className="mt-3 text-xs text-blue-100">Committee head: <span className="font-semibold text-white">{headName || "Not assigned"}</span></p>
          </div>
          {onEdit && (
            <button type="button" onClick={onEdit} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <Pencil className="size-4" />
              Edit committee
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-[#dce3ed] text-center">
        <div className="px-3 py-4"><p className="text-[15px] font-bold text-[#2868ed]">{memberCount}</p><p className="mt-1 text-[10px] text-slate-500">Total Members</p></div>
        <div className="px-3 py-4"><p className="text-[15px] font-bold text-[#7c3aed]">{activeGoals}</p><p className="mt-1 text-[10px] text-slate-500">Active Events</p></div>
      </div>
    </article>
  );
}
