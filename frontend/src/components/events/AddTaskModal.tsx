"use client";

import { Plus, Shield, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Task, TaskPriority, TaskStatus } from "./types";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/CustomSelect";
import {
  subscribeOrganizationMembersFirestore,
  type OrganizationMember
} from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";

export type OrgMemberItem = {
  id: string;
  name: string;
  initials: string;
  color: string;
  position: string;
};

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-[#1e3a5f]",
  "bg-purple-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-blue-600",
  "bg-indigo-600",
  "bg-teal-600"
];

export function getMemberColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function memberToOrgItem(m: OrganizationMember): OrgMemberItem {
  return {
    id: m.id,
    name: m.name,
    initials: getInitials(m.name),
    color: getMemberColor(m.id),
    position: m.position || m.role || "Member"
  };
}

type AddTaskModalProps = {
  eventName: string;
  members?: OrganizationMember[];
  onClose: () => void;
  onAddTask: (newTask: Task) => void;
};

export function AddTaskModal({ eventName, members, onClose, onAddTask }: AddTaskModalProps) {
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);

  const [liveMembers, setLiveMembers] = useState<OrganizationMember[]>(members || []);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("To Do");
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState("Aug 28");
  const [isLeaderOnly, setIsLeaderOnly] = useState(false);

  useEffect(() => {
    if (members && members.length > 0) {
      setLiveMembers(members);
      setAssigneeId((prev) => prev || members[0].id);
      return;
    }

    const unsub = subscribeOrganizationMembersFirestore(
      profile?.organizationId ?? null,
      (fetchedMembers) => {
        setLiveMembers(fetchedMembers);
        if (fetchedMembers.length > 0) {
          setAssigneeId((prev) => prev || fetchedMembers[0].id);
        }
      },
      firebaseUser
    );
    return () => unsub();
  }, [members, profile?.organizationId, firebaseUser]);

  const assigneeOptions: CustomSelectOption[] = liveMembers.map((m) => ({
    value: m.id,
    label: m.name,
    sublabel: m.position || m.role || "Member",
    initials: getInitials(m.name),
    color: getMemberColor(m.id)
  }));

  const statusOptions: CustomSelectOption[] = [
    { value: "To Do", label: "To Do" },
    { value: "In Progress", label: "In Progress" },
    { value: "In Review", label: "In Review" },
    { value: "Completed", label: "Completed" }
  ];

  const priorityOptions: CustomSelectOption[] = [
    { value: "Low", label: "Low" },
    { value: "Medium", label: "Medium" },
    { value: "High", label: "High" },
    { value: "Critical", label: "Critical" }
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const memberObj = liveMembers.find((m) => m.id === assigneeId) || liveMembers[0];
    const selectedOrgItem: OrgMemberItem = memberObj
      ? memberToOrgItem(memberObj)
      : {
          id: "unassigned",
          name: "Unassigned Member",
          initials: "UM",
          color: "bg-slate-600",
          position: "Member"
        };

    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      description: description.trim() || "Leader-authored event task.",
      status,
      priority,
      dueDate: dueDate.trim() || "Aug 30",
      assignee: {
        initials: selectedOrgItem.initials,
        color: selectedOrgItem.color,
        name: selectedOrgItem.name
      },
      isLeaderOnly,
      requiredSkills: ["Event Coordination"]
    };

    onAddTask(newTask);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
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
                placeholder={liveMembers.length === 0 ? "Loading members..." : "Select assignee"}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Due Date</label>
              <input
                type="text"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                placeholder="e.g. Aug 28"
                className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none shadow-2xs"
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
