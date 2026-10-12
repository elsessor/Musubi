"use client";

import { Bell, Check, Edit2, Shield, Sparkles, X } from "lucide-react";
import { useId, useState } from "react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { MemberAvatar } from "@/components/dashboard/MemberAvatar";
import type { OrganizationMember } from "@/services/auth.service";
import { sendNudgeEmail } from "@/services/notifications.service";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { getDateRangeError, parseScheduleDate } from "@/utils/dateRange";
import { getTaskReminder } from "@/utils/taskTiming";
import { findBestMemberForSubtask } from "@/utils/heuristicDelegation";
import { resolveSubtaskAssignee, uniqueOrganizationMembers } from "@/utils/subtaskAssignment";
import { MiniCalendarPicker } from "./MiniCalendarPicker";
import { ALL_PRIORITIES, PRIORITY_CONFIG } from "./priorityUtils";
import type { Subtask, TaskPriority } from "./types";
import { TaskDependencySelector } from "./TaskDependencies";
import { getTaskDependencyError, type DependencyTask } from "@/utils/taskDependencies";

type AtomizedTaskEditModalProps = {
  subtask: Subtask;
  subtasks?: DependencyTask[];
  members: OrganizationMember[];
  onClose: () => void;
  onSave: (updated: Subtask) => void;
};

