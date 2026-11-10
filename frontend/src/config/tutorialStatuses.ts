import type { TourStep } from "./tutorial";

export function getCustomStatusStep(scope: "events" | "tasks", leader: boolean): TourStep {
  const prefix = scope === "events" ? "event" : "task";
  const target = leader ? "custom-status-dialog" : `${prefix}-status-filter`;
  return {
    id: `${prefix}-custom-status-guide`, title: "Custom Status: an extra progress label", route: "/dashboard/events", target,
    ...(leader ? { selector: `[data-tour="custom-status-dialog"][data-status-type="${prefix}"]`, reveal: [`${prefix}-filter-panel`, `${prefix}-custom-status`], closeOnLeave: "custom-status-close" } : {}),
    highlightTargets: leader ? [target] : [target, `${prefix}-filter-panel`],
    description: leader
      ? `This dialog adds an optional progress label, such as Waiting for Approval, to ${scope === "events" ? "your organization's events" : "tasks in this event"}. Review the name, meaning, color, and position fields. Adding a label does not change anyone's progress. Use Next to continue without saving.`
      : "Statuses describe where work stands. Your leader may add a label, such as Waiting for Approval, when your team needs an extra stage. Use the status filters to find work at that stage. A new label does not automatically change your progress.",
    ...(leader ? { details: [
      { title: "Name and meaning", description: "Use a short, unique name and an optional description so everyone understands when to use the label. For example, Waiting for Approval means the work needs a decision before it can continue." },
      { title: "Color", description: "Choose a color to help distinguish the label. Color does not change priority, deadlines, or progress." },
      { title: "Insert after", description: "Choose where the label appears in the status list and Kanban columns. This only sets its position; it does not move events or tasks to that stage." },
      { title: "Add and use the label", description: "Add Status applies the new label immediately. Select it from an event or task's status control when appropriate. Adding a label does not mark work as completed." },
      { title: "Reorder or delete", description: "Use the up and down arrows or drag a row to reorder labels. Only custom labels can be deleted; review the confirmation first. Adding, reordering, and deleting apply immediately. Save and Cancel close the window without undoing those changes." }
    ] } : {})
  };
}
