"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Trash2, X } from "lucide-react";
import { MiniCalendarPicker } from "./MiniCalendarPicker";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { EventStatusModal } from "./EventStatusModal";
import { getStatusTheme } from "./statusUtils";
import type { Event } from "./types";
import { getDateRangeError, parseScheduleDate } from "@/utils/dateRange";

export type EventDetailsUpdate = Pick<Event, "title" | "description" | "committee" | "startDate" | "endDate" | "status">;

type EditEventModalProps = {
  event: Event;
  committees: { id: string; name: string }[];
  onClose: () => void;
  onDelete?: () => void;
  onSave: (details: EventDetailsUpdate) => Promise<void>;
};

export function EditEventModal({ event: initialEvent, committees, onClose, onSave, onDelete }: EditEventModalProps) {
  const [title, setTitle] = useState(initialEvent.title);
  const [description, setDescription] = useState(initialEvent.description);
  const [committee, setCommittee] = useState(initialEvent.committee || "");
  const [status, setStatus] = useState(initialEvent.status);
  const [confirmStatus, setConfirmStatus] = useState<"Completed" | "Cancelled" | null>(null);
  const [start, setStart] = useState(initialEvent.startDate.split(" - ")[0]);
  const [end, setEnd] = useState(initialEvent.endDate || initialEvent.startDate.split(" - ")[1] || "");
  const committeeNames = Array.from(new Set([...committees.map((item) => item.name), ...(initialEvent.committee ? [initialEvent.committee] : [])]));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        if (confirmStatus) setConfirmStatus(null);
        else onClose();
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose, saving, confirmStatus]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    const validation = !title.trim() ? "Event name is required." : !parseScheduleDate(start) || !parseScheduleDate(end)
      ? "Choose both a start and end date."
      : getDateRangeError(start, end);
    if (validation) { setError(validation); return; }
    if (status !== initialEvent.status && (status === "Completed" || status === "Cancelled")) {
      setConfirmStatus(status === "Completed" ? "Completed" : "Cancelled");
      return;
    }
    await persist().catch(() => {});
  }

  async function persist() {
    setSaving(true);
    setError("");
    try {
      await onSave({ title: title.trim(), description: description.trim(), committee, startDate: start, endDate: end, status });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save event details. Please try again.");
      throw saveError;
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onClick={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="edit-event-title" className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-blue-50 text-blue-500"><BookOpen className="size-5" /></span>
            <div><h2 id="edit-event-title" className="text-base font-bold text-slate-900">Edit Event</h2><p className="text-xs text-slate-400">Update event details and schedule</p></div>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} disabled={saving} aria-label="Close event editor" className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X className="size-5" /></button>
        </div>
        <form onSubmit={save} className="mt-4 space-y-4">
          <fieldset disabled={saving} className="space-y-4">
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Event status</p>
              <CustomSelect value={status} onChange={setStatus} disabled={saving} options={Array.from(new Set(["Active", "Planning", "Completed", "Cancelled", "Archived", ...(initialEvent.eventCustomStatuses || []).map((item) => item.name), initialEvent.status])).map((value) => {
                const theme = getStatusTheme(value, initialEvent.eventCustomStatuses);
                return { value, label: value, indicatorClass: theme.dot, selectedClass: theme.badge };
              })} buttonClassName="min-h-11 rounded-xl" dropdownClassName="[&_button]:min-h-11" portal />
            </div>
            <div>
              <label htmlFor="edit-event-name" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Event name <span className="text-rose-500">*</span></label>
              <input id="edit-event-name" value={title} onChange={(event) => setTitle(event.target.value)} required className="min-h-11 w-full rounded-xl border border-slate-200 bg-[#F0F4F8] px-4 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label htmlFor="edit-event-description" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Description</label>
              <textarea id="edit-event-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="w-full resize-none rounded-xl border border-slate-200 bg-[#F0F4F8] p-3.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Coordinating committee <span className="font-medium normal-case">(optional)</span></p>
              <CustomSelect value={committee} onChange={setCommittee} disabled={saving} options={[{ value: "", label: "No lead committee (cross-committee)" }, ...committeeNames.map((name) => ({ value: name, label: name }))]} buttonClassName="min-h-11 rounded-xl" dropdownClassName="[&_button]:min-h-11" portal />
            </div>
          </fieldset>
          <fieldset disabled={saving} className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold text-slate-600">Start date &amp; time</p>
              <MiniCalendarPicker value={start} onChange={(value) => { setStart(value); setError(""); }} includeTime maxDate={parseScheduleDate(end) ?? undefined} buttonClassName="min-h-11" />
            </div>
            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold text-slate-600">End date &amp; time</p>
              <MiniCalendarPicker value={end} onChange={(value) => { setEnd(value); setError(""); }} includeTime minDate={parseScheduleDate(start) ?? undefined} buttonClassName="min-h-11" />
            </div>
          </fieldset>
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
            {onDelete && <button type="button" onClick={onDelete} disabled={saving} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-xs font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"><Trash2 className="size-3.5 shrink-0" /> Delete event</button>}
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={saving || !title.trim()} className="min-h-11 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? "Saving..." : "Save changes"}</button>
            </div>
          </div>
        </form>
      </section>
    </div>
    {confirmStatus && <EventStatusModal eventTitle={title} targetStatus={confirmStatus} unfinishedTaskCount={initialEvent.tasks.filter((task) => task.status !== "Completed").length} onClose={() => setConfirmStatus(null)} onConfirm={persist} />}
    </>
  );
}
