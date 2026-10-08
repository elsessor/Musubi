"use client";

import { useState } from "react";
import { X } from "lucide-react";

export type OrganizationSettings = {
  delegationMode: "Heuristic" | "Manual";
  aiTaskAtomization: boolean;
  nudgeMonitoring: boolean;
};

export function OrganizationSettingsModal({
  initialSettings,
  onClose,
  onSave
}: {
  initialSettings: OrganizationSettings;
  onClose: () => void;
  onSave: (settings: OrganizationSettings) => Promise<void>;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(settings);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update organization settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="presentation">
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="organization-settings-title" className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Organization</p>
            <h2 id="organization-settings-title" className="mt-1 text-lg font-extrabold text-slate-900">Organization Settings</h2>
            <p className="mt-1 text-sm text-slate-500">Manage task assignment and monitoring preferences.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close settings" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X className="size-5" /></button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <label className="block text-sm font-semibold text-slate-700">
            Delegation mode
            <span className="mt-1 block text-xs font-normal text-slate-500">Choose how tasks are assigned to organization members.</span>
            <select value={settings.delegationMode} onChange={(event) => setSettings((current) => ({ ...current, delegationMode: event.target.value === "Manual" ? "Manual" : "Heuristic" }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15">
              <option value="Heuristic">Heuristic matching</option>
              <option value="Manual">Leader assigns tasks</option>
            </select>
          </label>

          <SettingToggle label="AI task assistance" description="Allow AI to break event goals into suggested tasks." checked={settings.aiTaskAtomization} onChange={(checked) => setSettings((current) => ({ ...current, aiTaskAtomization: checked }))} />
          <SettingToggle label="Nudge monitoring" description="Enable reminders for task follow-up." checked={settings.nudgeMonitoring} onChange={(checked) => setSettings((current) => ({ ...current, nudgeMonitoring: checked }))} />
          {error ? <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 sm:px-6">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-[#213f68] px-4 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">{saving ? "Saving..." : "Save settings"}</button>
        </div>
      </form>
    </div>
  );
}

function SettingToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${checked ? "bg-blue-600" : "bg-slate-300"}`}>
        <span className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}
