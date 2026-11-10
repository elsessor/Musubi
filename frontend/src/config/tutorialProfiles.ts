import type { TourStep } from "./tutorial";
import { PROFILE_TASK_CAPACITY } from "../utils/profileMetrics";

export function getProfileTourSteps(route: string, visiting = false, showPerformance = true): TourStep[] {
  const step = (id: string, title: string, description: string, target: string): TourStep => ({ id, title, description, target, route });
  return [
    step("profile-overview", visiting ? "Member profile and availability" : "Your profile and availability", visiting
      ? "Review this member's name, organization, role, and availability. This is a view of their profile; it does not let you edit their account. The cards below depend on your access."
      : "Review your name, organization, role, and availability. Use Edit Profile to update permitted personal details and skills. The cards below summarize your recorded assignments and progress.", "profile-page"),
    ...(showPerformance ? [
      { ...step("profile-statistics", "Understand the summary scores", "These cards show workload, on-time delivery, assignment match, and completed task count. They measure different things. A dash means there is not enough recorded information; it is not a zero score.", "profile-statistics"), details: [
        { title: "Workload score", description: `Unfinished active and pending tasks are compared with a ${PROFILE_TASK_CAPACITY}-task capacity, capped at 100%. For example, two unfinished tasks give 40%. This measures the number of tasks, not hours worked.` },
        { title: "Reliability score", description: "The percentage of completed tasks delivered on time, using recorded delivery times and deadlines. When a submission time is recorded, later review delays do not make that submission late. Tasks without the required dates are excluded." },
        { title: "Avg match %", description: "The average of saved assignment match scores. It describes how well assignments matched the member when assigned. It is separate from the leader's performance rating and the task completion count." },
        { title: "Tasks done", description: "The number of assigned tasks marked Completed or Done. This count includes recorded completion history; the chart below focuses on the current month." }
      ] },
      step("profile-rating", "Performance rating and average score", "The score out of 5 is the average of recorded leader reviews on completed tasks. The rating count shows how many reviews contribute. Top Performer appears from 4.5 upward. No ratings means no eligible reviews are recorded yet.", "profile-rating")
    ] : []),
    step("profile-details", visiting ? "Member details" : "Personal account details", visiting
      ? "Review the member's role, organization, and committee. Private personal details are not shown here. Performance cards are shown only when your role permits access."
      : "Review your saved account details, including contact and academic information. Not set means a value has not been provided. Use Edit Profile to update fields available to your account.", "profile-details"),
    step("profile-skills", "Skills support task planning", visiting
      ? "These keywords describe the member's listed capabilities. Use them alongside availability and current assignments when discussing responsibilities."
      : "Keep skill keywords current so leaders can identify suitable assignments. Skills describe capabilities; they are separate from ratings and completed task counts.", "profile-skills"),
    ...(showPerformance ? [step("profile-completion", "Sub-task completion this month", "Each bar counts tasks with a recorded completion date in this month, grouped into seven-day periods. Completed tasks without a valid completion date are excluded from the chart. Empty bars mean no recorded completions in that period, not a performance rating.", "profile-completion")] : []),
    step("profile-tasks", "Assigned sub-tasks and completion", "Review each sub-task and its event, status, and permitted score details. Use All, done, active, and pending to filter the list; cancelled and archived appear when relevant. Pagination shows additional tasks. These controls only change the displayed list.", "profile-tasks")
  ];
}
