import type { UserRole } from "../types/auth";
import type { TourStep, TutorialStatus } from "./tutorial";

export const PAGE_TOUR_IDS = ["page-dashboard", "page-events", "page-organization", "page-notifications", "page-settings", "page-analytics", "page-audit", "page-requests", "page-organizations", "page-members", "page-profile"] as const;
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
        ? "Check platform statistics and recent activity here. Each section in the navigation has its own short introduction."
        : leader ? "See event progress, tasks, member availability, and recent activity. An empty dashboard fills in as your organization starts working."
        : "Find assigned work, deadlines, reminders, and organization activity here. New tasks appear as your organization assigns work."),
      { ...step("dashboard-navigation", "Explore your workspace", "Use the navigation to open each section. On phones, use the menu button. A short guide appears on your first visit."),
        selector: 'aside, button[aria-label="Open navigation"]' },
      step("dashboard-help", "Help is always available", "Use Help / User Guide to replay a page guide, take the full walkthrough, or read field details. You can skip any guide.", "help")
    ]),
    ...(!admin ? [
      tour("page-events", "Events & Tasks introduction", "/dashboard/events", [
        { ...step("events-overview", leader ? "Plan events and tasks" : "Find your work", leader
          ? "Open an event to review its tasks. New Event starts a plan; give tasks an owner, instructions, and a deadline."
          : "Open an event, then an assigned task. Read its instructions and prerequisites before updating progress or attaching your work."), prepare: "events" },
        { ...step("events-views", "Find and monitor work", "Combine committee and status filters, then choose a grid, table, or calendar view. These controls change the view, not your records.", "event-status-filter"),
          highlightTargets: ["event-committee-filter", "event-status-filter", "event-view"] },
        ...(leader ? [step("events-ai", "Plan with AI, then review", "AI Task Atomizer drafts tasks from your goal. Check skills, availability, workload, and assignments before publishing. The guide never generates or publishes work.", "ai-tab")] : [])
      ]),
      tour("page-organization", "Organization introduction", "/dashboard/organization", [
        step("organization-overview", "Your organization at a glance", "Overview shows your organization's details and activity. If you haven't joined yet, use Join organization or check your pending request.", "overview-tab"),
        step("organization-members", "Members and responsibilities", leader
          ? "Search your roster, open member profiles, and review join requests. Accepting, rejecting, or removing a member changes real membership."
          : "Search teammates and open profiles to see their available details. Membership management follows your role's permissions.", "members-tab"),
        step("organization-committees", "Teams and committees", leader
          ? "Use committees to group responsibilities. You can create a committee, choose its head, and select members when ready."
          : "See your organization's committees and the members responsible for each team's work.", "committees-tab"),
        step("organization-announcements", "Stay informed", leader
          ? "Read organization updates here. When posting, choose the audience and review the message before publishing. Find detailed guides in Help."
          : "Read updates shared with your organization or committee. Open Help / User Guide anytime for more detail.", "announcements-tab")
      ]),
      tour("page-notifications", "Notifications introduction", "/dashboard/notifications", [
        step("notifications-overview", "Your updates in one place", "Review assignments, deadlines, and organization updates. The bell shows your unread count; All brings your notifications together.", "notifications-all"),
        { ...step("notifications-categories", "Find relevant reminders", "Use announcements, nudges, and ratings to narrow the feed. Mark all as read only after reviewing your updates.", "notifications-announcements"),
          highlightTargets: ["notifications-announcements", "notifications-nudges", "notifications-ratings", "notifications-read-all"] }
      ])
    ] : [
      tour("page-requests", "Organization requests introduction", "/admin/org-requests", [
        step("requests-overview", "Review organization requests", "Inspect the organization's details and requester before deciding. New submissions appear here when they need review."),
        { ...step("requests-decisions", "Make a deliberate decision", "Approve changes the real request immediately. Reject opens a reason form; review the reason before confirming. The guide does not submit decisions.", "request-approve"),
          highlightTargets: ["request-approve", "request-reject"] }
      ]),
      tour("page-organizations", "Organizations introduction", "/admin/organizations", [
        step("organizations-overview", "Find an organization", "Search the directory and open a card to review the organization's details and members."),
        step("organizations-create", "Register an organization", "Add Organization opens a form for the official name, type, and purpose. Review the information before creating a real record.", "admin-org-add")
      ]),
      tour("page-members", "Account management introduction", "/admin/members", [
        { ...step("accounts-filter", "Find the right account", "Search accounts and combine role, organization, committee, and status filters to narrow the results.", "admin-member-search"),
          highlightTargets: ["admin-member-search", "admin-member-role-filter", "admin-member-org-filter", "admin-member-committee-filter", "admin-member-status-filter"] },
        step("accounts-edit", "Review account permissions", "Edit opens the selected account's role and position settings. Role changes affect access; review before saving. The guide does not edit accounts.", "admin-member-edit")
      ])
    ]),
    ...(leader ? [tour("page-analytics", "Analytics introduction", "/dashboard/analytics", [
      step("analytics-overview", "Understand organization progress", "Review performance, task completion, and workload to identify progress and areas needing attention. Results reflect the work currently recorded."),
      step("analytics-context", "Use the numbers with context", "Compare the available information with actual responsibilities and availability before changing assignments. Help includes guides for planning and reviewing work.", "help")
    ])] : []),
    ...(admin || leader ? [tour("page-audit", "Audit log introduction", `${home}/audit-logs`, [
      { ...step("audit-filters", "Find an activity record", "Combine search, category, and date filters to find relevant activity.", "audit-search"),
        highlightTargets: ["audit-search", "audit-category", "audit-date"] },
      step("audit-records", "Understand what happened", "Open a record for the actor, action, and related details. Audit history documents changes; reading a record does not undo them.", "audit-record")
    ])] : []),
    tour("page-settings", "Settings introduction", `${home}/settings`, [
      step("settings-overview", "Manage your preferences", "Review your profile and available preferences here. Change only editable fields, then review before saving.", "settings-profile"),
      step("settings-calendar", "Calendar and account connections", "Calendar connection opens an authorization flow. Connecting, syncing, or disconnecting affects your real account; the guide only explains these actions.", "settings-calendar")
    ]),
    tour("page-profile", "Profile introduction", "/dashboard/profile", [
      step("profile-overview", "Your profile and availability", "Review your details, skills, availability, and available performance information. Keep editable information current to support task planning.")
    ])
  ];
}

export function getPageTourForRoute(role: UserRole, route: string): PageTour | undefined {
  return getPageTours(role).find((tour) => tour.route === route);
}

export function shouldShowPageTour(status: TutorialStatus | null, id: PageTourId): boolean {
  return !status?.seenPages?.includes(id);
}
