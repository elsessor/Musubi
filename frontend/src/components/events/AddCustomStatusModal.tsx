"use client";

import { useState } from "react";
import { Check, Plus, Tag, X } from "lucide-react";
import { COLOR_OPTIONS, type StatusThemeColor } from "./statusUtils";

type AddCustomStatusModalProps = {
  isOpen: boolean;
  onClose: () => void;
  type: "event" | "task";
  onAddStatus: (statusName: string, color: StatusThemeColor) => void;
};

export function AddCustomStatusModal({
  isOpen,
  onClose,
  type,
  onAddStatus,
}: AddCustomStatusModalProps) {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState<StatusThemeColor>("purple");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a status name.");
      return;
    }
    setError("");
    onAddStatus(trimmed, selectedColor);
    setName("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-150 rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
        {/* Modal Header */}
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100/60 bg-blue-50 text-blue-500">
              <Tag size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Add Custom {type === "event" ? "Event" : "Task"} Status
              </h3>
              <p className="text-xs text-slate-400">
                Create a new status category for your {type === "event" ? "events" : "tasks"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Status Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              placeholder={type === "event" ? "e.g. On Hold, Postponed, In Review" : "e.g. QA Testing, Blocked, Deployed"}
              className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              autoFocus
            />
            {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Badge / Dot Color
            </label>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_OPTIONS.map((c) => {
                const isSelected = selectedColor === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setSelectedColor(c.key)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                      isSelected
                        ? "border-2 border-slate-900 bg-white shadow-sm font-semibold text-slate-900"
                        : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                      <span>{c.label}</span>
                    </div>
                    {isSelected && <Check size={14} className="text-slate-900" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Plus size={15} />
              Add Status
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
