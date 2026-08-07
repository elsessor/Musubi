"use client";

import { BookOpen, Plus, SlidersHorizontal, Sparkles, Zap } from "lucide-react";
import { useState } from "react";

import type { GoalDraft, GoalPriority } from "@/types/goal";
import { Button } from "@/components/ui/Button";

interface GoalCreationFormProps {
  initialValues?: Partial<GoalDraft>;
  onSubmit: (goal: GoalDraft) => void;
  isLoading?: boolean;
}

const DEMO_EVENTS = [
  { id: "evt-1", title: "Campus Culture Week 2026" },
  { id: "evt-2", title: "Annual Tech & Innovation Summit" },
  { id: "evt-3", title: "Mid-Year Student Council Gala" },
  { id: "evt-4", title: "Community Outreach Workshop" }
];

export function GoalCreationForm({ initialValues, onSubmit, isLoading }: GoalCreationFormProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [createFromDescriptionMode, setCreateFromDescriptionMode] = useState(false);
  const [customEventTitle, setCustomEventTitle] = useState("");
  const [defaultStatus, setDefaultStatus] = useState("To Do");
  const [goalDescription, setGoalDescription] = useState(initialValues?.description ?? "");
  const [errors, setErrors] = useState<{ event?: string; description?: string }>({});

  const handleAtomizeSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { event?: string; description?: string } = {};

    let targetTitle = "";
    if (createFromDescriptionMode) {
      targetTitle = customEventTitle.trim() || "New Event Goal";
    } else if (selectedEventId) {
      targetTitle = DEMO_EVENTS.find((ev) => ev.id === selectedEventId)?.title || "Selected Event";
    } else {
      newErrors.event = "Please select an event or specify a target title.";
    }

    if (!goalDescription.trim()) {
      newErrors.description = "Please enter a goal description for AI task atomization.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      title: targetTitle,
      description: goalDescription.trim(),
      targetDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      priority: "High" as GoalPriority,
      committeeScope: "Org-Wide"
    });
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm space-y-6">
      {/* Card Header */}
      <div className="flex items-start gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Zap className="size-7" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">AI Task Atomizer</h2>
            <span className="rounded-full bg-blue-100/80 px-3 py-0.5 text-xs font-semibold text-blue-600">
              AI Powered
            </span>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed max-w-3xl">
            Describe an event or task goal and the AI will break it into specific, actionable tasks with suggested assignees, deadlines, and priorities.
          </p>
        </div>
      </div>

      <form onSubmit={handleAtomizeSubmit} className="space-y-6">
        {/* Row 1: Target Event & Default Task Status */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Target Event Column */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="target-event" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                TARGET EVENT <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setCreateFromDescriptionMode(!createFromDescriptionMode)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
              >
                + {createFromDescriptionMode ? "Select Existing Event" : "Create from Description"}
              </button>
            </div>

            {createFromDescriptionMode ? (
              <input
                type="text"
                value={customEventTitle}
                onChange={(e) => {
                  setCustomEventTitle(e.target.value);
                  if (errors.event) setErrors((prev) => ({ ...prev, event: undefined }));
                }}
                placeholder="Enter new event or goal title..."
                className="w-full rounded-2xl border-none bg-[#f0f4f9] px-5 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
            ) : (
              <select
                id="target-event"
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  if (errors.event) setErrors((prev) => ({ ...prev, event: undefined }));
                }}
                className="w-full rounded-2xl border-none bg-[#f0f4f9] px-5 py-3.5 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              >
                <option value="">— Select an event —</option>
                {DEMO_EVENTS.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            )}
            {errors.event && <p className="text-xs text-rose-600 font-medium">{errors.event}</p>}
          </div>

          {/* Default Task Status Column */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="default-status" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                DEFAULT TASK STATUS
              </label>
              <button
                type="button"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
              >
                <SlidersHorizontal className="size-3.5" />
                Manage
              </button>
            </div>

            <select
              id="default-status"
              value={defaultStatus}
              onChange={(e) => setDefaultStatus(e.target.value)}
              className="w-full rounded-2xl border-none bg-[#f0f4f9] px-5 py-3.5 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            >
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Backlog">Backlog</option>
              <option value="Pending Review">Pending Review</option>
            </select>
          </div>
        </div>

        {/* Row 2: Goal Description */}
        <div className="space-y-2">
          <label htmlFor="goal-description" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
            GOAL DESCRIPTION
          </label>
          <textarea
            id="goal-description"
            rows={4}
            value={goalDescription}
            onChange={(e) => {
              setGoalDescription(e.target.value);
              if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
            }}
            placeholder='e.g. "Organize a campus-wide culture week celebration across all departments"'
            className="w-full rounded-2xl border-none bg-[#f0f4f9] p-5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
          {errors.description && <p className="text-xs text-rose-600 font-medium">{errors.description}</p>}
        </div>

        {/* Bottom Action Button */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={isLoading}
            className="h-12 px-7 rounded-2xl bg-[#93b4ff] hover:bg-blue-600 text-white font-bold text-base shadow-sm transition flex items-center gap-2"
          >
            <Zap className="size-5" />
            Atomize
          </Button>
        </div>
      </form>
    </div>
  );
}
