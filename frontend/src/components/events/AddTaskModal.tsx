"use client";

import { Plus, Shield, X } from "lucide-react";
import { useState } from "react";
import type { Task, TaskPriority, TaskStatus } from "./types";
import { MiniCalendarPicker } from "./MiniCalendarPicker";
import type { CustomStatusConfig } from "./statusUtils";
import type { OrganizationMember } from "@/services/auth.service";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/CustomSelect";

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

export const MOCK_ROSTER: OrgMemberItem[] = [
  { id: "m1", name: "Luis Garcia", initials: "LG", color: "bg-[#1e3a5f]", position: "Operations Lead" },
  { id: "m2", name: "Beatrice Lim", initials: "BL", color: "bg-purple-600", position: "Marketing Lead" },
  { id: "m3", name: "Marco Dela Cruz", initials: "MC", color: "bg-emerald-600", position: "Tech Lead" },
  { id: "m4", name: "Ana Reyes", initials: "AR", color: "bg-[#d97706]", position: "Logistics Lead" },
  { id: "m5", name: "Patricia Uy", initials: "PU", color: "bg-rose-600", position: "Finance Lead" }
];

type AddTaskModalProps = {
  eventName: string;
  members?: OrganizationMember[];
  onClose: () => void;
  onAddTask: (newTask: Task) => void;
  roster?: OrgMemberItem[];
  committees?: { id: string; name: string }[];
  customStatuses?: CustomStatusConfig[];
};

export function AddTaskModal({
  eventName,
  onClose,
  onAddTask,
  roster,
  committees = [],
  customStatuses = []
}: AddTaskModalProps) {
  const activeRoster = roster && roster.length > 0 ? roster : MOCK_ROSTER;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("To Do");
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [assigneeId, setAssigneeId] = useState(activeRoster[0]?.id || "m1");
  const [committee, setCommittee] = useState("General");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isLeaderOnly, setIsLeaderOnly] = useState(false);

  const defaultStatuses: TaskStatus[] = ["To Do", "In Progress", "In Review", "Completed"];
  const allStatuses: TaskStatus[] = [
    ...defaultStatuses,
    ...customStatuses.map((cs) => cs.name as TaskStatus)
  ];

  const defaultCommittees = ["General", "Executive", "Logistics", "Marketing", "Finance", "Technical"];
  const committeeOptions = Array.from(
    new Set([...defaultCommittees, ...committees.map((c) => c.name)])
  );
  const statusOptions: CustomSelectOption[] = allStatuses.map((value) => ({ value, label: value }));
  const priorityOptions: CustomSelectOption[] = ["Low", "Medium", "High", "Critical"].map((value) => ({ value, label: value }));
  const assigneeOptions: CustomSelectOption[] = activeRoster.map((member) => ({
    value: member.id,
    label: member.name,
    sublabel: member.position,
    initials: member.initials,
    color: member.color
  }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const selectedMember = activeRoster.find((m) => m.id === assigneeId) || activeRoster[0];

    const nowStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      description: description.trim() || "Leader-authored event task.",
      status,
      priority,
      committee,
      startDate: startDate.trim() || nowStr,
      dueDate: dueDate.trim() || nowStr,
      assignee: {
        initials: selectedMember.initials,
        color: selectedMember.color,
        name: selectedMember.name
      },
      assignedMemberName: selectedMember.name,
      assignedMemberUID: selectedMember.id,
      isLeaderOnly,
      requiredSkills: ["Event Coordination"]
    };

    onAddTask(newTask);
    onClose();
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Assignee</label>
              <CustomSelect
                value={assigneeId}
                onChange={(val) => setAssigneeId(val)}
                options={assigneeOptions}
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
              className="rounded-2xl bg-[#2563eb] py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-md"
            >
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
