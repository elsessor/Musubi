"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  Edit3,
  Lock,
  Shield,
  Sparkles,
  Star,
  Trash2,
  X,
  Zap
} from "lucide-react";
import { useId, useState } from "react";
import type { Task, TaskPriority, TaskStatus } from "./types";
import { getOrderedTaskStatuses, getStatusTheme, type CustomStatusConfig } from "./statusUtils";
import { type OrgMemberItem } from "./AddTaskModal";
import { useAuthStore } from "@/store/authStore";
import { MiniCalendarPicker } from "./MiniCalendarPicker";
import { ALL_PRIORITIES, PRIORITY_CONFIG } from "./priorityUtils";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/CustomSelect";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { TaskAttachments } from "./TaskAttachments";
import { TaskAssignee } from "./TaskAssignee";
import { isTaskAssignedToUser } from "@/utils/taskAssignment";


type TaskDetailModalProps = {
  eventId: string;
  task: Task;
  onClose: () => void;
  onUpdateTask: (updatedTask: Task) => void;
  onAttachmentsUpdated: (updatedTask: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  customStatuses?: CustomStatusConfig[];
  statusOrder?: string[];
  committees?: { id: string; name: string }[];
  roster?: OrgMemberItem[];
  isLeader?: boolean;
  canEdit?: boolean;
};

export function TaskDetailModal({
  eventId,
  task,
  onClose,
  onUpdateTask,
  onAttachmentsUpdated,
  onDeleteTask,
  customStatuses = [],
  statusOrder,
  committees = [],
  roster = [],
  isLeader = true,
  canEdit = true
}: TaskDetailModalProps) {
  const panelId = useId();
  const activeRoster = Array.isArray(roster) ? roster : [];
  const reviewerUID = useAuthStore((state) => state.firebaseUser?.uid);
  const reviewerName = useAuthStore((state) => state.profile?.fullName || "");
  const reviewerRole = useAuthStore((state) => state.profile?.role);
  const canViewReview = reviewerRole === "Student Leader" || reviewerRole === "Admin" || isTaskAssignedToUser(task, reviewerUID, reviewerName);
  const [performanceRating, setPerformanceRating] = useState(task.performanceReview?.rating || 0);

  const [title, setTitle] = useState(task.title || "");
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority || "Medium");
  const [committee, setCommittee] = useState<string>(task.committee || committees[0]?.name || "");
  const [startDate, setStartDate] = useState<string>(task.startDate || "");
  const [dueDate, setDueDate] = useState<string>(task.dueDate || "");
  const [isLeaderOnly, setIsLeaderOnly] = useState<boolean>(Boolean(task.isLeaderOnly));
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Assignee selection
  const currentMemberMatch = activeRoster.find(
    (m) => task.assignedMemberUID ? m.id === task.assignedMemberUID : m.name === (task.assignedMemberName || task.assignee?.name)
  );
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    currentMemberMatch?.id || task.assignedMemberUID || ""
  );

  const allStatuses = getOrderedTaskStatuses(statusOrder, customStatuses, [task.status]);

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
    selectedClass: PRIORITY_CONFIG[value].classes
  }));
  const statusOptions: CustomSelectOption[] = allStatuses.map((value) => {
    const theme = getStatusTheme(value, customStatuses);
    return { value, label: value, indicatorClass: theme.dot, selectedClass: theme.badge };
  });
  const selectedAssignee = activeRoster.find((member) => member.id === selectedMemberId);
  const reviewAssigneeUID = selectedAssignee?.id || task.assignedMemberUID;
  const reviewAssigneeName = selectedAssignee?.name || task.assignedMemberName || task.assignee?.name || "";
  const isOwnTask = reviewAssigneeUID ? reviewAssigneeUID === reviewerUID : Boolean(reviewerName && reviewAssigneeName.trim().toLowerCase() === reviewerName.trim().toLowerCase());
  const canRate = isLeader && canEdit && !isOwnTask && Boolean(reviewAssigneeUID || reviewAssigneeName) && ["completed", "done"].includes(status.toLowerCase());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    if (!isLeader) {
      onUpdateTask({ ...task, status });
      onClose();
      return;
    }
    if (!title.trim()) return;

    const selectedMember = isLeader ? selectedAssignee : null;

    const updated: Task = {
      ...task,
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      priorityChangeRequest: task.priorityChangeRequest,
      committee,
      startDate: startDate.trim(),
      dueDate: dueDate.trim(),
      isLeaderOnly,
      assignee: selectedMember ? {
        initials: selectedMember.initials,
        color: selectedMember.color,
        name: selectedMember.name
      } : task.assignee,
      assignedMemberName: selectedMember?.name ?? task.assignedMemberName ?? null,
      assignedMemberUID: selectedMember?.id ?? task.assignedMemberUID ?? null,
      performanceReview: canRate && performanceRating > 0 && performanceRating !== task.performanceReview?.rating
        ? { rating: performanceRating }
        : task.performanceReview ?? null
    };

    onUpdateTask(updated);
    onClose();
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={`${panelId}-title`} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-xs animate-in fade-in sm:p-6">
      <div className="flex max-h-[90vh] w-full min-w-0 max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header matching AddTaskModal */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 p-5 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Edit3 size={18} />
            </span>
            <div className="min-w-0">
              <h3 id={`${panelId}-title`} className="text-base font-semibold text-slate-900">{isLeader ? "Leader task panel" : "Task details"}</h3>
              <p className="mt-1 break-words text-xs leading-5 text-slate-500 line-clamp-2">{isLeader ? task.title : canEdit ? "Update status or add attachments to your assigned subtask." : "View task details and attachments."}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close task panel" className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <section aria-label="Task details" className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Task details</h4>
          {/* TASK TITLE */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              readOnly={!isLeader || !canEdit}
              placeholder="e.g. Secure Event Permits & Clearances"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              readOnly={!isLeader || !canEdit}
              placeholder="Specify requirements or instructions..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          </section>
          <section aria-label="Task status and assignment" className="space-y-4 border-t border-slate-100 pt-5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status &amp; assignment</h4>
          {!isLeader ? <TaskAssignee task={task} /> : null}
          {/* STATUS & PRIORITY */}
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Status</label>
              {canEdit ? <CustomSelect
                value={status}
                onChange={(value) => setStatus(value as TaskStatus)}
                options={statusOptions}
                buttonClassName="py-2 text-xs"
                disabled={!canEdit}
              /> : <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold ${getStatusTheme(task.status, customStatuses).badge}`}>
                <span className={`size-1.5 rounded-full ${getStatusTheme(task.status, customStatuses).dot}`} />{task.status}
              </span>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Priority</label>
              {isLeader ? (
                <CustomSelect value={priority} onChange={(value) => setPriority(value as TaskPriority)} options={priorityOptions} buttonClassName="py-2 text-xs" disabled={!canEdit} />
              ) : (
                <p className={`flex h-9 items-center rounded-xl border px-3 text-xs font-semibold ${PRIORITY_CONFIG[task.priority || "Medium"].classes}`}>{task.priority || "Medium"}</p>
              )}
            </div>
          </div>

          {/* ASSIGNEE & COMMITTEE */}
          {isLeader ? <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Assignee</label>
              <CustomSelect
                value={selectedMemberId}
                onChange={(value) => { setSelectedMemberId(value); setPerformanceRating(0); }}
                options={assigneeOptions}
                placeholder="Select a member"
                buttonClassName="py-2 text-xs"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Committee</label>
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

          </section>
          {/* START DATE & DUE/END DATE WITH TIME */}
          {isLeader ? <section aria-label="Task schedule" className="space-y-4 border-t border-slate-100 pt-5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Schedule</h4>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Start Date &amp; Time
              </label>
              <MiniCalendarPicker
                value={startDate}
                onChange={setStartDate}
                minDate={new Date()}
                placeholder="Select start date & time"
                includeTime={true}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Due Date &amp; Time
              </label>
              <MiniCalendarPicker
                value={dueDate}
                onChange={setDueDate}
                minDate={new Date()}
                placeholder="Select due date & time"
                includeTime={true}
              />
            </div>
          </div>
          </section> : <section aria-label="Task schedule" className="space-y-3 border-t border-slate-100 pt-5">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Schedule</h4>
            <dl className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
              <div className="min-w-0"><dt className="text-slate-500">Start date</dt><dd className="mt-1 break-words font-medium text-slate-700">{task.startDate || "Not set"}</dd></div>
              <div className="min-w-0"><dt className="text-slate-500">Deadline</dt><dd className="mt-1 break-words font-medium text-slate-700">{task.dueDate || task.deadline || "Not set"}</dd></div>
            </dl>
          </section>}
          {/* LEADER ONLY RESTRICTION */}
          {isLeader ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isLeaderOnly}
                onChange={(e) => setIsLeaderOnly(e.target.checked)}
                className="size-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <Shield size={14} className="shrink-0 text-slate-500" />
              Restricted to Leader Only Access
            </label>
          </div> : null}

          {/* ADDITIONAL METADATA BADGES */}
          {canRate ? <fieldset className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <legend className="px-1 text-xs font-semibold text-slate-700">Leader performance review</legend>
            <p className="text-xs text-slate-500">Rate this member&apos;s completed task. The rating appears on their profile.</p>
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Performance rating">
              {[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" role="radio" aria-checked={performanceRating === rating} aria-label={`${rating} ${rating === 1 ? "star" : "stars"}`} onClick={() => setPerformanceRating(rating)} className="rounded-lg p-1.5 transition hover:bg-amber-100">
                <Star size={22} className={rating <= performanceRating ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
              </button>)}
            </div>
            <p className="mt-2 text-[10px] text-slate-500">{performanceRating ? `${performanceRating}/5 — saved with your changes` : "No rating selected"}</p>
          </fieldset> : canViewReview && task.performanceReview ? <p className="text-xs text-slate-500">Leader performance rating: {task.performanceReview.rating}/5</p> : null}
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

      {isLeader && canEdit && task.priorityChangeRequest ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <p className="text-xs font-semibold text-amber-900">Priority change requested: {task.priority} → {task.priorityChangeRequest.requestedPriority}</p>
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => onUpdateTask({ ...task, priorityChangeRequest: null })} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">Decline</button>
            <button type="button" onClick={() => onUpdateTask({ ...task, priority: task.priorityChangeRequest!.requestedPriority, priorityChangeRequest: null })} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Approve</button>
          </div>
        </div>
      ) : null}
          <TaskAttachments eventId={eventId} task={task} canAdd={canEdit} onTaskUpdated={onAttachmentsUpdated} />
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
            {isLeader && canEdit && onDeleteTask ? <button
              type="button" onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
            ><Trash2 size={14} />Delete task</button> : null}
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">{canEdit ? "Cancel" : "Close"}</button>
              {canEdit ? <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700">{isLeader ? "Save changes" : "Update status"}</button> : null}
            </div>
          </div>
        </form>
      </div>
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
