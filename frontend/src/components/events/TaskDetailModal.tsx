"use client";

import { getDateRangeError, parseScheduleDate } from "@/utils/dateRange";

import {
  AlertTriangle,
  Bell,
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
import { useToastStore } from "@/store/toastStore";
import { sendNudgeEmail } from "@/services/notifications.service";
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

  const [title, setTitle] = useState(task.title || "");
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority || "Medium");
  const [committee, setCommittee] = useState<string>(task.committee || committees[0]?.name || "");
  const [startDate, setStartDate] = useState<string>(task.startDate || "");
  const [dueDate, setDueDate] = useState<string>(task.dueDate || task.deadline || "");
  const [dateError, setDateError] = useState("");
  const [isLeaderOnly, setIsLeaderOnly] = useState<boolean>(Boolean(task.isLeaderOnly));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sendingNudge, setSendingNudge] = useState(false);

  async function handleSendManualNudge() {
    setSendingNudge(true);
    try {
      const assignedMember = activeRoster.find((m) =>
        selectedMemberId ? m.id === selectedMemberId : task.assignedMemberUID ? m.id === task.assignedMemberUID : m.name === (task.assignedMemberName || task.assignee?.name)
      );

      const targetUID = assignedMember?.id || task.assignedMemberUID || reviewerUID;
      const targetName = assignedMember?.name || task.assignedMemberName || task.assignee?.name || "Team Member";

      const dueDateStr = dueDate || task.dueDate || task.deadline;
      let nudgeType = "3_days_prior";
      let isUrgent = false;

      if (dueDateStr) {
        const parsedDate = new Date(dueDateStr);
        if (!isNaN(parsedDate.getTime())) {
          const diffDays = Math.ceil((parsedDate.getTime() - Date.now()) / (1000 * 3600 * 24));
          if (diffDays <= 1) {
            nudgeType = "1_day_prior";
            isUrgent = true;
          }
        }
      }

      const res = await sendNudgeEmail({
        recipientUID: targetUID,
        taskTitle: title.trim() || task.title,
        eventName: "Organization Event",
        deadline: dueDateStr || "Upcoming",
        message: isUrgent
          ? "Urgent Reminder: This task is due tomorrow!"
          : "Contextual Nudge: Checking in on progress 3 days prior to deadline.",
        isUrgent,
        nudgeType
      });

      if (res.success) {
        useToastStore.getState().showToast({
          title: "Nudge Email Sent",
          description: `Successfully sent ${nudgeType === "1_day_prior" ? "1-Day Prior (Urgent)" : "3-Days Prior"} nudge for "${title || task.title}" to ${targetName}.`,
          tone: "success"
        });
      } else {
        useToastStore.getState().showToast({
          title: "Could Not Send Nudge",
          description: res.error || "Failed to deliver email nudge.",
          tone: "error"
        });
      }
    } catch (err: any) {
      useToastStore.getState().showToast({
        title: "Error Sending Nudge",
        description: err.message || "An unexpected error occurred.",
        tone: "error"
      });
    } finally {
      setSendingNudge(false);
    }
  }

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    if (!isLeader) {
      onUpdateTask({ ...task, status });
      onClose();
      return;
    }
    if (!title.trim()) return;
    const error = getDateRangeError(startDate, dueDate, "Task");
    setDateError(error || "");
    if (error) return;

    const selectedMember = isLeader ? selectedAssignee : null;
    const nextDueDate = dueDate.trim();
    const dueDateChanged = nextDueDate !== (task.dueDate || "");

    const updated: Task = {
      ...task,
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      priorityChangeRequest: task.priorityChangeRequest,
      committee,
      startDate: startDate.trim(),
      dueDate: nextDueDate,
      originalStartDate: task.originalStartDate ?? task.startDate,
      originalDueDate: task.originalDueDate ?? task.dueDate,
      dueDateHistory: dueDateChanged
        ? [...(task.dueDateHistory ?? []), { from: task.dueDate || "", to: nextDueDate, changedAt: new Date().toISOString() }]
        : task.dueDateHistory,
      isLeaderOnly,
      assignee: selectedMember ? {
        initials: selectedMember.initials,
        color: selectedMember.color,
        name: selectedMember.name
      } : task.assignee,
      assignedMemberName: selectedMember?.name ?? task.assignedMemberName ?? null,
      assignedMemberUID: selectedMember?.id ?? task.assignedMemberUID ?? null
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
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4">
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
                onChange={setSelectedMemberId}
                options={assigneeOptions}
                placeholder="Select a member"
                buttonClassName="py-2 text-xs"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Committee</label>
              <CustomSelect value={committee} onChange={setCommittee} disabled={committeeOptions.length === 0} placeholder="No committees available" options={committeeOptions.map((name) => ({ value: name, label: name.endsWith("Committee") ? name : `${name} Committee` }))} buttonClassName="min-h-11 rounded-xl" dropdownClassName="[&_button]:min-h-11" portal />
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
                onChange={(value) => { setStartDate(value); setDateError(""); }}
                minDate={new Date()}
                maxDate={parseScheduleDate(dueDate) || undefined}
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
                onChange={(value) => { setDueDate(value); setDateError(""); }}
                minDate={parseScheduleDate(startDate) || new Date()}
                placeholder="Select due date & time"
                includeTime={true}
              />
            </div>
          </div>
          {(dateError || getDateRangeError(startDate, dueDate, "Task")) && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{getDateRangeError(startDate, dueDate, "Task") || dateError}</p>}
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
          {canViewReview && task.performanceReview ? (
            <section aria-label="Leader performance review" className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <h4 className="text-xs font-semibold text-slate-700">Leader performance review</h4>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                <Star size={16} className="fill-amber-400 text-amber-400" /> {task.performanceReview.rating}/5
              </p>
              {task.performanceReview.feedback ? <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600">{task.performanceReview.feedback}</p> : null}
            </section>
          ) : null}
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
            <div className="flex flex-wrap items-center gap-2">
              {isLeader && canEdit && onDeleteTask ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  <Trash2 size={14} />
                  Delete task
                </button>
              ) : null}
              {canEdit && (
                <button
                  type="button"
                  onClick={handleSendManualNudge}
                  disabled={sendingNudge}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 hover:text-blue-800 disabled:opacity-50"
                  title="Test or dispatch an adviser-recommended nudge email right now"
                >
                  <Bell size={14} className="text-blue-600" />
                  {sendingNudge ? "Sending Nudge..." : "Send Nudge Email"}
                </button>
              )}
            </div>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                {canEdit ? "Cancel" : "Close"}
              </button>
              {canEdit ? (
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
                >
                  {isLeader ? "Save changes" : "Update status"}
                </button>
              ) : null}
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
