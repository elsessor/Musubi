import type { Event, Task } from "@/components/events/types";
import { isTaskAssignedToUser } from "./taskAssignment";

export function getMemberDashboardTasks(events: Event[], uid: string | null, name: string) {
  return events.filter((event) => !event.archivedAt && event.status !== "Archived").flatMap((event) =>
    (event.tasks || []).filter((task) => !task.archivedAt && task.status !== "Archived" && isTaskAssignedToUser(task, uid, name))
      .map((task) => ({ ...task, eventTitle: event.title, customStatuses: event.customStatuses }))
  );
}

export function getAverageMatchScore(tasks: Pick<Task, "matchPercentage">[]): number | null {
  const scores = tasks.map((task) => task.matchPercentage).filter((score): score is number =>
    typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 100);
  return scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
}
