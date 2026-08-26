"use client";

import type { User } from "firebase/auth";
import { ClipboardList, Plus, X } from "lucide-react";
import { useState } from "react";

import { createCommitteeFirestore } from "@/services/committees.service";

type CreateCommitteeModalProps = {
  organizationId: string;
  user: User;
};

export function CreateCommitteeButton({ organizationId, user }: CreateCommitteeModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-[#213f68] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#172f50]"
      >
        <Plus className="size-4" />
        Create committee
      </button>
      {isOpen && <CreateCommitteeModal organizationId={organizationId} user={user} onClose={() => setIsOpen(false)} />}
    </>
  );
}

function CreateCommitteeModal({ organizationId, user, onClose }: CreateCommitteeModalProps & { onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await createCommitteeFirestore(user, organizationId, {
        name,
        description,
        headMemberUID: user.uid
      });
      onClose();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create committee.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="create-committee-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><ClipboardList className="size-5" /></span>
            <div><h2 id="create-committee-title" className="font-bold text-slate-900">Create committee</h2><p className="mt-0.5 text-xs text-slate-500">Add a team to your organization.</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="size-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Committee name<input required autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Events and Logistics" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-blue-500" /></label>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Description <span className="font-normal normal-case tracking-normal">(optional)</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="What does this committee handle?" className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-blue-500" /></label>
          {error && <p className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700">{error}</p>}
          <div className="flex justify-end gap-3 pt-1"><button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancel</button><button type="submit" disabled={saving || !name.trim()} className="rounded-xl bg-[#213f68] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">{saving ? "Creating..." : "Create committee"}</button></div>
        </form>
      </div>
    </div>
  );
}
