import type { Event, Task } from "@/components/events/types";
import { isTaskAssignedToUser } from "./taskAssignment";

export const PROFILE_TASK_CAPACITY = 5;
export type ProfileTaskFilter = "all" | "done" | "active" | "pending" | "cancelled";
export type ProfileTask = Task & { eventId: string; eventTitle: string; customStatuses?: Event["customStatuses"] };

export function getProfileTaskStatus(task: Pick<Task, "status">): Exclude<ProfileTaskFilter, "all"> {
  const status = (task.status || "").trim().toLowerCase();
  if (status === "completed" || status === "done") return "done";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (!status || status === "to do" || status === "pending") return "pending";
  return "active";
}

export function getAssignedProfileTasks(events: Event[], uid: string, fullName: string): ProfileTask[] {
  if (!uid) return [];
  return events.flatMap((event) => event.tasks
    .filter((task) => isTaskAssignedToUser(task, uid, fullName))
    .map((task) => ({ ...task, eventId: event.id, eventTitle: event.title, customStatuses: event.customStatuses })));
}

function validDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalized = value.replace(/\s+at\s+/i, " ");
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(normalized) ? `${normalized}T00:00:00` : normalized);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function getProfileMetrics(tasks: ProfileTask[], now = new Date()) {
  const counts = { done: 0, active: 0, pending: 0, cancelled: 0 };
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const weeks = Array.from({ length: Math.ceil(daysInMonth / 7) }, (_, i) => ({
    label: `Week ${i + 1}`,
    startDay: i * 7 + 1,
    endDay: Math.min((i + 1) * 7, daysInMonth),
    count: 0
  }));
  const matches: number[] = [];
  const ratings: number[] = [];
  let datedCompletions = 0;
  let onTimeCompletions = 0;
  let undatedCompletions = 0;

  for (const task of tasks) {
    const status = getProfileTaskStatus(task);
    counts[status] += 1;
    if (typeof task.matchPercentage === "number" && Number.isFinite(task.matchPercentage)
      && task.matchPercentage >= 0 && task.matchPercentage <= 100) matches.push(task.matchPercentage);
    const review = task.performanceReview;
    if (status === "done" && review && review.reviewerUID && review.reviewedAt
      && Number.isFinite(review.rating) && review.rating >= 1 && review.rating <= 5) ratings.push(review.rating);
    if (status !== "done") continue;
    const completed = validDate(task.completedAt);
    if (!completed) {
      undatedCompletions += 1;
      continue;
    }
    if (completed.getFullYear() === now.getFullYear() && completed.getMonth() === now.getMonth()) {
      weeks[Math.floor((completed.getDate() - 1) / 7)].count += 1;
    }
    const deadlineValue = validDate(task.dueDate) ? task.dueDate : task.deadline;
    const deadline = validDate(deadlineValue);
    if (deadline) {
      // Date-only deadlines include the entire due day; timed deadlines keep their time.
      if (!/[T]|\d{1,2}:\d{2}/.test(deadlineValue || "")) deadline.setHours(23, 59, 59, 999);
      datedCompletions += 1;
      if (completed.getTime() <= deadline.getTime()) onTimeCompletions += 1;
    }
  }

  return {
    counts,
    workload: Math.min(100, Math.round(((counts.active + counts.pending) / PROFILE_TASK_CAPACITY) * 100)),
    reliability: datedCompletions ? Math.round((onTimeCompletions / datedCompletions) * 100) : null,
    reliabilitySampleCount: datedCompletions,
    averageMatch: matches.length ? Math.round(matches.reduce((sum, score) => sum + score, 0) / matches.length) : null,
    rating: ratings.length ? ratings.reduce((sum, score) => sum + score, 0) / ratings.length : null,
    ratingCount: ratings.length,
    weeks,
    undatedCompletions
  };
}
