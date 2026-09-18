"use client";

<<<<<<< HEAD
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
=======
import { useEffect, useState } from "react";
import { Check, ClipboardList, Plus, ShieldAlert, UserCheck, X } from "lucide-react";
import type { Event, Task, TaskPriority, TaskStatus } from "./types";
import type { CustomStatusConfig } from "./statusUtils";
import { getOrganizationCommittees, getOrganizationMembers, type OrganizationCommitteeRecord, type OrganizationMember } from "@/services/auth.service";
import { updateEventFirestore } from "@/services/events.service";
import { useAuthStore } from "@/store/authStore";

export type AddTaskModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Specific event/goal ID to attach the subtask to */
  eventId?: string;
  /** Available events/goals list to select from if eventId is not fixed */
  events?: Event[];
  /** Default status for the subtask (e.g. when adding from a specific column) */
  defaultStatus?: TaskStatus;
  /** Optional pre-loaded members for assignment */
  members?: OrganizationMember[];
  /** Callback triggered after successfully adding a subtask */
  onTaskAdded?: (newTask: Task, eventId: string) => void;
  /** Custom task status configurations */
  customStatuses?: CustomStatusConfig[];
};

export function AddTaskModal({
  isOpen,
  onClose,
  eventId,
  events = [],
  defaultStatus = "To Do",
  members: propMembers,
  onTaskAdded,
  customStatuses = []
}: AddTaskModalProps) {
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);

  const [selectedEventId, setSelectedEventId] = useState<string>(
    eventId || (events.length > 0 ? events[0].id : "")
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedMemberUID, setAssignedMemberUID] = useState<string>("");
  const [taskCommittee, setTaskCommittee] = useState<string>("General");
  const [orgCommittees, setOrgCommittees] = useState<OrganizationCommitteeRecord[]>([]);
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [deadline, setDeadline] = useState<string>(() => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    return defaultDate.toISOString().split("T")[0];
  });
  const [matchPercentage, setMatchPercentage] = useState<number>(85);
  const [isLeaderOnly, setIsLeaderOnly] = useState<boolean>(false);
  const [enableNudge, setEnableNudge] = useState<boolean>(true);

  const [members, setMembers] = useState<OrganizationMember[]>(propMembers || []);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Sync prop changes
  useEffect(() => {
    if (eventId) {
      setSelectedEventId(eventId);
    } else if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [eventId, events]);

  useEffect(() => {
    setStatus(defaultStatus);
  }, [defaultStatus]);

  // Fetch members & committees if not provided
  useEffect(() => {
    if (!isOpen) return;
    if (!firebaseUser || !profile?.organizationId) return;

    getOrganizationCommittees(firebaseUser, profile.organizationId)
      .then((comms) => {
        setOrgCommittees(comms);
        if (comms.length > 0 && taskCommittee === "General") {
          setTaskCommittee(comms[0].name);
        }
      })
      .catch(() => { });

    if (propMembers && propMembers.length > 0) {
      setMembers(propMembers);
      return;
    }

    setLoadingMembers(true);
    getOrganizationMembers(firebaseUser, profile.organizationId)
      .then((m) => setMembers(m))
      .catch(() => { })
      .finally(() => setLoadingMembers(false));
  }, [isOpen, propMembers, firebaseUser, profile?.organizationId, taskCommittee]);

  if (!isOpen) return null;

  const targetEvent = events.find((e) => e.id === selectedEventId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a subtask title.");
      return;
    }

    const targetId = selectedEventId || eventId;
    if (!targetId) {
      setError("Please select a target goal or event.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const subtaskUID = `st_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const assignedMember = members.find((m) => m.id === assignedMemberUID);
      const initials = assignedMember
        ? assignedMember.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()
        : profile?.fullName
          ? profile.fullName.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()
          : "ME";

      const formattedDueDate = deadline
        ? new Date(deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "TBD";

      const newSubtask: Task = {
        id: subtaskUID,
        subtaskUID,
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        dueDate: formattedDueDate,
        deadline: deadline || new Date().toISOString(),
        assignedMemberUID: assignedMemberUID || null,
        assignedMemberName: assignedMember ? assignedMember.name : undefined,
        assignee: {
          initials,
          color: "bg-blue-600"
        },
        matchPercentage: Number(matchPercentage) || 85,
        isLeaderOnly: Boolean(isLeaderOnly),
        committee: taskCommittee,
        nudges: enableNudge
          ? [
            {
              nudgeUID: `nudge_${Date.now()}`,
              triggerDate: deadline || new Date().toISOString(),
              nudgeType: "deadline_reminder",
              sent: false
            }
          ]
          : []
      };

      let existingTasks: Task[] = [];
      if (targetEvent) {
        existingTasks = targetEvent.tasks || [];
      }

      const updatedTasks = [...existingTasks, newSubtask];
      const completedCount = updatedTasks.filter((t) => t.status === "Completed").length;
      const newProgress = updatedTasks.length > 0 ? Math.round((completedCount / updatedTasks.length) * 100) : 0;

      await updateEventFirestore(firebaseUser, targetId, {
        tasks: updatedTasks,
        progress: newProgress
      });

      onTaskAdded?.(newSubtask, targetId);

      // Reset & Close
      setTitle("");
      setDescription("");
      setError("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add subtask. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100/60">
              <ClipboardList size={22} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Add Subtask to Goal</h2>
              <p className="text-xs text-slate-500">Embed subtasks directly inside goal structures</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
            <X size={18} />
          </button>
        </div>

<<<<<<< HEAD
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Task Title <span className="text-rose-500">*</span>
=======
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 border border-rose-100">
              {error}
            </div>
          )}

          {/* Goal Selector */}
          {events.length > 1 && !eventId ? (
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                TARGET GOAL / EVENT <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title} ({evt.status})
                  </option>
                ))}
              </select>
            </div>
          ) : targetEvent ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Goal context</span>
              <p className="text-xs font-bold text-slate-800">{targetEvent.title}</p>
            </div>
          ) : null}

          {/* Subtask Title */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              SUBTASK TITLE <span className="text-rose-500">*</span>
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
<<<<<<< HEAD
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
=======
              placeholder='e.g. "Prepare venue setup & equipment"'
              className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Subtask Description */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              SUBTASK DESCRIPTION
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail the action items for this subtask..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-[#f8fafc] p-3.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Assigned Member */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              ASSIGNED MEMBER
            </label>
            <select
              value={assignedMemberUID}
              onChange={(e) => setAssignedMemberUID(e.target.value)}
              disabled={loadingMembers}
              className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
            >
              <option value="">-- Unassigned --</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.position || member.role}) {member.committeeName ? `• ${member.committeeName}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Committee */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              COMMITTEE
            </label>
            <select
              value={taskCommittee}
              onChange={(e) => setTaskCommittee(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              {orgCommittees.length > 0 ? (
                orgCommittees.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="Executive">Executive</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Finance">Finance</option>
                  <option value="General">General</option>
                </>
              )}
            </select>
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                STATUS
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="In Review">In Review</option>
                <option value="Completed">Completed</option>
<<<<<<< HEAD
=======
                {customStatuses.map((cs) => (
                  <option key={cs.name} value={cs.name}>
                    {cs.name}
                  </option>
                ))}
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
              </select>
            </div>

            <div>
<<<<<<< HEAD
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2 text-xs font-semibold text-slate-800"
=======
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                PRIORITY
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

<<<<<<< HEAD
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
=======
          {/* Deadline & Match Percentage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                DEADLINE
              </label>
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                MATCH SCORE ({matchPercentage}%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={matchPercentage}
                onChange={(e) => setMatchPercentage(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
              />
            </div>
          </div>

<<<<<<< HEAD
          {/* Leader Only Restriction */}
          <div className="rounded-2xl bg-amber-50/70 p-3 border border-amber-200/70">
            <label className="flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer select-none">
=======
          {/* Toggles: Leader Only & Nudges */}
          <div className="space-y-2.5 pt-1">
            <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50">
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
              <input
                type="checkbox"
                checked={isLeaderOnly}
                onChange={(e) => setIsLeaderOnly(e.target.checked)}
<<<<<<< HEAD
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
=======
                className="size-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <ShieldAlert size={14} className="text-amber-500" />
                  Leader Only Subtask (isLeaderOnly)
                </span>
                <p className="text-[11px] text-slate-500">Restrict viewing & management strictly to executive leaders</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50">
              <input
                type="checkbox"
                checked={enableNudge}
                onChange={(e) => setEnableNudge(e.target.checked)}
                className="size-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <UserCheck size={14} className="text-blue-500" />
                  Enable Automated Nudges
                </span>
                <p className="text-[11px] text-slate-500">Automatically queue deadline reminders for assigned member</p>
              </div>
            </label>
          </div>

          {/* Form Actions */}
          <div className="grid grid-cols-2 gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
            >
              Cancel
            </button>
            <button
              type="submit"
<<<<<<< HEAD
              className="rounded-2xl bg-[#2563eb] py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-md"
            >
              Add Task
=======
              disabled={submitting || !description.trim()}
              className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold text-white transition ${description.trim() && !submitting
                  ? "bg-[#213f68] hover:bg-[#193254] active:scale-[0.98]"
                  : "bg-slate-300 cursor-not-allowed opacity-70"
                }`}
            >
              {submitting ? "Embedding..." : "Add Subtask"}
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
<<<<<<< HEAD
=======

/**
 * Convenience trigger button component that opens the AddTaskModal when called.
 */
export function AddTaskButton({
  onClick,
  label = "Add Task",
  className = "",
  variant = "primary"
}: {
  onClick: () => void;
  label?: string;
  className?: string;
  variant?: "primary" | "secondary" | "outline";
}) {
  const baseClasses = "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold shadow-sm transition-all active:scale-[0.98]";
  const variants = {
    primary: "bg-[#2868ed] text-white hover:bg-blue-700 shadow-blue-500/20",
    secondary: "bg-[#213f68] text-white hover:bg-[#193254]",
    outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
  };

  return (
    <button type="button" onClick={onClick} className={`${baseClasses} ${variants[variant]} ${className}`}>
      <Plus size={14} />
      {label}
    </button>
  );
}
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
