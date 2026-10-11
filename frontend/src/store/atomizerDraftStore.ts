"use client";

import { create } from "zustand";
import type { GoalDraft, TaskStatus } from "@/components/events/types";
import type { CustomStatusConfig } from "@/components/events/statusUtils";

export const DEFAULT_ATOMIZER_STATUSES: TaskStatus[] = ["To Do", "In Progress", "In Review", "Completed"];

export type AtomizerDraftState = {
  selectedEventId: string;
  isCreateFromDescription: boolean;
  newEventTitle: string;
  defaultStatus: TaskStatus;
  goalDescription: string;
  isAtomizing: boolean;
  errorMsg: string;
  activeGoalDraft: GoalDraft | null;
  customStatuses: CustomStatusConfig[];
  statusOrder: string[];
  workflowSource: string | null;
};

export const EMPTY_ATOMIZER_DRAFT: AtomizerDraftState = {
  selectedEventId: "",
  isCreateFromDescription: false,
  newEventTitle: "",
  defaultStatus: "To Do",
  goalDescription: "",
  isAtomizing: false,
  errorMsg: "",
  activeGoalDraft: null,
  customStatuses: [],
  statusOrder: DEFAULT_ATOMIZER_STATUSES,
  workflowSource: null
};

type DraftUpdate = Partial<AtomizerDraftState> | ((draft: AtomizerDraftState) => Partial<AtomizerDraftState>);

// Keep drafts outside the tab/page lifecycle. Account and organization IDs isolate each workspace.
export const useAtomizerDraftStore = create<{
  drafts: Record<string, AtomizerDraftState>;
  updateDraft: (scope: string, update: DraftUpdate) => void;
}>((set) => ({
  drafts: {},
  updateDraft: (scope, update) => set((state) => {
    const current = state.drafts[scope] || EMPTY_ATOMIZER_DRAFT;
    const patch = typeof update === "function" ? update(current) : update;
    return { drafts: { ...state.drafts, [scope]: { ...current, ...patch } } };
  })
}));
