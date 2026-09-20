"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, GripVertical, Plus, SlidersHorizontal, Trash2, X } from "lucide-react";
import { COLOR_OPTIONS, getStatusTheme, type CustomStatusConfig, type StatusThemeColor } from "./statusUtils";

export type AddCustomStatusModalProps = {
  isOpen: boolean;
  onClose: () => void;
  type: "event" | "task";
  customStatuses?: CustomStatusConfig[];
  statusOrder: string[];
  defaultStatuses: string[];
  onAddStatus: (statusName: string, color: StatusThemeColor, insertIndex?: number) => void;
  onReorderStatusOrder: (newOrder: string[]) => void;
  onDeleteStatus?: (statusName: string) => void;
};

export function AddCustomStatusModal({
  isOpen,
  onClose,
  type,
  customStatuses = [],
  statusOrder = [],
  defaultStatuses = [],
  onAddStatus,
  onReorderStatusOrder,
  onDeleteStatus,
}: AddCustomStatusModalProps) {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState<StatusThemeColor>("purple");
  const [insertAfter, setInsertAfter] = useState<string>("before-completed");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Drag & drop state for reordering within modal
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a status name.");
      return;
    }
    const alreadyExists =
      defaultStatuses.some((ds) => ds.toLowerCase() === trimmed.toLowerCase()) ||
      customStatuses.some((cs) => cs.name.toLowerCase() === trimmed.toLowerCase());
    if (alreadyExists) {
      setError("A status with this name already exists.");
      return;
    }
    setError("");

    let insertIndex = statusOrder.length;
    if (insertAfter === "before-completed") {
      const completedIdx = statusOrder.findIndex((s) => s.toLowerCase() === "completed");
      if (completedIdx !== -1) insertIndex = completedIdx;
    } else if (insertAfter === "at-start") {
      insertIndex = 0;
    } else {
      const targetIdx = statusOrder.indexOf(insertAfter);
      if (targetIdx !== -1) insertIndex = targetIdx + 1;
    }

    onAddStatus(trimmed, selectedColor, insertIndex);
    setName("");
  }

  function handleMoveUp(index: number) {
    if (index <= 0) return;
    const updated = [...statusOrder];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    onReorderStatusOrder(updated);
  }

  function handleMoveDown(index: number) {
    if (index >= statusOrder.length - 1) return;
    const updated = [...statusOrder];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    onReorderStatusOrder(updated);
  }

  function handleDragStart(index: number) {
    setDraggedIdx(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  }

  function handleDrop(targetIndex: number) {
    if (draggedIdx === null || draggedIdx === targetIndex) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    const updated = [...statusOrder];
    const [movedItem] = updated.splice(draggedIdx, 1);
    updated.splice(targetIndex, 0, movedItem);
    onReorderStatusOrder(updated);
    setDraggedIdx(null);
    setDragOverIdx(null);
  }

  function handleDelete(statusName: string) {
    if (confirmDelete === statusName) {
      onDeleteStatus?.(statusName);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(statusName);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-150 rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-100/60 bg-blue-50 text-blue-600">
              <SlidersHorizontal size={18} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Manage Statuses</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Workflow Order List */}
        <div className="space-y-2">
          <div className="max-h-48 space-y-1.5 overflow-y-auto pr-0.5">
            {statusOrder.map((statusName, idx) => {
              const isDefault = defaultStatuses.includes(statusName);
              const theme = getStatusTheme(statusName, customStatuses);
              const isDragging = draggedIdx === idx;
              const isOver = dragOverIdx === idx && draggedIdx !== idx;

              return (
                <div
                  key={statusName}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={() => {
                    setDraggedIdx(null);
                    setDragOverIdx(null);
                  }}
                  onDrop={() => handleDrop(idx)}
                  className={`group flex items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-all ${
                    isDragging
                      ? "opacity-30 border-dashed border-blue-400 bg-blue-50/50"
                      : isOver
                      ? "border-blue-400 bg-blue-50/70 shadow-sm"
                      : "border-slate-100 bg-white hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="cursor-grab text-slate-300 hover:text-slate-600 active:cursor-grabbing"
                      title="Drag to rearrange"
                    >
                      <GripVertical size={16} />
                    </div>
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${theme.dot}`} />
                    <span className="truncate text-xs font-semibold text-slate-800">
                      {statusName}
                    </span>
                    {isDefault && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                        pinned / default
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      title="Move up"
                      className="rounded-lg p-1 text-slate-300 hover:text-slate-600 disabled:opacity-20"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === statusOrder.length - 1}
                      title="Move down"
                      className="rounded-lg p-1 text-slate-300 hover:text-slate-600 disabled:opacity-20"
                    >
                      <ChevronDown size={14} />
                    </button>
                    {!isDefault && onDeleteStatus && (
                      <button
                        type="button"
                        onClick={() => handleDelete(statusName)}
                        title={confirmDelete === statusName ? "Confirm delete" : "Delete status"}
                        className={`rounded-lg p-1 transition ${
                          confirmDelete === statusName
                            ? "bg-rose-100 text-rose-600 font-bold"
                            : "text-slate-300 hover:text-rose-500"
                        }`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add New Status Form */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            ADD NEW STATUS
          </label>

          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError("");
            }}
            placeholder="Status name..."
            className="w-full rounded-2xl border border-slate-200/80 bg-[#F0F4F8] px-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />

          <div>
            <label className="mb-1 block text-[10px] font-semibold text-slate-400">
              Insert after:
            </label>
            <select
              value={insertAfter}
              onChange={(e) => setInsertAfter(e.target.value)}
              className="w-full rounded-2xl border border-slate-200/80 bg-[#F0F4F8] px-4 py-2 text-xs text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="before-completed">— Before &quot;Completed&quot; —</option>
              <option value="at-start">At the beginning</option>
              {statusOrder.map((s) => (
                <option key={s} value={s}>
                  After &quot;{s}&quot;
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

          {/* Color Palette Dots */}
          <div className="flex items-center justify-between px-1 py-1">
            {COLOR_OPTIONS.map((c) => {
              const isSelected = selectedColor === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setSelectedColor(c.key)}
                  title={c.label}
                  className={`relative flex h-6 w-6 items-center justify-center rounded-full transition-all hover:scale-110 ${c.dot} ${
                    isSelected
                      ? "ring-2 ring-slate-900 ring-offset-2 scale-110 shadow-xs"
                      : "hover:opacity-90"
                  }`}
                >
                  {isSelected && <Check size={10} className="text-white drop-shadow-xs" />}
                </button>
              );
            })}
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-blue-200/80 py-2.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-300"
          >
            <Plus size={14} />
            Add Status
          </button>
        </form>

        {confirmDelete && (
          <div className="flex items-center justify-between rounded-xl bg-rose-50 px-3.5 py-2 text-xs text-rose-700">
            <span>Delete status <strong>{confirmDelete}</strong>?</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg px-2 py-1 font-semibold text-slate-600 hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDelete)}
                className="rounded-lg bg-rose-600 px-2.5 py-1 font-semibold text-white shadow-xs hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200/80 px-6 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-[#1E293B] px-8 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
