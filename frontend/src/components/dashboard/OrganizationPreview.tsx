import { BriefcaseBusiness, CirclePlus, ClipboardList, UsersRound } from "lucide-react";
import { OrganizationMemberTable } from "./OrganizationMemberTable";
import { useTutorialPlaceholders } from "@/components/onboarding/TutorialPreviewContext";
import { EmptyState } from "@/components/ui/EmptyState";

type Props = {
  tab: "overview" | "members" | "committees" | "announcements";
  isLeader: boolean;
  pendingOrganizationName?: string;
  onShowMembers: () => void;
};
const card = "min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white";
const heading = "border-b border-slate-100 px-4 py-3 text-xs font-semibold text-slate-600";
const action = "inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#213f68] px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";

export function OrganizationPreview({ tab, isLeader, pendingOrganizationName, onShowMembers }: Props) {
  const teaching = useTutorialPlaceholders();
  if (!teaching) {
    const content = {
      overview: { title: "No organization joined", description: "Join an organization to see its details, members, and events.", icon: BriefcaseBusiness },
      members: { title: "No members to display yet", description: "Organization members will appear here after your membership is approved.", icon: UsersRound },
      committees: { title: "No committees to display yet", description: "Join an organization to view its committees and their responsibilities.", icon: ClipboardList },
      announcements: { title: "No announcements to display yet", description: "Organization and committee updates will appear here after you join.", icon: ClipboardList }
    }[tab];
    return <div className="mt-4 min-w-0 space-y-4">
      {pendingOrganizationName && <p className="text-xs leading-5 text-slate-500">Your request to join {pendingOrganizationName} is pending approval.</p>}
      <div data-tour={tab === "announcements" ? "announcement-feed" : undefined}><EmptyState {...content} /></div>
    </div>;
  }
  return <div className="mt-4 min-w-0 space-y-4">
    <p className="text-xs leading-5 text-slate-500">{pendingOrganizationName
      ? `Your request to join ${pendingOrganizationName} is pending. You can explore each tab's layout while awaiting approval.`
      : "Explore each tab's layout. Organization information and actions become available after you join."}</p>
    {tab === "overview" && <>
      <article className={card}>
        <div className="flex items-center gap-3 bg-[#213f68] p-5 text-white">
          <BriefcaseBusiness aria-hidden="true" className="size-10 shrink-0 rounded-xl bg-white/10 p-2" />
          <div><h2 className="text-lg font-semibold">Organization name</h2><p className="mt-1 text-xs text-blue-100">Organization type · Created date</p></div>
        </div>
        <dl className={`grid grid-cols-2 divide-x divide-y divide-slate-100 ${isLeader ? "sm:grid-cols-4" : ""}`}>
          {["Total Members", "Active Events", ...(isLeader ? ["Delegation", "Nudges"] : [])].map((label) => <div key={label} className="p-4 text-center"><dd className="text-lg font-bold text-slate-400">—</dd><dt className="mt-1 text-xs text-slate-500">{label}</dt></div>)}
        </dl>
      </article>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <article className={card}>
          <h3 className={heading}>Organization Details</h3>
          <dl className="divide-y divide-slate-100">
            {["Name", "Type", "Description", "Created"].map((label) => <div key={label} className="flex justify-between gap-3 p-4 text-xs text-slate-500"><dt>{label}</dt><dd>—</dd></div>)}
          </dl>
        </article>
        <div className="space-y-4">
          <article className={card}>
            <h3 className={heading}>{isLeader ? "Organization Settings" : "AI Task Assistance"}</h3>
            <dl className="divide-y divide-slate-100">
              {(isLeader ? ["Delegation Mode", "AI Task Assistance", "Nudge Monitoring"] : ["AI assistance for task suggestions"]).map((label) => <div key={label} className="flex justify-between gap-3 p-4 text-xs text-slate-500"><dt>{label}</dt><dd>—</dd></div>)}
            </dl>
          </article>
          <article className={card}>
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2"><h3 className="text-xs font-semibold text-slate-600">Members Preview</h3><button type="button" onClick={onShowMembers} className="min-h-11 text-xs font-semibold text-blue-600">View all</button></div>
            <div className="flex items-center gap-3 p-4 text-xs text-slate-400"><UsersRound aria-hidden="true" className="size-8 rounded-full bg-slate-100 p-2" /><div><p>Member name</p><p className="mt-1">Role · Availability</p></div></div>
          </article>
        </div>
      </div>
      <article className={card}><h3 className={heading}>Events</h3><div className="flex flex-wrap justify-between gap-3 p-4 text-xs text-slate-400"><span>Event name and description</span><span>Event status</span></div></article>
    </>}
    {tab === "members" && <>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Member Management</h2>{isLeader && <button type="button" data-tour="join-requests" disabled title="Available after joining an organization" className={action}>Join requests</button>}</div>
      <input data-tour="member-search" aria-label="Search members" placeholder="Search by name, role, or skill..." className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" />
      <OrganizationMemberTable members={[]} isLeader={isLeader} onViewProfile={() => {}} emptyMessage="Member names, roles, committees, skills, and availability will appear here." />
    </>}
    {tab === "committees" && <>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">Teams, committee heads, and their assigned members.</p>{isLeader && <button data-tour="committee-create" type="button" disabled title="Available after joining an organization" className={action}><CirclePlus aria-hidden="true" className="size-4" />New Committee</button>}</div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1].map((index) => <article key={index} aria-label="Committee layout placeholder" className={`${card} border-dashed p-5`}><ClipboardList aria-hidden="true" className="size-6 text-slate-300" /><h2 className="mt-3 text-sm font-semibold text-slate-500">Committee name</h2><p className="mt-1 text-xs text-slate-400">Purpose and responsibilities</p><dl className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-xs text-slate-400"><div className="flex justify-between gap-3"><dt>Committee head</dt><dd>—</dd></div><div className="flex justify-between gap-3"><dt>Members</dt><dd>—</dd></div></dl></article>)}</div>
    </>}
    {tab === "announcements" && <div data-tour="announcement-feed" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Announcements</h2>{isLeader && <button data-tour="announcement-create" type="button" disabled title="Available after joining an organization" className={action}><CirclePlus aria-hidden="true" className="size-4" />Post Announcement</button>}</div>
      <article aria-label="Announcement layout placeholder" className={`${card} border-dashed p-5`}><span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">Target audience</span><h3 className="mt-4 text-sm font-semibold text-slate-500">Announcement title</h3><p className="mt-2 text-xs leading-5 text-slate-400">Announcement message and organization updates</p><p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">Posted by · Date</p></article>
    </div>}
  </div>;
}
