import { AppError } from "./AppError.js";
import { recordTaskSchedules } from "./taskSchedule.js";

type TaskRecord = Record<string, any>;
type ReviewActor = { uid: string; fullName: string; isLeader: boolean };

function isDone(task?: TaskRecord): boolean {
  return ["completed", "done"].includes(String(task?.status || "").trim().toLowerCase());
}

// Completion timestamps and review attribution are recorded by the server.
// Existing completed tasks without dates stay undated instead of inventing history.
export function recordTaskPerformance(
  tasks: TaskRecord[], originals: TaskRecord[], actor: ReviewActor, now = new Date().toISOString()
): TaskRecord[] {
  const byId = new Map(originals.map((task) => [task.id, task]));
  return recordTaskSchedules(tasks, originals, actor, now).map((task) => {
    const original = byId.get(task.id);
    const updated = { ...task };
    const review = String(task.status || "").trim().toLowerCase() === "in review";
    const wasReview = String(original?.status || "").trim().toLowerCase() === "in review";
    const cancelled = ["cancelled", "canceled"].includes(String(task.status || "").trim().toLowerCase());
    const newSubmission = review && !wasReview && !isDone(original);
    const retainsSubmission = review || isDone(task) || cancelled;
    updated.submittedAt = newSubmission ? now : retainsSubmission ? original?.submittedAt || null : null;
    updated.submittedDueDate = updated.submittedAt
      ? newSubmission ? task.dueDate || task.deadline || "" : original?.submittedDueDate ?? original?.dueDate ?? original?.deadline ?? ""
      : null;
    updated.completedDueDate = isDone(task)
      ? isDone(original) ? original?.completedDueDate ?? original?.dueDate ?? original?.deadline ?? "" : task.dueDate || task.deadline || ""
      : null;
    if (cancelled && isDone(original)) throw new AppError("Completed tasks cannot be cancelled. Archive them to preserve their history.", 409);
    updated.completedAt = isDone(task)
      ? isDone(original) ? original?.completedAt || null : now
      : null;
    const assignmentChanged = original && (
      (original.assignedMemberUID || "") !== (task.assignedMemberUID || "") ||
      (original.assignedMemberName || original.assignee?.name || "") !== (task.assignedMemberName || task.assignee?.name || "")
    );
    const oldReview = assignmentChanged ? null : original?.performanceReview || null;
    updated.performanceReview = isDone(task) ? oldReview : null;
    if (!actor.isLeader || !isDone(task)) return updated;
    const requested = task.performanceReview;
    if (!requested) return updated;
    // Preserve existing reviews when an unrelated event/task field is saved.
    if (oldReview && requested.rating === oldReview.rating && (requested.feedback || "") === (oldReview.feedback || "")) return updated;
    if (!Number.isInteger(requested.rating) || requested.rating < 1 || requested.rating > 5) {
      throw new AppError("Performance ratings must be between 1 and 5 stars.", 400);
    }
    const assigneeName = String(task.assignedMemberName || task.assignee?.name || "").trim().toLowerCase();
    if (task.assignedMemberUID === actor.uid || (!task.assignedMemberUID && assigneeName === actor.fullName.trim().toLowerCase())) {
      throw new AppError("You cannot rate your own task performance.", 403);
    }
    if (!task.assignedMemberUID && !assigneeName) {
      throw new AppError("Assign this task to a member before rating their performance.", 400);
    }
    // A stale review must never transfer to a newly assigned member.
    if (assignmentChanged && requested.rating === original?.performanceReview?.rating) return updated;
    updated.performanceReview = { rating: requested.rating, feedback: requested.feedback || "", reviewerUID: actor.uid, reviewedAt: now };
    return updated;
  });
}
