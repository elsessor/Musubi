import type { UserRole } from "../types/auth";
import type { TourStep, TutorialStatus } from "./tutorial";

export const PAGE_TOUR_IDS = ["page-dashboard", "page-events", "page-organization", "page-notifications", "page-settings", "page-analytics", "page-audit", "page-requests", "page-organizations", "page-members", "page-profile", "page-event-details"] as const;
export type PageTourId = typeof PAGE_TOUR_IDS[number];
export type PageTour = { id: PageTourId; title: string; route: string; steps: TourStep[] };

export function getPageTours(role: UserRole): PageTour[] {
  const admin = role === "Admin", leader = role === "Student Leader";
  const home = admin ? "/admin" : "/dashboard";
  const tour = (id: PageTourId, title: string, route: string, steps: Omit<TourStep, "route">[]): PageTour => ({
    id, title, route, steps: steps.map((step) => ({ ...step, route }))
  });
  const step = (id: string, title: string, description: string, target = "workspace"): Omit<TourStep, "route"> => ({
    id, title, description, target,
    // Page introductions highlight the content, rather than its sidebar link.
    ...(target === "workspace" ? { selector: '[data-tour="workspace"]' } : {})
  });

  return [
    tour("page-dashboard", "Dashboard introduction", home, [
      step("dashboard-overview", "Welcome to your dashboard", admin
        ? "Review platform statistics and recent administrative activity. Use the navigation to access organization and account management sections."
        : leader ? "Review event progress, tasks, member availability, and recent activity. Information appears as your organization records its work."
        : "Monitor your assigned tasks, deadlines, reminders, and organization updates. New assignments appear as work is allocated to you.", "dashboard-summary"),
      step("dashboard-work", admin ? "Organizations and accounts" : leader ? "Recent events" : "Your active tasks", admin
        ? "Review registered organizations and recently added accounts. Open the related sidebar sections for management actions."
        : leader ? "Review event schedules, status, and progress. Use View All to open Events & Tasks when you are ready."
        : "Review active assigned tasks and deadlines. Use View All to open their event workspace when you are ready.", "dashboard-work"),
      ...(!admin ? [step("dashboard-updates", leader ? "Recent activity" : "Reminders and deadlines", leader ? "Review recent changes and organization activity recorded in the system." : "Review reminders and deadline alerts. Notifications provides the complete feed.", "dashboard-updates")] : []),
      step("dashboard-help", "Help is always available", "Open Help / User Guide to replay an introduction, review field details, or start the full walkthrough. You may skip a guide at any time.", "help")
    ]),
    ...(!admin ? [
      tour("page-events", "Events & Tasks introduction", "/dashboard/events", [
        { ...step("events-overview", leader ? "Plan events and tasks" : "Find your work", leader
          ? "Open an event to manage its tasks. Select New Event to define its purpose, schedule, and responsibilities."
          : "Review event tasks, claim eligible unassigned work, and update your assigned tasks. Check prerequisites before starting and attach supporting work when required."), prepare: "events" },
        { ...step("events-views", "Find and monitor work", "On small screens, open Filters for committee and status options. Choose a grid, table, or calendar view to review schedules and progress.", "event-status-filter"),
          highlightTargets: ["event-filter-panel", "event-committee-filter", "event-status-filter", "event-view"] },
        ...(leader ? [step("events-ai", "Plan with AI, then review", "AI Task Atomizer proposes tasks from your goal. Review task details, member skills, availability, and workload before confirming assignments and publishing.", "ai-tab")] : [])
      ]),
      tour("page-event-details", "Event workspace introduction", "/dashboard/events", [
        step("event-details-summary", "Event details and progress", "Review the event's status, schedule, and overall task progress. On small screens, use Show event details to view the complete summary.", "event-summary"),
        { ...step("event-details-tools", "Find and organize tasks", "Search tasks and filter by committee or status. On small screens, open Filters. Choose a grid, table, list, board, or calendar view.", "task-view"),
          highlightTargets: ["task-filter-panel", "task-committee-filter", "task-status-filter", "task-search", "task-view"] },
        { ...step("event-details-tasks", leader ? "Review and plan event tasks" : "Review your responsibilities", leader
          ? "Open tasks to review instructions, assignments, and progress. Use Add Task or Reuse Tasks to plan active events. Archived events remain read-only."
          : "Open a task to review its instructions and prerequisites. Update your assigned work or claim eligible unassigned tasks after confirmation.", "event-task-workspace"),
          ...(leader ? { highlightTargets: ["event-task-workspace", "task-create-actions"] } : {}) }
      ]),
      tour("page-organization", "Organization introduction", "/dashboard/organization", [
        step("organization-overview", "Your organization at a glance", "Review organization details and activity in Overview. Before joining, explore each tab's layout and check your membership request status.", "overview-tab"),
        step("organization-members", "Members and responsibilities", leader
          ? "Search members, review profiles, and manage join requests. Confirm membership decisions carefully, as they determine organization access."
          : "Search the member list and open profiles to review available information. Your role determines which details and actions are accessible.", "members-tab"),
        step("organization-committees", "Teams and committees", leader
          ? "Organize responsibilities into committees. Define each team's purpose, optionally appoint a head, and select its members."
          : "Review the organization's committees, their responsibilities, and the members assigned to each team.", "committees-tab"),
        step("organization-announcements", "Stay informed", leader
          ? "Read organization updates or prepare an announcement. Select the intended audience and review the message before posting."
          : "Read announcements shared with your organization or committee. Open a message to review its full content.", "announcements-tab")
      ]),
      tour("page-notifications", "Notifications introduction", "/dashboard/notifications", [
        step("notifications-overview", "Your updates in one place", "Review assignments, deadlines, and organization updates. The bell indicates unread notifications; select All to view the complete feed.", "notifications-all"),
        { ...step("notifications-categories", "Find relevant reminders", "Filter the feed by announcements, task reminders, or ratings. Review notifications before using Mark all as read.", "notifications-announcements"),
          highlightTargets: ["notifications-announcements", "notifications-nudges", "notifications-ratings", "notifications-read-all"] }
      ])
    ] : [
      tour("page-requests", "Organization requests introduction", "/admin/org-requests", [
        step("requests-overview", "Review organization requests", "Review each organization's details and requester before deciding on its registration. New applications appear here for assessment."),
        { ...step("requests-decisions", "Make a deliberate decision", "Approve accepts a request immediately. Reject requires a reason and confirmation. Review the application and close the guide before submitting either decision.", "request-approve"),
          highlightTargets: ["request-approve", "request-reject"] }
      ]),
      tour("page-organizations", "Organizations introduction", "/admin/organizations", [
        step("organizations-overview", "Find an organization", "Search the organization directory and open an entry to review its details and membership."),
        step("organizations-create", "Register an organization", "Select Add Organization to enter its official name, category, and purpose. Review the information before registering the organization.", "admin-org-add")
      ]),
      tour("page-members", "Account management introduction", "/admin/members", [
        { ...step("accounts-filter", "Find the right account", "Search for an account and use role, organization, or status filters to narrow the results.", "admin-member-search"),
          highlightTargets: ["admin-member-search", "admin-member-role-filter", "admin-member-org-filter", "admin-member-status-filter"] },
        step("accounts-edit", "Review account permissions", "Open an account's editor to review its role and position. Role changes affect system permissions; verify the intended access before saving.", "admin-member-edit")
      ])
    ]),
    ...(leader ? [tour("page-analytics", "Analytics introduction", "/dashboard/analytics", [
      step("analytics-overview", "Understand organization progress", "Review task completion, performance, and workload to identify progress and areas requiring attention. Results reflect recorded organization activity.", "analytics-summary"),
      step("analytics-workflow", "Work distribution and progress", "Compare event and task status distributions with active work. Read the results alongside members' availability before making assignment decisions.", "analytics-workflow"),
      step("analytics-context", "Use the numbers with context", "Consider members' responsibilities and availability alongside the reported results before changing assignments. Related planning guides are available in Help / User Guide.", "help")
    ])] : []),
    ...(admin || leader ? [tour("page-audit", "Audit log introduction", `${home}/audit-logs`, [
      { ...step("audit-filters", "Find an activity record", "Use search, category, and date filters to locate relevant organization or platform activity.", "audit-search"),
        highlightTargets: ["audit-search", "audit-category", "audit-date"] },
      step("audit-records", "Understand what happened", "Open an activity record to review who performed an action, what changed, and when it occurred.", "audit-record")
    ])] : []),
    tour("page-settings", "Settings introduction", `${home}/settings`, [
      step("settings-overview", "Manage your preferences", "Review your profile and preferences. Update the fields permitted for your account and verify changes before saving.", "settings-profile"),
      step("settings-calendar", "Calendar and account connections", "Connect your calendar through the authorization screen. Review permissions before connecting, syncing events, or disconnecting your account.", "settings-calendar")
    ]),
    tour("page-profile", "Profile introduction", "/dashboard/profile", [
      step("profile-overview", "Your profile and availability", "Review personal account information and availability. Use the profile editor to update the details permitted for your account.", "profile-details"),
      step("profile-skills", "Skills support planning", "Review skill keywords used to describe your capabilities. Keep editable skills current to help leaders plan suitable assignments.", "profile-skills"),
      ...(!admin ? [step("profile-tasks", "Assigned work and performance", "Review your recorded tasks and filter them by status. Performance information appears where available to your role.", "profile-tasks")] : [])
    ])
  ];
}

export function getPageTourForRoute(role: UserRole, route: string, context?: "event"): PageTour | undefined {
  return getPageTours(role).find((tour) => tour.route === route && (context === "event" ? tour.id === "page-event-details" : tour.id !== "page-event-details"));
}

export function shouldShowPageTour(status: TutorialStatus | null, id: PageTourId): boolean {
  if (status?.onboarding) return !["completed", "dismissed"].includes(status.onboarding.modules?.[id]?.status ?? "not_started");
  return !status?.seenPages?.includes(id);
}
