"use client";

import { Check, Search, UserCheck, X } from "lucide-react";
import { useState } from "react";
import type { Task } from "./types";
import { MOCK_ROSTER, type OrgMemberItem } from "./AddTaskModal";

type ReassignTaskModalProps = {
  task: Task;
  onClose: () => void;
  onConfirmReassign: (taskId: string, newAssignee: OrgMemberItem) => void;
  roster?: OrgMemberItem[];
};

export function ReassignTaskModal({
  task,
  onClose,
  onConfirmReassign,
  roster
}: ReassignTaskModalProps) {
  const activeRoster = roster && roster.length > 0 ? roster : MOCK_ROSTER;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    activeRoster.find((m) => m.name === task.assignee?.name || m.initials === task.assignee?.initials)?.id || activeRoster[0]?.id || "m1"
  );

  const filteredMembers = activeRoster.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const selected = activeRoster.find((m) => m.id === selectedMemberId);
    if (!selected) return;
    onConfirmReassign(task.id, selected);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 font-bold">
              <UserCheck size={18} />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Reassign Task Delegation</h3>
              <p className="text-xs text-slate-500 font-medium">Reassigning &quot;{task.title}&quot;</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search team member..."
            className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] pl-9 pr-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Member Roster List */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {filteredMembers.map((member) => {
              const isSelected = selectedMemberId === member.id;
              return (
                <label
                  key={member.id}
                  onClick={() => setSelectedMemberId(member.id)}
                  className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-100"
                      : "border-slate-200/80 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-white font-bold text-xs ${member.color}`}>
                      {member.initials}
                    </span>
                    <div>
                      <span className="block text-xs font-bold text-slate-900">{member.name}</span>
                      <span className="block text-[10px] text-slate-500 font-medium">{member.position}</span>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-blue-600 text-white">
                      <Check size={12} />
                    </span>
                  )}
                </label>
              );
            })}
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
              className="rounded-2xl bg-[#2563eb] py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition"
            >
              Confirm Reassignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
