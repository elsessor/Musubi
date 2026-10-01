"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  Edit3,
  Lock,
  Shield,
  Sparkles,
  Trash2,
  X,
  Zap
} from "lucide-react";
import { useState } from "react";
import type { Task, TaskPriority, TaskStatus } from "./types";
import { getStatusTheme, type CustomStatusConfig } from "./statusUtils";
import { MOCK_ROSTER, type OrgMemberItem } from "./AddTaskModal";
import { MiniCalendarPicker } from "./MiniCalendarPicker";
import { isStartAfterEnd } from "./dateValidation";
import { ALL_PRIORITIES, PRIORITY_CONFIG } from "./priorityUtils";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/CustomSelect";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

const DEFAULT_STATUSES: TaskStatus[] = ["To Do", "In Progress", "In Review", "Completed"];

type TaskDetailModalProps = {
  task: Task;
  onClose: () => void;
  onUpdateTask: (updatedTask: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  customStatuses?: CustomStatusConfig[];
  committees?: { id: string; name: string }[];
  roster?: OrgMemberItem[];
  isLeader?: boolean;
  canEdit?: boolean;
};

export function TaskDetailModal({
  task,
  onClose,
  onUpdateTask,
  onDeleteTask,
  customStatuses = [],
  committees = [],
  roster = MOCK_ROSTER,
  isLeader = true,
  canEdit = true
}: TaskDetailModalProps) {
  const activeRoster = Array.isArray(roster) && roster.length > 0 ? roster : MOCK_ROSTER;

  const [title, setTitle] = useState(task.title || "");
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority || "Medium");
  const [requestedPriority, setRequestedPriority] = useState<TaskPriority | "">(task.priorityChangeRequest?.requestedPriority || "");
  const [committee, setCommittee] = useState<string>(task.committee || committees[0]?.name || "");
  const [startDate, setStartDate] = useState<string>(task.startDate || "");
  const [dueDate, setDueDate] = useState<string>(task.dueDate || "");
  const [dateError, setDateError] = useState("");
  const [isLeaderOnly, setIsLeaderOnly] = useState<boolean>(Boolean(task.isLeaderOnly));
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Assignee selection
  const currentMemberMatch = activeRoster.find(
    (m) => m.name === task.assignee?.name || m.initials === task.assignee?.initials
  );
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    currentMemberMatch?.id || activeRoster[0]?.id || "m1"
  );

  const allStatuses: TaskStatus[] = [
    ...DEFAULT_STATUSES,
    ...customStatuses.map((cs) => cs.name as TaskStatus)
  ];

  const committeeOptions = Array.from(
    new Set([...committees.map((c) => c.name), ...(task.committee ? [task.committee] : [])])
  );
  const assigneeOptions: CustomSelectOption[] = activeRoster.map((member) => ({
    value: member.id,
    label: member.name,
    sublabel: member.position,
    initials: member.initials,
    color: member.color
  }));
  const priorityOptions: CustomSelectOption[] = ALL_PRIORITIES.map((value) => ({
    value,
    label: value,
    indicatorClass: PRIORITY_CONFIG[value].dot,
    labelClass: PRIORITY_CONFIG[value].classes
  }));
  const statusOptions: CustomSelectOption[] = allStatuses.map((value) => {
    const theme = getStatusTheme(value, customStatuses);
    return { value, label: value, indicatorClass: theme.dot, selectedClass: theme.active };
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    if (isStartAfterEnd(startDate, dueDate)) {
      setDateError("Start date cannot be later than the target date.");
      return;
    }
    setDateError("");

    const selectedMember = activeRoster.find((m) => m.id === selectedMemberId) || activeRoster[0] || MOCK_ROSTER[0];
    const nextDueDate = dueDate.trim();
    const dueDateChanged = nextDueDate !== (task.dueDate || "");

    const updated: Task = {
      ...task,
      title: title.trim(),
      description: description.trim(),
      status,
      priority: isLeader ? priority : task.priority,
      priorityChangeRequest: isLeader
        ? task.priorityChangeRequest
        : requestedPriority && requestedPriority !== task.priority
          ? { requestedPriority }
          : task.priorityChangeRequest,
      committee,
      startDate: startDate.trim(),
      dueDate: nextDueDate,
      originalStartDate: task.originalStartDate ?? task.startDate,
      originalDueDate: task.originalDueDate ?? task.dueDate,
      dueDateHistory: dueDateChanged
        ? [...(task.dueDateHistory ?? []), { from: task.dueDate || "", to: nextDueDate, changedAt: new Date().toISOString() }]
        : task.dueDateHistory,
      isLeaderOnly,
      assignee: {
        initials: selectedMember.initials,
        color: selectedMember.color,
        name: selectedMember.name
      },
      assignedMemberName: selectedMember.name,
      assignedMemberUID: selectedMember.id
    };

    onUpdateTask(updated);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header matching AddTaskModal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-[#e0e7ff] text-[#2563eb]">
              <Edit3 size={18} />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Task Details &amp; Settings</h3>
              <p className="text-xs text-slate-500 font-medium">Editing &quot;{task.title}&quot;</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* TASK TITLE */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              readOnly={!canEdit}
              placeholder="e.g. Secure Event Permits & Clearances"
              className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              readOnly={!canEdit}
              placeholder="Specify requirements or instructions..."
              className="w-full resize-none rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-2 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* STATUS & PRIORITY */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Status</label>
              <CustomSelect
                value={status}
                onChange={(value) => setStatus(value as TaskStatus)}
                options={statusOptions}
                buttonClassName="py-2 text-xs"
                disabled={!canEdit}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">{isLeader ? "Priority" : "Request priority change"}</label>
              {isLeader ? (
                <CustomSelect value={priority} onChange={(value) => setPriority(value as TaskPriority)} options={priorityOptions} buttonClassName="py-2 text-xs" disabled={!canEdit} />
              ) : (
                <>
                  <CustomSelect value={requestedPriority || task.priority || "Medium"} onChange={(value) => setRequestedPriority(value as TaskPriority)} options={priorityOptions} buttonClassName="py-2 text-xs" disabled={!canEdit || Boolean(task.priorityChangeRequest)} />
                  {task.priorityChangeRequest ? <p className="mt-1 text-[10px] font-medium text-amber-700">A request for {task.priorityChangeRequest.requestedPriority} priority is awaiting leader review.</p> : <p className="mt-1 text-[10px] text-slate-500">A leader must approve this change.</p>}
                </>
              )}
            </div>
          </div>

          {/* ASSIGNEE & COMMITTEE */}
          {isLeader ? <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Assignee</label>
              <CustomSelect
                value={selectedMemberId}
                onChange={setSelectedMemberId}
                options={assigneeOptions}
                placeholder="Select a member"
                buttonClassName="py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Committee</label>
              <select
                value={committee}
                onChange={(e) => setCommittee(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500"
              >
                {committeeOptions.map((comm) => (
                  <option key={comm} value={comm}>
                    {comm} Committee
                  </option>
                ))}
              </select>
            </div>
          </div> : null}

          {/* START DATE & DUE/END DATE WITH TIME */}
          {isLeader ? <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                Start Date &amp; Time
              </label>
              <MiniCalendarPicker
                value={startDate}
                onChange={(value) => { setStartDate(value); setDateError(""); }}
                minDate={new Date()}
                placeholder="Select start date & time"
                includeTime={true}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                Due Date &amp; Time
              </label>
              <MiniCalendarPicker
                value={dueDate}
                onChange={(value) => { setDueDate(value); setDateError(""); }}
                minDate={startDate ? new Date(startDate) : new Date()}
                placeholder="Select due date & time"
                includeTime={true}
              />
            </div>
          </div> : null}
          {dateError ? <p className="text-xs font-semibold text-rose-600">{dateError}</p> : null}

          {/* LEADER ONLY RESTRICTION */}
          {isLeader ? <div className="rounded-2xl bg-amber-50/70 p-3 border border-amber-200/70">
            <label className="flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isLeaderOnly}
                onChange={(e) => setIsLeaderOnly(e.target.checked)}
                className="size-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <Shield size={14} className="text-amber-600" />
              Restricted to Leader Only Access
            </label>
          </div> : null}

          {/* ADDITIONAL METADATA BADGES */}
          {(typeof task.matchPercentage === "number" || (task.blockedBy && task.blockedBy > 0) || task.isAiGenerated) && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              {task.isAiGenerated && (
                <span className="inline-flex items-center gap-1 rounded-xl bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 border border-purple-200">
                  <Zap size={11} className="text-purple-500" />
                  AI Generated
                </span>
              )}
              {typeof task.matchPercentage === "number" && task.matchPercentage > 0 && (
                <span className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
                  <Sparkles size={11} className="text-indigo-500" />
                  Skill Match: {task.matchPercentage}%
                </span>
              )}
              {task.blockedBy && task.blockedBy > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">
                  <AlertTriangle size={11} className="text-rose-500" />
                  Blocked by {task.blockedBy} task(s)
                </span>
              ) : null}
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className={`grid gap-3 border-t border-slate-100 pt-3 ${isLeader && onDeleteTask ? "grid-cols-3" : "grid-cols-2"}`}>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            {isLeader && onDeleteTask && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete subtask"
                title="Delete subtask"
                className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 py-2.5 text-rose-700 hover:bg-rose-100 transition"
              >
                <Trash2 size={15} />
              </button>
            )}
            {canEdit ? <button
              type="submit"
              className="rounded-2xl bg-[#2563eb] py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-md"
            >
              Save Changes
            </button> : null}
          </div>
        </form>
      </div>
      {isLeader && task.priorityChangeRequest ? (
        <div className="fixed bottom-4 left-1/2 z-[60] w-[min(92vw,28rem)] -translate-x-1/2 rounded-2xl border border-amber-200 bg-amber-50 p-3 shadow-xl">
          <p className="text-xs font-semibold text-amber-900">Priority change requested: {task.priority} → {task.priorityChangeRequest.requestedPriority}</p>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => onUpdateTask({ ...task, priorityChangeRequest: null })} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">Decline</button>
            <button type="button" onClick={() => onUpdateTask({ ...task, priority: task.priorityChangeRequest!.requestedPriority, priorityChangeRequest: null })} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Approve</button>
          </div>
        </div>
      ) : null}
      {confirmDelete && onDeleteTask && (
        <ConfirmDeleteModal
          itemType="subtask"
          itemName={task.title || task.description || "Untitled subtask"}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            onDeleteTask(task.id);
            setConfirmDelete(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}
