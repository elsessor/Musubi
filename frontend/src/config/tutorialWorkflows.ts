import type { UserRole } from "../types/auth";
import type { TourStep } from "./tutorial";
import { TUTORIAL_ACTIONS } from "./tutorialActions";
import { getViewTourSteps } from "./tutorialViews";
import { getCalendarConnectionSteps } from "./tutorialCalendar";

export const WORKFLOW_IDS = ["event-create", "event-browse", "task-create", "task-progress", "ai-delegation", "ai-review", "committees", "membership", "announcements", "request-review", "organization-manage", "user-manage", "audit-filters", "notifications", "preferences", "google-calendar"] as const;
export type WorkflowId = typeof WORKFLOW_IDS[number];
export type WorkflowTour = { id: WorkflowId; title: string; description: string; roles: UserRole[]; route: string; steps: TourStep[] };

const E = "/dashboard/events", O = "/dashboard/organization";
const all: UserRole[] = ["Admin", "Student Leader", "Organization Member"];
const campus: UserRole[] = ["Student Leader", "Organization Member"];
const leader: UserRole[] = ["Student Leader"];
const admin: UserRole[] = ["Admin"];
const s = (target: string, title: string, description: string, open?: "click"): Omit<TourStep, "route"> => ({ id: target, target, title,
  description, openOnNext: open ? target : undefined });
const flow = (id: WorkflowId, title: string, description: string, roles: UserRole[], route: string, instructions: Omit<TourStep, "route">[]): WorkflowTour => {
  let openers: string[] = [];
  const steps = instructions.map((step, index) => {
    const result = { ...step, route, reveal: [...openers],
      ...(index === 0 && route === E && !id.startsWith("ai-") ? { prepare: "events" as const } : {}) };
    if (step.openOnNext) {
      const closing = openers.findIndex((opener) => TUTORIAL_ACTIONS[opener]?.close === step.openOnNext);
      if (closing >= 0) openers = openers.slice(0, closing);
      else openers.push(step.openOnNext);
    }
    return result;
  });
  return { id, title, description, roles, route, steps };
};
const event = s("event-card", "Open an event", "Open an event to review its tasks and progress. If no events are available, continue reading the guide.", "click");
const task = s("task-card", "Open task details", "Open a task to review its instructions, schedule, and progress. Members can update only tasks assigned to them.", "click");

