import type { TourStep } from "./tutorial";

export const TOUR_VIEW_MODES = ["grid", "table", "expanded", "kanban", "calendar"] as const;
export type TourViewMode = typeof TOUR_VIEW_MODES[number];
export type TourViewScope = "events" | "tasks";
export type TourViewDemo = { scope: TourViewScope; mode: TourViewMode };

const descriptions = {
  events: [
    ["Grid view", "Event cards bring the purpose, status, schedule, and progress together. Open a card when you are ready to review its tasks."],
    ["Table view", "Compare events in rows using committee, status, progress, dates, and member columns. On small screens, scroll the table sideways to see more columns."],
    ["Expanded view", "Read event descriptions and schedule details in a vertical list. This layout gives each event more space than the grid."],
    ["Kanban view", "Events are grouped by status so you can review each stage of work. On small screens, use the status selector to choose a column."],
    ["Calendar view", "Review scheduled events by date. Connect Google Calendar in Settings to include your Google entries. In the calendar's view menu, Show Google Calendar controls their visibility. Open a Google entry for details and a link to Google Calendar."]
  ],
  tasks: [
    ["Grid view", "Task cards show instructions, status, priority, assignment, and deadline together. Prerequisite indicators help identify blocked work."],
    ["Table view", "Compare task details in rows and columns. This layout helps you review assignments and deadlines across several tasks."],
    ["Expandable list view", "Review tasks in a vertical list and expand an item for more detail. This layout keeps related information together while reducing clutter."],
    ["Kanban view", "Tasks are grouped into workflow stages such as To Do, In Progress, In Review, and Completed. Review the columns to understand progress and bottlenecks."],
    ["Calendar view", "Review tasks by their scheduled dates and deadlines. Use the calendar controls to change the displayed period. Tasks without dates remain available in the other views."]
  ]
} as const;

export function getViewTourSteps(scope: TourViewScope, route: string): TourStep[] {
  const content = scope === "events" ? "event-view-content" : "event-task-workspace";
  const control = scope === "events" ? "event-view" : "task-view";
  return TOUR_VIEW_MODES.map((mode, index) => ({
    id: `${scope}-view-${mode}`, title: descriptions[scope][index][0], description: descriptions[scope][index][1], route,
    target: content, highlightTargets: [control, content], demoView: { scope, mode }
  }));
}
