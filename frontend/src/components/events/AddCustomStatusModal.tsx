"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, GripVertical, Plus, Tag, Trash2, X } from "lucide-react";
import { COLOR_OPTIONS, THEME_MAP, getStatusTheme, type CustomStatusConfig, type StatusThemeColor } from "./statusUtils";

export type AddCustomStatusModalProps = {
  isOpen: boolean;
  onClose: () => void;
  type: "event" | "task";
  customStatuses?: CustomStatusConfig[];
  statusOrder: string[];
  defaultStatuses: string[];
  onAddStatus: (statusName: string, color: StatusThemeColor) => void;
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
    onAddStatus(trimmed, selectedColor);
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
      <div className="w-full max-w-lg animate-in fade-in zoom-in duration-150 rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
        {/* Modal Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100/60 bg-blue-50 text-blue-500">
              <Tag size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Custom {type === "event" ? "Event" : "Task"} Statuses
              </h3>
              <p className="text-xs text-slate-400">
                Add custom statuses and rearrange workflow order
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

        {/* Add Status Form */}
        <form onSubmit={handleSubmit} className="mb-5 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Status Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              placeholder={
                type === "event"
                  ? "e.g. On Hold, Postponed, In Review"
                  : "e.g. QA Testing, Blocked, Deployed"
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              autoFocus
            />
            {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Badge / Dot Color
              </label>
              {/* Circular Color Palette */}
              <div className="flex items-center gap-2">
                {COLOR_OPTIONS.map((c) => {
                  const isSelected = selectedColor === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setSelectedColor(c.key)}
                      title={c.label}
                      className={`relative flex h-7 w-7 items-center justify-center rounded-full transition-all hover:scale-110 ${c.dot} ${
                        isSelected
                          ? "ring-2 ring-slate-900 ring-offset-2 scale-110 shadow-sm"
                          : "hover:opacity-90"
                      }`}
                    >
                      {isSelected && <Check size={12} className="text-white drop-shadow" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="mt-3 flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Plus size={14} />
              Add Status
            </button>
          </div>
        </form>

        {/* Status Workflow Order List (Default + Custom) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Status Order ({statusOrder.length})
            </label>
            <span className="text-[10px] text-slate-400">
              Drag handle or use arrows to rearrange
            </span>
          </div>

          <div className="max-h-52 space-y-1.5 overflow-y-auto pr-0.5">
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
                  className={`group flex items-center justify-between gap-2 rounded-xl border p-2 transition-all ${
                    isDragging
                      ? "opacity-30 border-dashed border-blue-400 bg-blue-50/50"
                      : isOver
                      ? "border-blue-400 bg-blue-50/70 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  {/* Drag handle & Order number & Badge */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="cursor-grab text-slate-300 hover:text-slate-600 active:cursor-grabbing"
                      title="Drag to rearrange"
                    >
                      <GripVertical size={16} />
                    </div>
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                      {idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${theme.dot}`} />
                      <span className="truncate text-xs font-semibold text-slate-800">
                        {statusName}
                      </span>
                    </div>
                    {isDefault ? (
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
                        Default
                      </span>
                    ) : (
                      <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600 uppercase tracking-wider">
                        Custom
                      </span>
                    )}
                  </div>

                  {/* Controls: Up, Down, Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      title="Move up"
                      className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-25 disabled:hover:bg-transparent"
                    >
                      <ChevronUp size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === statusOrder.length - 1}
                      title="Move down"
                      className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-25 disabled:hover:bg-transparent"
                    >
                      <ChevronDown size={15} />
                    </button>
                    {!isDefault && onDeleteStatus && (
                      <button
                        type="button"
                        onClick={() => handleDelete(statusName)}
                        title={confirmDelete === statusName ? "Click again to confirm delete" : "Delete status"}
                        className={`rounded-lg p-1 transition ${
                          confirmDelete === statusName
                            ? "bg-rose-100 text-rose-600 font-bold"
                            : "text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                        }`}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {confirmDelete && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-rose-50 px-3.5 py-2 text-xs text-rose-700">
            <span>Delete custom status <strong>{confirmDelete}</strong>?</span>
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
                className="rounded-lg bg-rose-600 px-2.5 py-1 font-semibold text-white shadow-sm hover:bg-rose-700"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <p className="text-[11px] text-slate-400">
            💡 Drag pills directly in the filter bar or columns to reorder anytime.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