export const WORKFLOW_TOURS: WorkflowTour[] = [
  flow("event-create", "Create an event", "Enter event details, set a schedule, and review the information before creating the event.", leader, E, [
    s("create-event", "New Event", "Select Next to open the event form. Review the required information before creating an event.", "click"),
    s("event-title", "Event name", "Enter a descriptive event name. This required field identifies the event throughout the workspace."),
    s("event-description", "Description", "Describe the event's purpose, scope, and expected outcome so members understand the work involved."),
    s("event-committee", "Lead committee", "Select the committee responsible for the event. Use the cross-committee option when responsibilities are shared."),
    s("event-reuse", "Reuse an event's tasks", "Select a previous event to reuse its tasks. Review the copied schedules and assignments before creating the event."),
    s("event-start", "Start date and time", "Set the event's start date and time. Ensure the start precedes the end of the event."),
    s("event-end", "End date and time", "Set the event's end date and time. Resolve any schedule errors before creating the event."),
    s("event-submit", "Create Event", "Create Event saves the event and any reused tasks. Review the form and close the guide before submitting."),
    s("event-cancel", "Cancel without creating", "Close the form without creating an event. You can reopen it when you are ready to continue.", "click")
  ]),
  flow("event-browse", "Browse, filter, and monitor events", "Locate events using filters and views, then review their tasks and progress.", campus, E, [
    s("events-tab", "Events & Tasks", "Select Next to display the event list and its available controls.", "click"),
    s("event-filter-panel", "Filters on small screens", "On small screens, Filters displays committee and status options. These controls appear directly on larger screens.", "click"),
    s("event-committee-filter", "Committee filter", "Select a committee to view its events. All Committees displays every event available to your account."),
    s("event-status-filter", "Status filters", "Filter events by status and review the matching counts. Select All for active records or Archived for archived events."),
    s("event-view", "View controls", "Choose a grid, table, expanded list, Kanban board, or calendar to review the same events in different layouts."),
    s("event-custom-status", "Custom Status: an extra progress label", "Add an optional progress label, such as Waiting for Approval, when your team needs an extra stage. Choose its name, meaning, color, and position. Adding a label does not change progress. The page introduction shows the dialog without saving changes."),
    s("event-filter-done", "Close filters", "Select Done to close the mobile filters and return to the event list.", "click"),
    ...getViewTourSteps("events", E), event
  ]),
  flow("task-create", "Create a task", "Define the work, select an assignee, and review prerequisites and dates before saving.", leader, E, [event,
    s("add-task", "Add Task", "Select Next to open the task form within the selected event.", "click"),
    s("new-task-title", "Task title", "Enter a clear, action-oriented title that identifies the work to be completed."),
    s("new-task-description", "Task instructions", "Specify the task requirements, instructions, and expected deliverable."),
    s("new-task-dependencies", "Prerequisites", "Select tasks that must be completed first. Unfinished prerequisites prevent dependent work from progressing."),
    s("new-task-status", "Initial status", "Select the task's initial status from the event's available workflow stages."),
    s("new-task-priority", "Priority", "Select a priority level to indicate the task's urgency."),
    s("new-task-assignee", "Assignee", "Select a responsible member or leave the task unassigned. Consider availability and workload. The task inherits its event's committee."),
    s("new-task-start", "Start schedule", "Set an optional start date and time to indicate when work should begin."),
    s("new-task-due", "Deadline", "Set an optional deadline later than the start time. Resolve any schedule errors before saving."),
    s("new-task-submit", "Save the task", "Save creates the task with the selected details and assignment. Review the form and close the guide before saving."),
    s("new-task-cancel", "Cancel", "Close the form without creating a task.", "click")
  ]),
  flow("task-progress", "Inspect and update task progress", "Review task requirements, report progress, and provide supporting attachments.", campus, E, [event, task,
    s("task-title", "Task title and instructions", "Review the task's title and instructions before starting. Only authorized users can edit the task plan."),
    s("task-status", "Task status", "Update the status to report progress on your assigned work. Unfinished prerequisites may restrict the available status changes."),
    s("task-priority", "Priority", "Review the task's urgency. Leaders can adjust priority; members can use a priority request where available."),
    s("task-assignee", "Assigned member", "View the responsible member. Leaders can reassign tasks; members may claim eligible unassigned tasks after confirmation."),
    s("task-attachments", "Work attachments", "Review supporting files and links, or attach evidence to your assigned work. The guide does not upload files."),
    s("task-submit", "Save changes / Update status", "Save applies your permitted changes. Review the task and close the guide before saving. Read-only tasks cannot be submitted."),
    s("task-close", "Close the task panel", "Close the task panel without submitting changes.", "click")
  ]),
  flow("ai-delegation", "Use AI Task Atomizer", "Describe an event and its resources to generate a proposed task plan.", leader, E, [
    s("ai-tab", "AI Task Atomizer tab", "Select Next to open AI Task Atomizer. The guide explains planning and review without generating a draft.", "click"),
    s("ai-target", "Target event", "Select an event to receive the proposed tasks, or use Create from Description to plan a new event."),
    s("ai-create-description", "Existing event or new description", "Choose whether to plan for an existing event or describe a new event. This selection does not publish tasks."),
    s("ai-status", "Default task status", "Select the initial status for generated tasks. Use Manage to configure the draft's workflow stages."),
    s("ai-date", "Event date", "Enter the event date so suggested task deadlines align with its schedule."),
    s("ai-members", "Participating members", "Enter the number of participating members. The available roster and member availability determine planning capacity."),
    s("ai-description", "Goal and context", "Describe the goal, requirements, and constraints. Clear context helps the system propose relevant tasks."),
    s("ai-generate", "Generate a proposed plan", "Generate a draft task plan for review. Close the guide before starting generation; proposed tasks require review before publication.")
  ]),
  flow("ai-review", "Review AI suggestions and assignments", "Review generated tasks, member recommendations, and warnings before publishing.", leader, E, [
    s("ai-tab", "Open the AI planning workspace", "Select Next to open AI Task Atomizer. The guide explains planning and review without generating a draft.", "click"),
    s("ai-auto-assign", "Auto-assign recommendations", "Auto-assign suggests members based on their suitability and current workload. Review the proposed assignments before applying the plan."),
    s("ai-edit-task", "Edit a generated subtask", "Open an existing draft task to review its details, suggested assignee, and recommendation.", "click"),
    s("ai-match", "Recommended member match", "Compare the recommendation with the task requirements. You can select a different member when appropriate."),
    s("ai-review-assignee", "Review the assignee", "Select a suitable member after reviewing relevant skills, availability, and current workload."),
    s("ai-review-cancel", "Return to the draft", "Close the task editor and return to the draft without applying changes.", "click"),
    s("ai-warnings", "Warnings and safeguards", "Review missing information and assignment warnings. Auto-fix updates the draft, so check each proposed correction."),
    s("ai-publish", "Publish reviewed tasks", "Publish adds the reviewed plan to your organization's work. Verify task details and assignments, then close the guide before publishing.")
  ]),
  flow("committees", "Create and manage committees", "Define a committee's purpose and select its leadership and members.", leader, O, [
    s("committees-tab", "Committees tab", "Select Next to view the organization's committees and responsibilities.", "click"),
    s("committee-create", "New Committee", "Select Next to open the committee creation form.", "click"),
    s("committee-name", "Committee name", "Enter a name that clearly identifies the committee's responsibility."),
    s("committee-description", "Purpose", "Describe the committee's purpose and the work it will handle."),
    s("committee-head", "Committee head", "Optionally select an organization member to lead the committee."),
    s("committee-search", "Find committee members", "Search the organization roster and select the members who will join the committee."),
    s("committee-submit", "Create committee", "Create Committee saves the committee and its membership. Review the selections and close the guide before confirming."),
    s("committee-cancel", "Cancel creation", "Close the form without creating a committee.", "click")
  ]),
  flow("membership", "Members and join requests", "Find member profiles and review the membership actions available to your role.", campus, O, [
    s("members-tab", "Members tab", "Select Next to view the organization member list.", "click"),
    s("member-search", "Search members", "Search the member list using the available profile details. Clear the search to display the full list."),
    s("member-profile", "View Profile", "Open a member's profile to review the personal and performance information available to your role."),
    s("join-requests", "Pending requests", "Leaders can review membership applications here. Accepting or rejecting a request updates the applicant's membership status."),
    s("member-remove", "Remove a member", "Review the confirmation before removing a member's organization access. This control cannot remove your own account.")
  ]),
  flow("announcements", "Read and post announcements", "Read organization updates or prepare a message for a selected audience.", campus, O, [
    s("announcements-tab", "Announcements tab", "Select Next to view organization announcements.", "click"),
    s("announcement-feed", "Read organization updates", "Read updates available to your role and committee. Open an announcement to view its complete message."),
    s("announcement-create", "Post Announcement", "Leaders can use Post Announcement to open the message form. Posting permissions remain restricted to authorized accounts.", "click"),
    s("announcement-title", "Title", "Enter a concise title that identifies the announcement's subject."),
    s("announcement-content", "Message", "Provide the information, instructions, or updates the selected audience needs."),
    s("announcement-audience", "Target audience", "Select all members, leaders, or a specific committee. Verify the intended audience before posting."),
    s("announcement-pin", "Pin announcement", "Pin the announcement to keep it at the top of the feed."),
    s("announcement-submit", "Post to the organization", "Post publishes the message to the selected audience. Review the content and close the guide before posting."),
    s("announcement-cancel", "Cancel posting", "Close the form without posting an announcement.", "click")
  ]),
  flow("request-review", "Review organization requests", "Review organization applications and understand approval and rejection requirements.", admin, "/admin/org-requests", [
    s("request-card", "Read a pending request", "Review the organization name, type, purpose, requester, and submission details. You can continue the guide when no requests are pending."),
    s("request-approve", "Approve", "Approve accepts the request immediately. Review the submission and close the guide before approving."),
    s("request-reject", "Open rejection form", "Select Next to open the rejection form. The request remains pending until rejection is confirmed.", "click"),
    s("request-reason", "Rejection reason", "Enter the required rejection reason so the requester understands the decision."),
    s("request-confirm", "Confirm Rejection", "Confirm Rejection submits the decision and reason. Review both and close the guide before confirming."),
    s("request-cancel", "Cancel the review", "Close the rejection form without changing the request's status.", "click")
  ]),
  flow("organization-manage", "Manage organizations", "Search the directory, register organizations, and review their details.", admin, "/admin/organizations", [
    s("admin-org-search", "Search organizations", "Search by organization name or type to locate an entry in the directory."),
    s("admin-org-add", "Add Organization", "Select Next to open the organization registration form.", "click"),
    s("admin-org-name", "Organization name", "Enter the organization's official name."),
    s("admin-org-type", "Organization type", "Select the category that best describes the organization."),
    s("admin-org-description", "Organization description", "Describe the organization's purpose and primary activities."),
    s("admin-org-submit", "Create the organization", "Create saves the organization in the directory. Review the details and close the guide before submitting."),
    s("admin-org-cancel", "Cancel", "Close the form without registering an organization.", "click"),
    s("admin-org-card", "Organization details", "Open an organization to review its details and membership. Select an entry after closing the guide.")
  ]),
  flow("user-manage", "Filter and manage accounts", "Find accounts and review role, position, and access settings.", admin, "/admin/members", [
    s("admin-member-search", "Find an account", "Search accounts by member name, email address, or position."),
    s("admin-member-role-filter", "Role filter", "Filter accounts by role. Select All Roles to remove this filter."),
    s("admin-member-org-filter", "Organization filter", "Select an organization to view its associated accounts."),
    s("admin-member-status-filter", "Account status", "Filter accounts by active, pending join request, onboarding, or inactive status."),
    s("admin-member-edit", "Edit account details", "Select Next to open the account's role and position settings. Changes are applied only when saved.", "click"),
    s("admin-member-edit-role", "Role", "Select the account's role. Review the intended permissions before saving this access change."),
    s("admin-member-edit-position", "Position", "Enter the member's position within the organization, where applicable."),
    s("admin-member-edit-save", "Save account changes", "Save updates the account's role or position. Review the changes and close the guide before saving."),
    s("admin-member-edit-cancel", "Cancel editing", "Close the account editor without saving changes.", "click")
  ]),
  flow("audit-filters", "Search and filter audit logs", "Locate activity records using search, category, and date filters.", ["Admin", "Student Leader"], "/dashboard/audit-logs", [
    s("audit-search", "Search audit activity", "Search activity by the person involved, action description, or affected item."),
    s("audit-category", "Category filter", "Select an activity category to narrow the results. Choose all categories to remove this filter."),
    s("audit-date", "Date range", "Select a date range and combine it with search or category filters to locate relevant activity."),
    s("audit-record", "Inspect an audit record", "Open an activity record to review who performed the action and what changed."),
    s("audit-pagination", "More records", "Use the page controls to review additional activity records.")
  ]),
  flow("notifications", "Notifications and reminders", "Review updates, task reminders, and performance notifications.", campus, "/dashboard/notifications", [
    s("notifications-all", "All notifications", "Select Next to view all notifications available to your account.", "click"),
    s("notifications-announcements", "Announcement notifications", "View notifications about organization announcements."),
    s("notifications-nudges", "Nudges", "View task reminders and requests for progress updates."),
    s("notifications-ratings", "Ratings", "Review notifications about recorded performance ratings."),
    s("notifications-read-all", "Mark all as read", "Mark all as read clears the unread status of your notifications. Review the updates and close the guide before using it.")
  ]),
  flow("google-calendar", "Google Calendar integration", "Connect your Google account, sync campus events and tasks, review calendar entries, and manage or reconnect the integration.", all, "/dashboard/settings", getCalendarConnectionSteps("/dashboard/settings")),
  flow("preferences", "Settings and account preferences", "Review profile information, account preferences, and calendar connections.", all, "/dashboard/settings", [
    s("settings-profile", "Profile settings", "Review your name, role, position, and profile information. Update only the fields available for editing."),
    s("settings-calendar", "Calendar connection", "Connect your calendar through the authorization screen. Review permissions before connecting, syncing, or disconnecting."),
    s("settings-save", "Save settings", "Save applies your profile or preference changes. Review the information and close the guide before saving.")
  ])
];

