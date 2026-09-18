"use client";

import { Plus, Shield, X } from "lucide-react";
import { useState } from "react";
import type { Task, TaskPriority, TaskStatus } from "./types";

export type OrgMemberItem = {
  id: string;
  name: string;
  initials: string;
  color: string;
  position: string;
};

export const MOCK_ROSTER: OrgMemberItem[] = [
  { id: "m1", name: "Luis Garcia", initials: "LG", color: "bg-[#1e3a5f]", position: "Operations Lead" },
  { id: "m2", name: "Beatrice Lim", initials: "BL", color: "bg-purple-600", position: "Marketing Lead" },
  { id: "m3", name: "Marco Dela Cruz", initials: "MC", color: "bg-emerald-600", position: "Tech Lead" },
  { id: "m4", name: "Ana Reyes", initials: "AR", color: "bg-[#d97706]", position: "Logistics Lead" },
  { id: "m5", name: "Patricia Uy", initials: "PU", color: "bg-rose-600", position: "Finance Lead" }
];

type AddTaskModalProps = {
  eventName: string;
  onClose: () => void;
  onAddTask: (newTask: Task) => void;
};

export function AddTaskModal({ eventName, onClose, onAddTask }: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("To Do");
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [assigneeId, setAssigneeId] = useState("m1");
  const [dueDate, setDueDate] = useState("Aug 28");
  const [isLeaderOnly, setIsLeaderOnly] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const selectedMember = MOCK_ROSTER.find((m) => m.id === assigneeId) || MOCK_ROSTER[0];

    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      description: description.trim() || "Leader-authored event task.",
      status,
      priority,
      dueDate: dueDate.trim() || "Aug 30",
      assignee: {
        initials: selectedMember.initials,
        color: selectedMember.color,
        name: selectedMember.name
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
              className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
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
              className="w-full resize-none rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-2 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2 text-xs font-semibold text-slate-800"
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="In Review">In Review</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2 text-xs font-semibold text-slate-800"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2 text-xs font-semibold text-slate-800"
              >
                {MOCK_ROSTER.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.position})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Due Date</label>
              <input
                type="text"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                placeholder="e.g. Aug 28"
                className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2 text-xs font-semibold text-slate-800"
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
