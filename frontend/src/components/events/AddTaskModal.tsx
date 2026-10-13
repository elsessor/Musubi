"use client";

import { getDateRangeError, parseScheduleDate } from "@/utils/dateRange";

import { Plus, Shield, X } from "lucide-react";
import { useState } from "react";
import type { Nudge, Task, TaskPriority, TaskStatus } from "./types";
import { MiniCalendarPicker } from "./MiniCalendarPicker";
import { getOrderedTaskStatuses, getStatusTheme, type CustomStatusConfig } from "./statusUtils";
import type { OrganizationMember } from "@/services/auth.service";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/CustomSelect";
import { ALL_PRIORITIES, PRIORITY_CONFIG } from "./priorityUtils";
import { TaskDependencySelector } from "./TaskDependencies";
import { getTaskDependencyError } from "@/utils/taskDependencies";

export type OrgMemberItem = {
  id: string;
  name: string;
  initials: string;
  color: string;
  position: string;
};

export function mapOrgMemberToItem(member: OrganizationMember): OrgMemberItem {
  const initials = member.name
    ? member.name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "ME";

  const colors = [
    "bg-[#1e3a5f]",
    "bg-purple-600",
    "bg-emerald-600",
    "bg-[#d97706]",
    "bg-rose-600",
    "bg-blue-600",
    "bg-indigo-600"
  ];
  let hash = 0;
  for (let i = 0; i < (member.id || "").length; i++) {
    hash = (member.id || "").charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colors.length;

  return {
    id: member.id,
    name: member.name,
    initials: initials || "ME",
    color: colors[colorIndex],
    position: member.position || member.role || "Member"
  };
}

export const memberToOrgItem = mapOrgMemberToItem;

type AddTaskModalProps = {
  eventName: string;
  eventCommittee?: string;
  tasks?: Task[];
  members?: OrganizationMember[];
  onClose: () => void;
  onAddTask: (newTask: Task) => void | Promise<void>;
  roster?: OrgMemberItem[];
  customStatuses?: CustomStatusConfig[];
  statusOrder?: string[];
};

export function AddTaskModal({
  eventName,
  eventCommittee = "",
  tasks = [],
  members = [],
  onClose,
  onAddTask,
  roster,
  customStatuses = [],
  statusOrder
}: AddTaskModalProps) {
  const activeRoster = roster ?? members.map(mapOrgMemberToItem);
  const [title, setTitle] = useState("");
  const [taskId] = useState(() => `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("To Do");
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dateError, setDateError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isLeaderOnly, setIsLeaderOnly] = useState(false);
  const [dependsOnTaskIds, setDependsOnTaskIds] = useState<string[]>([]);
  const scheduleError = getDateRangeError(startDate, dueDate, "Task");

  const allStatuses = getOrderedTaskStatuses(statusOrder, customStatuses);

  const statusOptions: CustomSelectOption[] = allStatuses.map((value) => {
    const theme = getStatusTheme(value, customStatuses);
    return { value, label: value, indicatorClass: theme.dot, selectedClass: theme.badge,
      disabled: Boolean(getTaskDependencyError([...tasks, { id: taskId, status: value, dependsOnTaskIds }], tasks)) };
  });
  const priorityOptions: CustomSelectOption[] = ALL_PRIORITIES.map((value) => ({
    value,
    label: value,
    indicatorClass: PRIORITY_CONFIG[value].dot,
    selectedClass: PRIORITY_CONFIG[value].classes
  }));
  const assigneeOptions: CustomSelectOption[] = [
    { value: "", label: "No assignee" },
    ...activeRoster.map((member) => ({
      value: member.id,
      label: member.name,
      sublabel: member.position,
      initials: member.initials,
      color: member.color
    }))
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || saving) return;

    const selectedMember = activeRoster.find((m) => m.id === assigneeId);
    if (assigneeId && !selectedMember) {
      setDateError("The selected assignee is no longer available. Choose another member or No assignee.");
      return;
    }

    const error = getDateRangeError(startDate.trim(), dueDate.trim(), "Task");
    setDateError(error || "");
    if (error) return;
    const targetDue = parseScheduleDate(dueDate);
    const defaultNudges: Nudge[] = targetDue ? [3, 1].map((days) => ({
      nudgeUID: `nudge_${Date.now()}_${days}d`,
      triggerDate: new Date(targetDue.getTime() - days * 24 * 3600 * 1000).toISOString().split("T")[0],
      nudgeType: days === 3 ? "3 Days Prior" : "1 Day Prior",
      sent: false
    })) : [];

    const newTask: Task = {
      id: taskId,
      title: title.trim(),
      description: description.trim() || "Leader-authored event task.",
      status,
      dependsOnTaskIds,
      priority,
      committee: eventCommittee,
      startDate: startDate.trim(),
      dueDate: dueDate.trim(),
      assignee: {
        initials: selectedMember?.initials ?? "",
        color: selectedMember?.color ?? "bg-slate-400",
        name: selectedMember?.name ?? ""
      },
      assignedMemberName: selectedMember?.name ?? null,
      assignedMemberUID: selectedMember?.id ?? null,
      isLeaderOnly,
      requiredSkills: ["Event Coordination"],
      nudges: defaultNudges
    };

    const dependencyError = getTaskDependencyError([...tasks, newTask], tasks);
    if (dependencyError) { setDateError(dependencyError); return; }
    setSaving(true);
    try {
      await onAddTask(newTask);
      onClose();
    } catch (cause) {
      setDateError(cause instanceof Error ? cause.message : "Unable to create the task. Please try again.");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-[#e0e7ff] text-[#2563eb]">
              <Plus size={18} />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Add Task to Event</h3>
              <p className="text-xs text-slate-500 font-medium">Adding to &quot;{eventName}&quot;</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Secure AV & Sound Equipment Clearance"
              className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Specify requirements or instructions..."
              className="w-full resize-none rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-2 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none shadow-2xs"
            />
          </div>

          <TaskDependencySelector taskId={taskId} tasks={tasks} value={dependsOnTaskIds} onChange={setDependsOnTaskIds} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Status</label>
              <CustomSelect
                value={status}
                onChange={(val) => setStatus(val as TaskStatus)}
                options={statusOptions}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Priority</label>
              <CustomSelect
                value={priority}
                onChange={(val) => setPriority(val as TaskPriority)}
                options={priorityOptions}
              />
            </div>
          </div>

          <div className="min-w-0">
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Assignee</label>
            <CustomSelect
              value={assigneeId}
              onChange={(val) => setAssigneeId(val)}
              options={assigneeOptions}
              multiline
              buttonClassName="min-h-11 rounded-xl"
              dropdownClassName="[&_button]:min-h-11"
              portal
            />
          </div>

          {/* START DATE & DUE/END DATE WITH TIME */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
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
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
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
          {(scheduleError || dateError) && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{scheduleError || dateError}</p>}

          {/* Leader Only Restriction */}
          <div className="rounded-2xl bg-amber-50/70 p-3 border border-amber-200/70">
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
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || Boolean(scheduleError)}
              className="rounded-2xl bg-[#2563eb] py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-md disabled:opacity-60"
            >
              {saving ? "Saving..." : "Add Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
