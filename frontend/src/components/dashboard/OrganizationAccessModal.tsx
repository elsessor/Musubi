"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Search, X } from "lucide-react";
import type { User } from "firebase/auth";

import { createOrganization, getOrganizationDirectory, joinOrganization, type OrganizationDirectoryOption } from "@/services/auth.service";
import type { UserRole } from "@/types/auth";

type Props = {
  role: Extract<UserRole, "Student Leader" | "Organization Member">;
  user: User;
  onClose: () => void;
  onComplete: (profile: { organizationId: string | null }) => void;
};

export function OrganizationAccessModal({ role, user, onClose, onComplete }: Props) {
  const [mode, setMode] = useState<"join" | "create">("join");
  const [organizations, setOrganizations] = useState<OrganizationDirectoryOption[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { void getOrganizationDirectory(user).then(setOrganizations).catch(() => setError("Unable to load organizations. Please try again.")); }, [user]);

  const visibleOrganizations = useMemo(() => organizations.filter((organization) => `${organization.name} ${organization.type}`.toLowerCase().includes(query.toLowerCase())), [organizations, query]);

  async function submit() {
    setError("");
    if (mode === "join" && !selectedId) { setError("Select an organization to join."); return; }
    if (mode === "create" && (!name.trim() || !type.trim() || !description.trim())) { setError("Complete the organization name, type, and description."); return; }
    setSaving(true);
    try {
      if (mode === "join") { await joinOrganization(user, selectedId); onComplete({ organizationId: null }); setSubmitted(true); return; }
      const result = await createOrganization(user, { name, type, description });
      onComplete(result.user);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save your organization choice.");
    } finally { setSaving(false); }
  }

  const isLeader = role === "Student Leader";
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="organization-access-title">
    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-slate-200 p-5"><div><p className="text-xs font-bold uppercase tracking-wide text-[#2868ed]">Organization access</p><h2 id="organization-access-title" className="mt-1 text-xl font-extrabold text-slate-900">{isLeader ? "Create or join an organization" : "Join an organization"}</h2></div><button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="size-5" /></button></div>
      <div className="p-5">{submitted ? <div className="py-6 text-center"><h3 className="text-lg font-extrabold text-slate-900">Join request submitted</h3><p className="mt-2 text-sm leading-6 text-slate-500">An organization leader must accept your request before you become a member.</p><button type="button" onClick={onClose} className="mt-6 h-11 w-full rounded-xl bg-[#213f68] text-sm font-bold text-white">Done</button></div> : <>{isLeader && <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1"><Tab active={mode === "join"} onClick={() => { setMode("join"); setError(""); }}>Request to join</Tab><Tab active={mode === "create"} onClick={() => { setMode("create"); setError(""); }}>Create new</Tab></div>}
        {mode === "join" ? <><label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3"><Search className="size-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search organizations..." /></label><div className="mt-3 max-h-64 space-y-2 overflow-y-auto">{visibleOrganizations.map((organization) => <button type="button" key={organization.id} onClick={() => { setSelectedId(organization.id); setError(""); }} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selectedId === organization.id ? "border-[#2868ed] bg-blue-50 ring-1 ring-[#2868ed]" : "border-slate-200 hover:border-blue-300"}`}><span className="flex size-9 items-center justify-center rounded-lg bg-[#e8eef7] text-[#214574]"><Building2 className="size-4" /></span><span className="flex-1"><span className="block text-sm font-bold text-slate-800">{organization.name}</span><span className="text-xs text-slate-500">{organization.type}</span></span></button>)}{!visibleOrganizations.length && <p className="py-6 text-center text-sm text-slate-500">No organizations found.</p>}</div></> : <div className="space-y-4"><Field label="Organization name"><input value={name} onChange={(event) => setName(event.target.value)} className="modal-field" placeholder="e.g. Computer Science Society" /></Field><Field label="Organization type"><input value={type} onChange={(event) => setType(event.target.value)} className="modal-field" placeholder="e.g. Academic" /></Field><Field label="Description"><textarea value={description} onChange={(event) => setDescription(event.target.value)} className="modal-field min-h-24 py-3" placeholder="Describe your organization." /></Field><p className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">New organizations are submitted for administrator review.</p></div>}
        {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>}<div className="mt-5 flex gap-3"><button type="button" onClick={onClose} disabled={saving} className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">Cancel</button><button type="button" onClick={() => void submit()} disabled={saving} className="h-11 flex-1 rounded-xl bg-[#213f68] text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving..." : mode === "join" ? "Request to join" : "Submit organization"}</button></div></>}
      </div>
    </div>
    <style jsx>{`.modal-field { width: 100%; margin-top: 0.5rem; border: 1px solid #cbd5e1; border-radius: 0.75rem; min-height: 2.75rem; padding: 0 0.75rem; font-size: 0.875rem; outline: none; } .modal-field:focus { border-color: #2868ed; box-shadow: 0 0 0 3px rgb(40 104 237 / .12); }`}</style>
  </div>;
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={`rounded-lg px-3 py-2 text-xs font-bold ${active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{children}</button>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">{label}{children}</label>; }
