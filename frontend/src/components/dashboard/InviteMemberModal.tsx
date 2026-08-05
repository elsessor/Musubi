"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { User } from "firebase/auth";
import { inviteOrganizationMember } from "@/services/auth.service";

type InviteMemberModalProps = {
  open: boolean;
  user: User;
  organizationId: string;
  onClose: () => void;
  onInvited?: () => void;
};

export function InviteMemberModal({ open, user, organizationId, onClose, onInvited }: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!open) return null;

  async function handleInvite() {
    if (!email.trim()) { setMessage("Enter an email address."); return; }
    setLoading(true);
    setMessage("");
    try {
      await inviteOrganizationMember(user, organizationId, email.trim());
      setMessage("Invitation sent.");
      setEmail("");
      if (onInvited) onInvited();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to send invite.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold">Invite member</h3>
            <p className="mt-1 text-sm text-slate-500">Send an invitation to a new member by email.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><XIcon className="size-5" /></button>
        </div>

        <div className="p-5">
          <label className="block text-xs font-semibold uppercase text-slate-500">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="member@example.edu" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" type="email" />
          {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4">
          <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
          <Button variant="primary" onClick={handleInvite} className="w-full sm:w-auto" isLoading={loading}>Send invite</Button>
        </div>
      </div>
    </div>
  );
}
