"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  Edit3,
  Lock,
  Shield,
  Sparkles,
  X,
  Zap
} from "lucide-react";
import { useState } from "react";
import type { Task, TaskPriority, TaskStatus } from "./types";
import { getStatusTheme, type CustomStatusConfig } from "./statusUtils";
import { MOCK_ROSTER, type OrgMemberItem } from "./AddTaskModal";
import { MiniCalendarPicker } from "./MiniCalendarPicker";

const DEFAULT_STATUSES: TaskStatus[] = ["To Do", "In Progress", "In Review", "Completed"];
const ALL_PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Critical"];

type TaskDetailModalProps = {
  task: Task;
  onClose: () => void;
  onUpdateTask: (updatedTask: Task) => void;
  customStatuses?: CustomStatusConfig[];
  committees?: { id: string; name: string }[];
  roster?: OrgMemberItem[];
};

export function TaskDetailModal({
  task,
  onClose,
  onUpdateTask,
  customStatuses = [],
  committees = [],
  roster = MOCK_ROSTER
}: TaskDetailModalProps) {
  const activeRoster = Array.isArray(roster) && roster.length > 0 ? roster : MOCK_ROSTER;

  const [title, setTitle] = useState(task.title || "");
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority || "Medium");
  const [committee, setCommittee] = useState<string>(task.committee || "General");
  const [startDate, setStartDate] = useState<string>(task.startDate || "");
  const [dueDate, setDueDate] = useState<string>(task.dueDate || "");
  const [isLeaderOnly, setIsLeaderOnly] = useState<boolean>(Boolean(task.isLeaderOnly));

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

  const defaultCommittees = ["General", "Executive", "Logistics", "Marketing", "Finance", "Technical"];
  const committeeOptions = Array.from(
    new Set([...defaultCommittees, ...committees.map((c) => c.name), ...(task.committee ? [task.committee] : [])])
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const selectedMember = activeRoster.find((m) => m.id === selectedMemberId) || activeRoster[0] || MOCK_ROSTER[0];

    const updated: Task = {
      ...task,
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      committee,
      startDate: startDate.trim(),
      dueDate: dueDate.trim(),
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
              placeholder="Specify requirements or instructions..."
              className="w-full resize-none rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-2 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* STATUS & PRIORITY */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500"
              >
                {allStatuses.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500"
              >
                {ALL_PRIORITIES.map((pr) => (
                  <option key={pr} value={pr}>
                    {pr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ASSIGNEE & COMMITTEE */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Assignee</label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500"
              >
                {activeRoster.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.position})
                  </option>
                ))}
              </select>
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
          </div>

          {/* START DATE & DUE/END DATE WITH TIME */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                Start Date &amp; Time
              </label>
              <MiniCalendarPicker
                value={startDate}
                onChange={setStartDate}
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
                onChange={setDueDate}
                placeholder="Select due date & time"
                includeTime={true}
              />
            </div>
          </div>

          {/* LEADER ONLY RESTRICTION */}
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
              className="rounded-2xl bg-[#2563eb] py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-md"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