export function getWorkflowTours(role: UserRole): WorkflowTour[] {
  return WORKFLOW_TOURS.filter((tour) => tour.roles.includes(role)).map((tour) => role === "Admin" && tour.route.startsWith("/dashboard/")
    ? { ...tour, route: tour.route.replace("/dashboard/", "/admin/"), steps: tour.steps.map((step) => ({ ...step, route: step.route.replace("/dashboard/", "/admin/") })) }
    : role === "Organization Member" && tour.id === "announcements" ? { ...tour, steps: tour.steps.slice(0, 2) }
    : role === "Organization Member" && tour.id === "membership" ? { ...tour, steps: tour.steps.slice(0, 3) }
    : role === "Organization Member" && tour.id === "event-browse" ? { ...tour, steps: tour.steps.filter((step) => step.target !== "event-custom-status") } : tour);
}

const sectionSummaries: Record<string, [string, string]> = {
  "event-title": ["Describe and schedule the event", "Enter the event name, purpose, committee, and schedule. Optionally reuse previous tasks. Review all details before creating the event."],
  "event-committee-filter": ["Find and monitor events", "Use committee and status filters to locate events, then select a suitable view. Leaders can also configure event statuses."],
  "new-task-title": ["Plan the task", "Define the work, assignee, priority, prerequisites, and optional schedule. The task inherits its event's committee. Review the information before saving."],
  "task-title": ["Review and update your work", "Review instructions, responsibility, priority, and prerequisites. Update your permitted status and supporting attachments, then review the changes before saving."],
  "ai-target": ["Describe the plan you need", "Select an event or describe a new one. Specify the date, member count, initial status, and goal before generating a draft."],
  "ai-match": ["Check the suggested assignment", "Review the recommendation against task requirements, member skills, availability, and workload before selecting an assignee."],
  "ai-warnings": ["Review before publishing", "Resolve missing information and assignment warnings. Review the complete draft before publishing tasks to the organization."],
  "committee-name": ["Set up the team", "Enter the committee's name and purpose, then select its head and members. Review the team before creating the committee."],
  "member-search": ["Find people and review membership", "Search member profiles and review available details. Leaders can also assess join requests and manage membership."],
  "announcement-title": ["Write and target your update", "Enter the title and message, select the audience, and optionally pin the announcement. Review the content before posting."],
  "request-card": ["Review the request", "Review the organization and requester before deciding. Approve accepts the request immediately."],
  "request-reason": ["Explain your decision", "Provide a clear rejection reason and review the decision before confirming."],
  "admin-org-name": ["Add organization details", "Enter the official organization name, category, and purpose. Review the information before registration."],
  "admin-member-search": ["Find the right account", "Search by name, email address, or position. Combine role, organization, and status filters to locate an account."],
  "admin-member-edit-role": ["Review account access", "Review the account's role and position before saving. Role changes affect the member's system permissions."],
  "audit-search": ["Find an activity record", "Use search, category, and date filters to locate activity. Open a record for details or use pagination for additional results."],
  "notifications-announcements": ["Read updates and reminders", "Review announcements, task reminders, and rating notifications. Mark updates as read after reviewing them."],
  "settings-profile": ["Manage your preferences", "Review profile information, preferences, and calendar permissions. Verify changes before saving or connecting your calendar."]
};

// Keep safe opening/closing controls in order; explain related fields together.
// The original instructions remain available as an optional field reference.
export function compactWorkflowSteps(steps: TourStep[]): TourStep[] {
  const result: TourStep[] = [];
  for (let index = 0; index < steps.length;) {
    const first = steps[index];
    if (first.openOnNext || first.interaction) {
      result.push(first); index++; continue;
    }
    let end = index + 1;
    while (end < steps.length && !steps[end].openOnNext && !steps[end].interaction) end++;
    const group = steps.slice(index, end);
    const summary = sectionSummaries[first.target];
    if (group.length > 1 && summary) {
      const memberOnly = first.target === "member-search" && !group.some((step) => step.target === "join-requests");
      result.push({ ...first, title: summary[0],
        description: memberOnly ? "Search the member list and open a profile to review the personal and performance information available to your role." : summary[1],
        highlightTargets: group.map((step) => step.target),
        details: group.map(({ title, description }) => ({ title, description })) });
    } else result.push(...group);
    index = end;
  }
  return result;
}
