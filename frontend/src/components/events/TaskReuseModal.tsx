"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Edit2,
  Filter,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  X
} from "lucide-react";
import type { OrganizationMember } from "@/services/auth.service";
import type { Event, Task, TaskPriority, TaskStatus } from "./types";
import { getStatusTheme } from "./statusUtils";
import { ALL_PRIORITIES, PRIORITY_CONFIG } from "./priorityUtils";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { prepareTasksForReuse, TaskReuseOptions, extractYear, computeShiftedDates, replaceYearInText } from "@/utils/taskReuse";

export type TaskReuseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  targetEvent: Event;
  allEvents: Event[];
  members?: OrganizationMember[];
  onReuseTasks: (tasks: Task[]) => Promise<void> | void;
};

export function TaskReuseModal({
  isOpen,
  onClose,
  targetEvent,
  allEvents,
  members = [],
  onReuseTasks
}: TaskReuseModalProps) {
  // Candidate source events (all events except current one, prioritizing completed/archived)
  const candidateEvents = useMemo(() => {
    return allEvents
      .filter((e) => e.id !== targetEvent.id && (e.tasks?.length || 0) > 0)
      .sort((a, b) => {
        // Sort by status relevance (Completed / Archived first, then date)
        const aScore = a.status === "Completed" || a.status === "Archived" ? 2 : 1;
        const bScore = b.status === "Completed" || b.status === "Archived" ? 2 : 1;
        return bScore - aScore;
      });
  }, [allEvents, targetEvent.id]);

  const [selectedSourceEventId, setSelectedSourceEventId] = useState<string>(
    candidateEvents[0]?.id || ""
  );
  const [eventSearch, setEventSearch] = useState("");
  const [taskSearch, setTaskSearch] = useState("");

  // Global settings
  const [shiftDates, setShiftDates] = useState(true);
  const [resetAssignees, setResetAssignees] = useState(true);
  const [targetStatus, setTargetStatus] = useState<TaskStatus>("To Do");
  const [replaceYears, setReplaceYears] = useState(true);

  // Selected tasks IDs
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  // Edited tasks state for local overrides before import
  const [taskEdits, setTaskEdits] = useState<Record<string, Partial<Task>>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"pick-event" | "review-tasks">("pick-event");

  const sourceEvent = useMemo(() => {
    return candidateEvents.find((e) => e.id === selectedSourceEventId) || candidateEvents[0] || null;
  }, [candidateEvents, selectedSourceEventId]);

  // When source event changes, select all its tasks by default
  const handleSelectSourceEvent = (eventId: string) => {
    setSelectedSourceEventId(eventId);
    const ev = candidateEvents.find((e) => e.id === eventId);
    if (ev && ev.tasks) {
      setSelectedTaskIds(new Set(ev.tasks.map((t) => t.id)));
      setTaskEdits({});
    }
    setActiveTab("review-tasks");
  };

  // Filtered source events list
  const filteredEvents = useMemo(() => {
    if (!eventSearch.trim()) return candidateEvents;
    const q = eventSearch.toLowerCase();
    return candidateEvents.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.committee?.toLowerCase().includes(q) ||
        e.status?.toLowerCase().includes(q)
    );
  }, [candidateEvents, eventSearch]);

  // Active source tasks with edits and filters
  const visibleSourceTasks = useMemo(() => {
    if (!sourceEvent || !sourceEvent.tasks) return [];
    if (!taskSearch.trim()) return sourceEvent.tasks;
    const q = taskSearch.toLowerCase();
    return sourceEvent.tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.committee?.toLowerCase().includes(q)
    );
  }, [sourceEvent, taskSearch]);

  const toggleSelectTask = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!sourceEvent?.tasks) return;
    if (selectedTaskIds.size === sourceEvent.tasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(sourceEvent.tasks.map((t) => t.id)));
    }
  };

  const handleEditTaskField = (taskId: string, field: keyof Task, value: any) => {
    setTaskEdits((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: value
      }
    }));
  };

  const handleImport = async () => {
    if (!sourceEvent || !sourceEvent.tasks || selectedTaskIds.size === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // 1. Filter out only chosen tasks
      const rawChosen = sourceEvent.tasks.filter((t) => selectedTaskIds.has(t.id));

      // 2. Prepare with date shifting & sanitization
      const options: TaskReuseOptions = {
        shiftDates,
        resetAssignees,
        targetStatus,
        replaceYears,
        targetRoster: members
      };

      const prepared = prepareTasksForReuse(rawChosen, sourceEvent, targetEvent, options);

      // 3. Apply any custom in-line user edits made in the modal
      const finalTasks = prepared.map((task, idx) => {
        const origId = rawChosen[idx]?.id;
        const edits = origId ? taskEdits[origId] : null;
        if (edits) {
          return {
            ...task,
            ...edits
          };
        }
        return task;
      });

      // 4. Save in real time
      await onReuseTasks(finalTasks);
      onClose();
    } catch (err) {
      console.error("Error reusing tasks:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const sourceYear = extractYear(sourceEvent?.startDate) || extractYear(sourceEvent?.title);
  const targetYear = extractYear(targetEvent.startDate) || extractYear(targetEvent.title);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-reuse-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="flex flex-col w-full max-w-4xl max-h-[92vh] rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              <RefreshCw size={20} className={isSubmitting ? "animate-spin" : ""} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="task-reuse-title" className="text-base font-bold text-slate-900">
                  Reuse Tasks from Previous Event
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Real-time
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Target: <strong className="text-slate-700">{targetEvent.title}</strong>
                {targetEvent.startDate ? ` (${targetEvent.startDate})` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 bg-white px-6 gap-6 text-xs font-semibold text-slate-500">
          <button
            type="button"
            onClick={() => setActiveTab("pick-event")}
            className={`flex items-center gap-2 py-3 border-b-2 transition ${
              activeTab === "pick-event"
                ? "border-blue-600 text-blue-600"
                : "border-transparent hover:text-slate-800"
            }`}
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
              1
            </span>
            Choose Source Event
            {sourceEvent && (
              <span className="max-w-[120px] truncate rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700 font-medium">
                {sourceEvent.title}
              </span>
            )}
          </button>

          <button
            type="button"
            disabled={!sourceEvent}
            onClick={() => setActiveTab("review-tasks")}
            className={`flex items-center gap-2 py-3 border-b-2 transition ${
              activeTab === "review-tasks"
                ? "border-blue-600 text-blue-600"
                : "border-transparent hover:text-slate-800 disabled:opacity-40"
            }`}
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
              2
            </span>
            Review, Adjust &amp; Import
            {sourceEvent && (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 font-medium">
                {selectedTaskIds.size} of {sourceEvent.tasks?.length || 0} selected
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          {activeTab === "pick-event" ? (
            /* TAB 1: Select Event */
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    placeholder="Search past events by name, committee, status..."
                    className="w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-2xs"
                  />
                </div>
                <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                  {filteredEvents.length} {filteredEvents.length === 1 ? "event" : "events"} found
                </span>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                  <Layers size={32} className="text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No previous events found</p>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    There are no other events with tasks in this organization yet to reuse tasks from.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredEvents.map((ev) => {
                    const isSelected = ev.id === selectedSourceEventId;
                    const theme = getStatusTheme(ev.status, ev.eventCustomStatuses);
                    return (
                      <div
                        key={ev.id}
                        onClick={() => handleSelectSourceEvent(ev.id)}
                        className={`group relative flex flex-col justify-between rounded-2xl border p-4 text-left cursor-pointer transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/30 ring-2 ring-blue-100 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {ev.title}
                            </span>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${theme.badge}`}>
                                {ev.status || "Planning"}
                              </span>
                              {ev.committee && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                  {ev.committee}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 shrink-0">
                            <Layers size={13} className="text-slate-400" />
                            {ev.tasks?.length || 0} tasks
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            <span>{ev.startDate || "Date TBD"}</span>
                          </div>
                          <button
                            type="button"
                            className={`rounded-lg px-2 py-1 text-xs font-bold transition ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "text-blue-600 hover:bg-blue-50"
                            }`}
                          >
                            {isSelected ? "Selected ✓" : "Select & Review →"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: Review & Adjust Tasks */
            <div className="space-y-4">
              {/* Back to Events Bar & Source Info */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("pick-event")}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-xl transition"
                  >
                    <ArrowLeft size={14} /> Change Source Event
                  </button>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-semibold text-slate-700">
                    Sourcing from: <span className="text-blue-600 font-bold">{sourceEvent?.title}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline"
                  >
                    {selectedTaskIds.size === (sourceEvent?.tasks?.length || 0)
                      ? "Deselect All"
                      : "Select All Tasks"}
                  </button>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                    {selectedTaskIds.size} selected
                  </span>
                </div>
              </div>

              {/* Bulk Adjustment Controls Bar */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Sparkles size={14} className="text-blue-500" />
                  Bulk Adjustments for {targetEvent.title}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {/* Shift Dates */}
                  <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={shiftDates}
                      onChange={(e) => setShiftDates(e.target.checked)}
                      className="mt-0.5 size-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800">Auto-shift Deadlines</span>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Adjust dates relative to {targetEvent.title}&apos;s kickoff date.
                      </p>
                    </div>
                  </label>

                  {/* Reset Assignees */}
                  <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={resetAssignees}
                      onChange={(e) => setResetAssignees(e.target.checked)}
                      className="mt-0.5 size-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800">Reset Assignees</span>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Mark as &ldquo;Unassigned&rdquo; to re-delegate to current members.
                      </p>
                    </div>
                  </label>

                  {/* Auto-update Years */}
                  <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={replaceYears}
                      onChange={(e) => setReplaceYears(e.target.checked)}
                      className="mt-0.5 size-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800">Update Year Mentions</span>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Replace &ldquo;{sourceYear || "2024"}&rdquo; with &ldquo;{targetYear || "2025"}&rdquo; in titles.
                      </p>
                    </div>
                  </label>

                  {/* Initial Status */}
                  <div className="rounded-xl border border-slate-200 p-2.5 flex flex-col justify-between">
                    <span className="font-bold text-slate-800 mb-1">Default Status</span>
                    <CustomSelect
                      value={targetStatus}
                      onChange={(val) => setTargetStatus(val as TaskStatus)}
                      options={[
                        { value: "To Do", label: "To Do (Recommended)" },
                        { value: "In Progress", label: "In Progress" },
                        { value: "In Review", label: "In Review" }
                      ]}
                      buttonClassName="h-8 text-xs font-semibold rounded-lg bg-slate-50"
                      portal
                    />
                  </div>
                </div>
              </div>

              {/* Task Filter & Count */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="Search tasks to reuse..."
                    className="w-full rounded-2xl border border-slate-200 bg-white pl-8 pr-4 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-2xs"
                  />
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  Showing {visibleSourceTasks.length} tasks
                </span>
              </div>

              {/* Tasks List with In-line adjustments */}
              <div className="space-y-2">
                {visibleSourceTasks.map((task) => {
                  const isChecked = selectedTaskIds.has(task.id);
                  const edits = taskEdits[task.id] || {};
                  const currentTitle = edits.title ?? (replaceYears ? replaceYearInText(task.title, sourceYear, targetYear) : task.title);
                  const currentPriority = edits.priority ?? task.priority ?? "Medium";
                  const pCfg = PRIORITY_CONFIG[currentPriority as TaskPriority] || PRIORITY_CONFIG.Medium;

                  // Compute preview date
                  const previewDate = shiftDates
                    ? computeShiftedDates(task.startDate, task.dueDate, sourceEvent?.startDate, targetEvent.startDate).dueDate
                    : task.dueDate;

                  return (
                    <div
                      key={task.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all ${
                        isChecked
                          ? "border-blue-200 bg-white shadow-xs"
                          : "border-slate-200/70 bg-slate-50/60 opacity-60 hover:opacity-90"
                      }`}
                    >
                      {/* Checkbox & Title */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectTask(task.id)}
                          className="mt-1 size-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <input
                            type="text"
                            value={currentTitle}
                            disabled={!isChecked}
                            onChange={(e) => handleEditTaskField(task.id, "title", e.target.value)}
                            className="w-full font-semibold text-xs text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none rounded px-1 -ml-1 transition"
                            title="Click to edit task title"
                          />
                          {task.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 px-1">
                              {replaceYears ? replaceYearInText(task.description, sourceYear, targetYear) : task.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Meta chips and adjustments */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 sm:justify-end">
                        {/* Committee */}
                        {task.committee && (
                          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 border border-violet-100">
                            {task.committee}
                          </span>
                        )}

                        {/* Priority Selector */}
                        <CustomSelect
                          value={currentPriority}
                          disabled={!isChecked}
                          onChange={(val) => handleEditTaskField(task.id, "priority", val as TaskPriority)}
                          options={ALL_PRIORITIES.map((p) => ({
                            value: p,
                            label: p,
                            indicatorClass: PRIORITY_CONFIG[p].dot,
                            selectedClass: PRIORITY_CONFIG[p].classes
                          }))}
                          buttonClassName={`h-7 rounded-lg px-2 text-[10px] font-bold ${pCfg.classes}`}
                          portal
                        />

                        {/* Shifted Due Date Badge */}
                        <div
                          className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600"
                          title={`Original: ${task.dueDate || "None"}`}
                        >
                          <Clock size={11} className="text-slate-400" />
                          <span>{previewDate || "No due date"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-white">
          <div className="text-xs text-slate-500">
            {activeTab === "review-tasks" ? (
              <span>
                Ready to import <strong className="text-slate-900 font-bold">{selectedTaskIds.size}</strong> tasks in real-time.
              </span>
            ) : (
              <span>Select an event to review and adjust its tasks.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>

            {activeTab === "pick-event" ? (
              <button
                type="button"
                disabled={!sourceEvent}
                onClick={() => setActiveTab("review-tasks")}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
              >
                <span>Continue to Tasks</span>
                <span>→</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={selectedTaskIds.size === 0 || isSubmitting}
                onClick={handleImport}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Importing in Real-time...</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Import {selectedTaskIds.size} Tasks</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