function formatDeadline(date: Date): string {
  const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const hour = String(date.getHours() % 12 || 12).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${day} at ${hour}:${minute} ${date.getHours() >= 12 ? "PM" : "AM"}`;
}

function deadlineInDays(days: number, start?: Date | null): string {
  const date = start ? new Date(start) : new Date();
  date.setDate(date.getDate() + days);
  date.setHours(9, 0, 0, 0);
  return formatDeadline(date);
}

export function AtomizedTaskEditModal({ subtask, subtasks = [subtask], members, onClose, onSave }: AtomizedTaskEditModalProps) {
  const panelId = useId();
  const [title, setTitle] = useState(subtask.title);
  const [description, setDescription] = useState(subtask.description);
  const [priority, setPriority] = useState<TaskPriority>(subtask.priority);
  const [dependsOnTaskIds, setDependsOnTaskIds] = useState<string[]>(subtask.dependsOnTaskIds || []);
  const [startDate, setStartDate] = useState(() => {
    if (subtask.startDate) return subtask.startDate;
    const today = new Date();
    today.setHours(9, 0, 0, 0);
    return formatDeadline(today);
  });
  const [deadline, setDeadline] = useState(() => {
    const savedDeadline = subtask.dueDate || subtask.deadline;
    const date = parseScheduleDate(savedDeadline);
    if (date) {
      if (!savedDeadline?.match(/\d{1,2}:\d{2}/)) date.setHours(9, 0, 0, 0);
      return formatDeadline(date);
    }
    return deadlineInDays(subtask.estimatedDays || 7, parseScheduleDate(startDate));
  });
  const [isLeaderOnly, setIsLeaderOnly] = useState(subtask.isLeaderOnly);
  const [skills, setSkills] = useState(subtask.requiredSkills);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [sendNudgeAlert, setSendNudgeAlert] = useState(true);
  const [dateError, setDateError] = useState("");
  const scheduleError = getDateRangeError(startDate, deadline, "Task");
  const availableMembers = uniqueOrganizationMembers(members);
  const bestMatch = findBestMemberForSubtask({ title, description, requiredSkills: skills }, availableMembers);
  const [selectedMemberId, setSelectedMemberId] = useState(() => subtask.assignedMemberUID
    || resolveSubtaskAssignee(subtask, availableMembers)?.id
    || (!subtask.assigneeName || subtask.assigneeName === "Unassigned" ? bestMatch?.member.id || availableMembers[0]?.id : "") || "");
  const senderUID = useAuthStore((state) => state.firebaseUser?.uid ?? state.profile?.uid);
  const senderRole = useAuthStore((state) => state.profile?.role);
  const assignedMember = availableMembers.find((member) => member.id === selectedMemberId);
  const assigneeName = assignedMember?.name || subtask.assigneeName || "Unassigned";
  const canSendNudge = Boolean(senderUID && assignedMember?.id && assignedMember.id !== senderUID)
    && (senderRole === "Student Leader" || senderRole === "Admin");

  function handleDeadlineChange(value: string) {
    setDeadline(value);
    setDateError("");
  }

  function handleStartDateChange(value: string) {
    setStartDate(value);
    setDateError("");
  }

  function handleAddSkill() {
    const skill = newSkillInput.trim();
    if (skill && !skills.includes(skill)) {
      setSkills((previous) => [...previous, skill]);
      setNewSkillInput("");
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    const dependencyError = getTaskDependencyError(subtasks.map((task) => task.id === subtask.id ? { ...task, dependsOnTaskIds } : task));
    if (dependencyError) { setDateError(dependencyError); return; }
    const scheduleStart = parseScheduleDate(startDate);
    const targetDate = parseScheduleDate(deadline);
    const rangeError = getDateRangeError(startDate, deadline, "Task");
    if (rangeError) {
      setDateError(rangeError);
      return;
    }
    if (!targetDate) {
      setDateError("Choose a valid deadline.");
      return;
    }
    if (!scheduleStart) {
      setDateError("Choose a valid start date.");
      return;
    }
    const estimatedDays = Math.max(1, Math.ceil((targetDate.getTime() - scheduleStart.getTime()) / 86400000));
    const timing = getTaskReminder({ status: "To Do", dueDate: deadline });
    const nudges = [3, 1].map((days) => ({
      nudgeUID: `${subtask.id}_${days}d`,
      triggerDate: new Date(targetDate.getTime() - days * 86400000).toISOString().split("T")[0],
      nudgeType: days === 3 ? "3 Days Prior" : "1 Day Prior",
      sent: false
    }));
    if (sendNudgeAlert && canSendNudge && assignedMember) {
      void sendNudgeEmail({
        recipientUID: assignedMember.id,
        taskTitle: title.trim(),
        eventName: "Organization Task",
        deadline,
        message: timing ? `${timing.label}. Please check your task progress.` : "Please check your task progress.",
        isUrgent: timing?.kind === "overdue" || timing?.kind === "due-today",
        nudgeType: timing?.kind === "due-tomorrow" ? "1_day_prior" : timing?.kind === "due-today" ? "due_today" : timing?.kind || "standard"
      }).then((result) => {
        if (!result.success) useToastStore.getState().showToast({ title: "Could not send nudge", description: result.error || "The task was saved, but the email could not be sent.", tone: "error" });
      });
    }
    onSave({ ...subtask, title: title.trim(), description: description.trim(), priority, dependsOnTaskIds,
      assigneeName, assignedMemberUID: selectedMemberId || null, estimatedDays, isLeaderOnly, requiredSkills: skills,
      startDate: startDate.trim(), dueDate: deadline, deadline, nudges });
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={`${panelId}-title`} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="max-h-[90dvh] w-full min-w-0 max-w-lg space-y-5 overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:rounded-3xl sm:p-6">
        {/* Modal Header (Matching Screenshot 2) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e0e7ff] text-[#3b82f6]">
              <Edit2 size={18} />
            </span>
            <h3 id={`${panelId}-title`} className="text-lg font-bold text-slate-900">Edit AI Task</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close task editor" className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-y rounded-2xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm leading-6 text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Assignee Selection */}
          <TaskDependencySelector taskId={subtask.id} tasks={subtasks} value={dependsOnTaskIds} onChange={setDependsOnTaskIds} />
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Assignee
            </label>
            <CustomSelect
              value={selectedMemberId}
              onChange={setSelectedMemberId}
              options={[
                ...(!assignedMember ? [{ value: selectedMemberId, label: assigneeName }] : []),
                ...availableMembers.map((m) => ({
                      value: m.id,
                      label: m.name,
                      profilePicture: m.profilePicture || null,
                      sublabel: m.position || m.role
                    }))
              ]}
              buttonClassName="py-3 text-sm font-semibold"
            />
            {bestMatch && (
              <div className="mt-2.5 rounded-2xl border border-blue-100 bg-slate-50/70 p-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <Sparkles size={14} className="text-blue-600 shrink-0" />
                    <span>Recommended Assignee</span>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200/50">
                    {bestMatch.score}% Match
                  </span>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <MemberAvatar member={bestMatch.member} className="size-8 shrink-0" />
                  <p className="min-w-0 break-words text-xs font-bold text-slate-900">
                    {bestMatch.member.name}{" "}
                    <span className="font-normal text-slate-500">
                      ({bestMatch.member.position || bestMatch.member.role || "Member"})
                    </span>
                  </p>
                </div>
                {bestMatch.explanation && (
                  <p className="text-[11px] font-medium text-slate-600">
                    {bestMatch.explanation}
                  </p>
                )}
                {bestMatch.matchedSkills.length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                      Matching Skills:
                    </span>
                    {bestMatch.matchedSkills.map((skill) => (
                      <span key={skill} className="flex max-w-full items-center gap-1 rounded-md border border-emerald-200/70 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <span className="min-w-0 break-words">{skill}</span>
                        <Check size={11} className="shrink-0 stroke-[2.5] text-emerald-600" />
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Schedule & Auto-Reminder Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <Bell size={14} className="text-blue-600 shrink-0" />
                <span>Adviser-Recommended Nudges</span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                3-Day & 1-Day Active
              </span>
            </div>

            <div className="text-xs text-slate-600 space-y-1.5 font-normal leading-relaxed">
              <p>
                Assigned to <span className="font-semibold text-slate-900">{assigneeName}</span> · Due on{" "}
                <span className="font-semibold text-slate-900">{deadline}</span>.
              </p>
              <div className="rounded-xl border border-slate-200/70 bg-white p-2.5 space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2 text-amber-700">
                  <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span><strong>3 Days Prior:</strong> Contextual progress check email sent to {assigneeName}.</span>
                </div>
                <div className="flex items-center gap-2 text-rose-600">
                  <span className="size-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span><strong>1 Day Prior:</strong> Urgent final deadline reminder email sent 24h before due date.</span>
                </div>
              </div>
            </div>

            {canSendNudge ? <label className="flex items-center gap-2 pt-2 border-t border-slate-200/60 cursor-pointer select-none text-xs font-semibold text-slate-700 hover:text-slate-900 transition">
              <input
                type="checkbox"
                checked={sendNudgeAlert}
                onChange={(e) => setSendNudgeAlert(e.target.checked)}
                className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Send initial assignment notification nudge to member on save</span>
            </label> : null}
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Start Date &amp; Time</label>
              <MiniCalendarPicker value={startDate} onChange={handleStartDateChange} minDate={new Date()} maxDate={parseScheduleDate(deadline) || undefined} placeholder="Select start date & time" includeTime />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Target Date &amp; Time</label>
              <MiniCalendarPicker value={deadline} onChange={handleDeadlineChange} minDate={parseScheduleDate(startDate) || new Date()} placeholder="Select target date & time" includeTime />
            </div>
          </div>
          {(scheduleError || dateError) ? <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{scheduleError || dateError}</p> : null}

          {/* Priority */}
          <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Priority</label>
              <CustomSelect
                value={priority}
                onChange={(val) => setPriority(val as TaskPriority)}
                options={ALL_PRIORITIES.map((value) => ({ value, label: value, indicatorClass: PRIORITY_CONFIG[value].dot, selectedClass: PRIORITY_CONFIG[value].classes }))}
                buttonClassName="py-2.5 text-xs font-semibold"
              />
          </div>

          {/* Required Skills Chip Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Required Skills (Chip Input)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="Type skill name & enter"
                className="min-h-11 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2 text-xs text-slate-800"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="rounded-2xl bg-slate-800 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-900 shrink-0"
              >
                Add
              </button>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 border border-blue-200"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => setSkills(skills.filter((k) => k !== s))}
                    className="text-blue-500 hover:text-blue-800"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Leader Only Restricted Toggle */}
          <div className="rounded-2xl bg-amber-50/70 p-3 border border-amber-200/70">
            <label className="flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isLeaderOnly}
                onChange={(e) => setIsLeaderOnly(e.target.checked)}
                className="size-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <Shield size={14} className="text-amber-600" />
              Leader Only Access Restricted
            </label>
          </div>

          {/* Modal Action Buttons (Exact Screenshot 2 Design) */}
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={Boolean(scheduleError)}
              className="rounded-2xl bg-[#2563eb] py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition disabled:opacity-50"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
