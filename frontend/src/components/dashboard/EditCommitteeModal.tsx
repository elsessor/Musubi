"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { OrganizationCommitteeRecord, OrganizationMember } from "@/services/auth.service";
import { CommitteeHeadSelect } from "@/components/dashboard/CommitteeHeadSelect";

export type EditCommitteeInput = {
  name: string;
  description: string;
  headMemberId: string | null;
};

export function EditCommitteeModal({
  committee,
  members,
  onClose,
  onSave
}: {
  committee: OrganizationCommitteeRecord;
  members: OrganizationMember[];
  onClose: () => void;
  onSave: (input: EditCommitteeInput) => Promise<void>;
}) {
  const [name, setName] = useState(committee.name);
  const [description, setDescription] = useState(committee.description);
  const [headMemberId, setHeadMemberId] = useState<string | null>(committee.headMemberUID);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Enter a committee name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ name: name.trim(), description: description.trim(), headMemberId });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update committee.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-2 backdrop-blur-sm sm:p-4">
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="edit-committee-title" className="flex max-h-[calc(100dvh-1rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div><p className="text-xs font-bold uppercase tracking-wide text-blue-700">Committee settings</p><h2 id="edit-committee-title" className="mt-1 text-xl font-extrabold text-slate-900">Edit {committee.name}</h2><p className="mt-1 text-sm text-slate-500">Update committee name, description, and head.</p></div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close edit committee dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X className="size-5" /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          <label className="block text-sm font-semibold text-slate-700">Committee name<input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label>
          <label className="block text-sm font-semibold text-slate-700">Description<textarea value={description} maxLength={1000} onChange={(event) => setDescription(event.target.value)} className="mt-1.5 min-h-28 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label>
          <div><label className="block text-sm font-semibold text-slate-700">Committee head</label><CommitteeHeadSelect members={members} value={headMemberId} placeholder="No head assigned" onChange={setHeadMemberId} /></div>
          {error ? <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={saving || !name.trim()} className="rounded-xl bg-[#213f68] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving..." : "Save changes"}</button>
        </div>
      </form>
    </div>
  );
}
