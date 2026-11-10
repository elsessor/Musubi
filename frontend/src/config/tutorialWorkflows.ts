import type { UserRole } from "../types/auth";
import type { TourStep } from "./tutorial";
import { TUTORIAL_ACTIONS } from "./tutorialActions";

export const WORKFLOW_IDS = ["event-create", "event-browse", "task-create", "task-progress", "ai-delegation", "ai-review", "committees", "membership", "announcements", "request-review", "organization-manage", "user-manage", "audit-filters", "notifications", "preferences"] as const;
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
const event = s("event-card", "Open an event", "Click an existing event to open its task workspace. If there are no events, continue in instructional mode; no sample records are created.", "click");
const task = s("task-card", "Open task details", "Click a task to inspect its details. Members can update only tasks assigned to them; other tasks may be read-only.", "click");

export const WORKFLOW_TOURS: WorkflowTour[] = [
  flow("event-create", "Create an event", "New Event, required fields, schedule, committee, reuse, and Create/Cancel.", leader, E, [
    s("create-event", "New Event", "Click New Event to open the creation form. Opening this form does not create a record.", "click"),
    s("event-title", "Event name", "Enter a clear event name. This is required and appears on the event card and task workspace."),
    s("event-description", "Description", "Describe the purpose, scope, and intended outcome so members understand the work."),
    s("event-committee", "Lead committee", "Choose the responsible committee, or leave the cross-committee option for work shared by the organization."),
    s("event-reuse", "Reuse an event's tasks", "Optionally choose a previous event as a task template. Review reused task dates and assignees before creating the new event."),
    s("event-start", "Start date and time", "Choose when the event starts. The schedule must be consistent with the end date and time."),
    s("event-end", "End date and time", "Choose the event deadline. Correct any validation message before creating the event."),
    s("event-submit", "Create Event", "Create Event saves a real event, including any reused tasks. This guide only explains the button. Finish or exit the guide before intentionally submitting your completed form."),
    s("event-cancel", "Cancel without creating", "Click Cancel to close the form without creating the event. You can reopen it later when ready.", "click")
  ]),
  flow("event-browse", "Browse, filter, and monitor events", "Committee/status filters, views, calendars, and event cards.", campus, E, [
    s("events-tab", "Events & Tasks", "Click the tab to show the event list.", "click"),
    s("event-filter-panel", "Filters on small screens", "On mobile, Filters opens the committee and status controls. On desktop those controls are already visible.", "click"),
    s("event-committee-filter", "Committee filter", "Filter the list to one committee. All Committees restores the complete list you can access."),
    s("event-status-filter", "Status filters", "Choose a status to narrow the list. Counts show matching events; All restores the normal list. Archived records are separate from active work."),
    s("event-view", "View controls", "Switch between the available grid, table, expanded, Kanban, and calendar layouts. Changing a view does not change event records."),
    s("event-custom-status", "Custom statuses", "Authorized leaders can manage status names, colors, and order here. These settings affect workflow display; members do not receive management controls."),
    s("event-filter-done", "Close filters", "If you opened the mobile filter sheet, click Done to return to the event list.", "click"), event
  ]),
  flow("task-create", "Create a task", "Open an event, add a subtask, and review task fields and save actions.", leader, E, [event,
    s("add-task", "Add Task", "Click Add Task inside an event to open the task form. No task is saved by opening it.", "click"),
    s("new-task-title", "Task title", "Enter a specific, actionable task title."),
    s("new-task-description", "Task instructions", "Explain requirements and the expected deliverable."),
    s("new-task-dependencies", "Prerequisites", "Choose tasks that must finish first. Dependencies can prevent work from starting or completing until prerequisites are satisfied."),
    s("new-task-status", "Initial status", "Choose the initial task status from this event's workflow."),
    s("new-task-priority", "Priority", "Set urgency using the available priority levels."),
    s("new-task-assignee", "Assignee", "Choose an organization member who can perform the work. Review their availability and existing responsibilities."),
    s("new-task-committee", "Committee", "Choose the committee responsible for this task when available."),
    s("new-task-start", "Start schedule", "Choose when work should begin."),
    s("new-task-due", "Deadline", "Choose the due date and time. Resolve schedule errors before saving."),
    s("new-task-submit", "Save the task", "Submitting creates a real assigned task. The guide does not submit it. Finish or exit before intentionally saving."),
    s("new-task-cancel", "Cancel", "Click Cancel to close the form without adding a task.", "click")
  ]),
  flow("task-progress", "Inspect and update task progress", "Task details, status, priority, attachments, dependencies, and saving.", campus, E, [event, task,
    s("task-title", "Task title and instructions", "Review the task's title and description before starting. Editing the plan is restricted to authorized users."),
    s("task-status", "Task status", "Use the status dropdown to report progress on work you are allowed to update. Dependency rules may disable starting or completing a blocked task."),
    s("task-priority", "Priority", "Review urgency. Leaders can edit priorities when authorized; members should follow the priority shown or use an available request action."),
    s("task-assignee", "Assigned member", "This identifies who owns the task. Reassignment controls appear only where your role permits them."),
    s("task-attachments", "Work attachments", "Review existing attachments and add required evidence only when you intend to upload real work. The guide never uploads a file."),
    s("task-submit", "Save changes / Update status", "This commits actual changes. The guide leaves it untouched. Finish or close the guide, then save intentionally. Read-only tasks do not show a save action."),
    s("task-close", "Close the task panel", "Click Close or Cancel to leave the panel without submitting changes.", "click")
  ]),
  flow("ai-delegation", "Use AI Task Atomizer", "Target event, status, date, available members, description, and generation.", leader, E, [
    s("ai-tab", "AI Task Atomizer tab", "Click AI Task Atomizer to open planning tools.", "click"),
    s("ai-target", "Target event", "Select the event that should receive the plan. Use Create from Description when you intend to plan a new event."),
    s("ai-create-description", "Existing event or new description", "This control switches between an existing event and a new event title. Switching the form alone does not publish work."),
    s("ai-status", "Default task status", "Choose the initial status for generated tasks; Manage configures the draft workflow."),
    s("ai-date", "Event date", "Provide the real event date so proposed deadlines fit the schedule."),
    s("ai-members", "Participating members", "Enter how many members can participate. Availability and the roster limit the capacity used for planning."),
    s("ai-description", "Goal and context", "Describe the outcome, constraints, and important requirements. Specific context helps produce more relevant subtasks."),
    s("ai-generate", "Generate a proposed plan", "Generating calls the AI service and produces a draft to review. This guide does not call the service. Finish or exit before intentionally generating.")
  ]),
  flow("ai-review", "Review AI suggestions and assignments", "Review existing generated work, matching explanations, warnings, and publication.", leader, E, [
    s("ai-tab", "Open the AI planning workspace", "Click the tab. This walkthrough uses a draft you have already generated; it never generates one for you.", "click"),
    s("ai-auto-assign", "Auto-assign recommendations", "Auto-assign uses the roster and matching factors to suggest assignments. It changes the draft, so the guide only explains the control."),
    s("ai-edit-task", "Edit a generated subtask", "If a draft exists, click Edit on a subtask to inspect its fields and recommendation.", "click"),
    s("ai-match", "Recommended member match", "Read the match explanation and compare it with the task requirements. A suggestion supports your decision and can be overridden."),
    s("ai-review-assignee", "Review the assignee", "Choose a suitable member deliberately. Check availability, relevant skills, and workload before applying an assignment."),
    s("ai-review-cancel", "Return to the draft", "Close the editor without applying changes.", "click"),
    s("ai-warnings", "Warnings and safeguards", "Inspect missing details and assignment warnings. Auto-fix changes the draft; review its effect before using it."),
    s("ai-publish", "Publish reviewed tasks", "Publish applies the plan to real organization work. Review all subtasks and assignments, then finish or exit the guide before publishing intentionally.")
  ]),
  flow("committees", "Create and manage committees", "Committee tab, creation fields, head/member selection, and confirmation.", leader, O, [
    s("committees-tab", "Committees tab", "Click Committees to view your organization's groups.", "click"),
    s("committee-create", "New Committee", "Click New Committee to open the form.", "click"),
    s("committee-name", "Committee name", "Choose a name that describes the team's responsibility."),
    s("committee-description", "Purpose", "Explain what work this committee handles."),
    s("committee-head", "Committee head", "Choose an optional head from organization members. Review who should lead the group."),
    s("committee-search", "Find committee members", "Search organization members, then use member rows to select the intended team."),
    s("committee-submit", "Create committee", "Submitting creates the committee and its real membership. Finish or exit before intentionally confirming."),
    s("committee-cancel", "Cancel creation", "Click Cancel to leave without creating a committee.", "click")
  ]),
  flow("membership", "Members and join requests", "Roster search, member profiles, pending requests, and removal consequences.", campus, O, [
    s("members-tab", "Members tab", "Click Members to open the roster.", "click"),
    s("member-search", "Search members", "Search the roster by the available member details. Clearing the search restores the full roster."),
    s("member-profile", "View Profile", "View Profile opens the selected member's available profile and performance information. Visibility follows your role."),
    s("join-requests", "Pending requests", "Authorized leaders review pending join requests here. Accepting or rejecting changes actual membership; the guide does neither."),
    s("member-remove", "Remove a member", "Removal changes organization membership. Inspect the confirmation and its consequences before proceeding outside the guide. You cannot remove yourself with this control.")
  ]),
  flow("announcements", "Read and post announcements", "Announcement feed, form fields, audience, pinning, and posting.", campus, O, [
    s("announcements-tab", "Announcements tab", "Click Announcements to open the feed.", "click"),
    s("announcement-feed", "Read organization updates", "Read announcements visible to your role and committee. Use available expand controls to read the full text."),
    s("announcement-create", "Post Announcement", "Leaders can click Post Announcement to open the form. Members can continue through the explanation without receiving posting permissions.", "click"),
    s("announcement-title", "Title", "Write a clear subject for the update."),
    s("announcement-content", "Message", "Write the full instructions or news for the intended audience."),
    s("announcement-audience", "Target audience", "Choose all members, leaders only, or a specific committee. Check the audience before posting."),
    s("announcement-pin", "Pin announcement", "Pinning places the announcement at the top of the feed."),
    s("announcement-submit", "Post to the organization", "Posting publishes a real communication to the selected audience. Finish or exit the guide before intentionally posting."),
    s("announcement-cancel", "Cancel posting", "Click Cancel to close the form without posting.", "click")
  ]),
  flow("request-review", "Review organization requests", "Inspect the request, Approve, Reject, rejection reason, and confirmation.", admin, "/admin/org-requests", [
    s("request-card", "Read a pending request", "Review the organization name, type, description, requester, and submission details. With no pending records, continue in instructional mode."),
    s("request-approve", "Approve", "Approve immediately approves the real request. The guide never clicks this button; exit the guide first if you intend to approve."),
    s("request-reject", "Open rejection form", "Click Reject to open the reason form. This alone does not reject the request.", "click"),
    s("request-reason", "Rejection reason", "Provide a clear reason so the requester understands the decision. A reason is required."),
    s("request-confirm", "Confirm Rejection", "This submits a real rejection. The guide does not confirm it. Finish or exit first if you intend to proceed."),
    s("request-cancel", "Cancel the review", "Click Cancel to close the rejection form without rejecting the request.", "click")
  ]),
  flow("organization-manage", "Manage organizations", "Search, Add Organization, registration fields, and confirmation.", admin, "/admin/organizations", [
    s("admin-org-search", "Search organizations", "Search by organization name or type to narrow the directory."),
    s("admin-org-add", "Add Organization", "Click Add Organization to open the form.", "click"),
    s("admin-org-name", "Organization name", "Enter the official organization name."),
    s("admin-org-type", "Organization type", "Choose the applicable organization category."),
    s("admin-org-description", "Organization description", "Describe the organization's purpose."),
    s("admin-org-submit", "Create the organization", "Submitting creates a real organization. Finish or exit the guide before intentionally submitting."),
    s("admin-org-cancel", "Cancel", "Click Cancel to close the form without creating a record.", "click"),
    s("admin-org-card", "Organization details", "Open an organization card to inspect its available details and membership. No organization is opened automatically.")
  ]),
  flow("user-manage", "Filter and manage accounts", "Account search, role/organization/committee/status filters, and edit actions.", admin, "/admin/members", [
    s("admin-member-search", "Find an account", "Search by member name, email, or position."),
    s("admin-member-role-filter", "Role filter", "Show administrators, student leaders, or organization members; All Roles removes the restriction."),
    s("admin-member-org-filter", "Organization filter", "Restrict the directory to an organization."),
    s("admin-member-committee-filter", "Committee filter", "Narrow the list to a committee when available."),
    s("admin-member-status-filter", "Account status", "Filter active accounts, pending join requests, onboarding, or inactive accounts."),
    s("admin-member-edit", "Edit account details", "Click the account's edit control to inspect permitted role and position settings. Opening the editor does not save changes.", "click"),
    s("admin-member-edit-role", "Role", "Changing a role changes account permissions. Check the intended access before saving."),
    s("admin-member-edit-position", "Position", "Set the user's organization position when applicable."),
    s("admin-member-edit-save", "Save account changes", "Saving updates a real account's access or details. The guide does not submit this change."),
    s("admin-member-edit-cancel", "Cancel editing", "Close the editor without saving.", "click")
  ]),
  flow("audit-filters", "Search and filter audit logs", "Search text, categories, date ranges, record details, and pagination.", ["Admin", "Student Leader"], "/dashboard/audit-logs", [
    s("audit-search", "Search audit activity", "Search by actor, action description, or target entity."),
    s("audit-category", "Category filter", "Choose the kind of activity you want to inspect. Restore the all-categories option to broaden results."),
    s("audit-date", "Date range", "Limit results to the available time periods. Combine this with search and category filters."),
    s("audit-record", "Inspect an audit record", "Open a record to read the available details. Audit history records actions; this view does not undo them."),
    s("audit-pagination", "More records", "Use pagination controls to browse more matching records when available.")
  ]),
  flow("notifications", "Notifications and reminders", "Notification tabs, reading updates, and mark-all-as-read.", campus, "/dashboard/notifications", [
    s("notifications-all", "All notifications", "Click All to see the combined notification feed.", "click"),
    s("notifications-announcements", "Announcement notifications", "This tab narrows the feed to organization announcements."),
    s("notifications-nudges", "Nudges", "This tab shows available reminders about your responsibilities."),
    s("notifications-ratings", "Ratings", "Review performance-rating notifications where available."),
    s("notifications-read-all", "Mark all as read", "This changes the unread state of your notifications. The guide does not click it; use it intentionally after reading.")
  ]),
  flow("preferences", "Settings and account preferences", "Profile, available preferences, calendar connection, and save actions.", all, "/dashboard/settings", [
    s("settings-profile", "Profile settings", "Review your name, role, position, and other available profile information. Only editable fields can be changed."),
    s("settings-calendar", "Calendar connection", "Calendar connection opens an external authorization flow; syncing or disconnecting affects your actual connection. The guide does not launch these actions."),
    s("settings-save", "Save settings", "Review changes before saving. Save buttons apply real preferences or profile updates; the tutorial does not submit them.")
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
  "event-title": ["Describe and schedule the event", "Add a name, purpose, committee, and dates. Optionally reuse previous tasks. Review before creating; field details explain each choice."],
  "event-committee-filter": ["Find and monitor events", "Combine committee and status filters to find work, then choose a view that suits you. Leaders can also configure event statuses."],
  "new-task-title": ["Plan the task", "Describe the work, assign an owner and committee, then set priority, prerequisites, and dates. Review before saving."],
  "task-title": ["Review and update your work", "Check instructions, owner, priority, and prerequisites. Update your permitted status and attachments, then review before saving."],
  "ai-target": ["Describe the plan you need", "Choose an event or new description. Set status, date, member count, and goal before generating a draft to review."],
  "ai-match": ["Check the suggested assignment", "Compare the match explanation with the task. Review skills, availability, and workload before choosing an assignee."],
  "ai-warnings": ["Review before publishing", "Resolve missing details and assignment warnings, then check the whole plan before publishing it to your organization."],
  "committee-name": ["Set up the team", "Name the committee, explain its purpose, and choose a head and members. Review the team before creating it."],
  "member-search": ["Find people and review membership", "Search members and open profiles. Leaders can review join requests and manage membership; changes affect real accounts."],
  "announcement-title": ["Write and target your update", "Add a title and message, choose who should see it, and optionally pin it. Check the audience before posting."],
  "request-card": ["Review the request", "Read the organization and requester details before deciding. Approving changes the real request immediately."],
  "request-reason": ["Explain your decision", "A rejection needs a clear reason for the requester. Confirm only after reviewing the decision."],
  "admin-org-name": ["Add organization details", "Enter the official name, category, and purpose. Review the details before creating the organization."],
  "admin-member-search": ["Find the right account", "Search by name, email, or position. Combine role, organization, committee, and status filters to narrow the results."],
  "admin-member-edit-role": ["Review account access", "Check the intended role and organization position before saving. Role changes affect the account's permissions."],
  "audit-search": ["Find an activity record", "Combine search, category, and date filters, then open a matching record for details. Use pagination to see more results."],
  "notifications-announcements": ["Read updates and reminders", "Switch between announcements, nudges, and ratings to find relevant updates. Mark notifications as read after reviewing them."],
  "settings-profile": ["Manage your preferences", "Review your profile, preferences, and calendar connection. Check changes before saving or connecting an external calendar."]
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
        description: memberOnly ? "Search members, then open a profile to see their available details and performance information." : summary[1],
        highlightTargets: group.map((step) => step.target),
        details: group.map(({ title, description }) => ({ title, description })) });
    } else result.push(...group);
    index = end;
  }
  return result;
}
