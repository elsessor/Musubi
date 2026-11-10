import type { UserRole } from "../types/auth";
import { compactWorkflowSteps, getWorkflowTours, WORKFLOW_IDS, type WorkflowId } from "./tutorialWorkflows";
import { getPageTours, PAGE_TOUR_IDS, type PageTourId } from "./tutorialPages";
import { isOnboardingProgress, type OnboardingProgress } from "./onboardingProgress";
import { getSidebarTourSteps } from "./tutorialSidebar";

export const TUTORIAL_VERSION = 1;
export type TourKind = "quick" | "features" | "controls" | "sidebar" | WorkflowId | PageTourId;
export const TOUR_IDS = ["quick", "features", "controls", "sidebar", ...WORKFLOW_IDS, ...PAGE_TOUR_IDS] as const;
export type TutorialStatus = {
  version: number;
  status: "in_progress" | "completed" | "dismissed";
  step: number;
  tour: TourKind;
  updatedAt: string;
  acknowledged?: boolean;
  seenPages?: PageTourId[];
  onboarding?: OnboardingProgress;
};
export type TourStep = { id: string; title: string; description: string; route: string; target: string; sidebarTarget?: string; highlightTargets?: string[]; details?: { title: string; description: string }[]; interaction?: "click"; openOnNext?: string; reveal?: string[]; selector?: string; prepare?: "events" | "ai" | "members" | "committees" | "announcements" };

export function getTourSteps(role: UserRole, kind: TourKind, preview = false): TourStep[] {
  const steps = getBaseTourSteps(role, kind);
  if (!preview || role === "Admin") return steps;
  const descriptions: Record<string, string> = {
    dashboard: "Explore the dashboard layout before joining an organization. Task progress, deadlines, and organization activity appear here after your membership is approved and work is recorded.",
    "dashboard-overview": "Explore your workspace before joining an organization. Empty sections show where task progress, deadlines, and organization activity will appear after membership is approved.",
    events: "Explore event views and placeholder cards to understand schedules, responsibilities, and progress. Organization events and task actions become available after your membership is approved.",
    "events-overview": "Preview event cards, schedules, and progress in this workspace. Placeholder cards explain the layout; organization events and task actions become available after your membership is approved.",
    "events-views": "Try the event views and filters to explore the layout. On small screens, open Filters. Results remain empty until you join an organization with recorded events.",
    delegation: "Explore the AI planning form and its fields. Once your membership is approved, you can generate a task proposal, review assignments, and publish the plan.",
    "events-ai": "Explore the AI Task Atomizer form to understand goal-based planning. Generating proposals and publishing tasks require active organization membership.",
    "event-details-summary": "This preview shows where an event's purpose, status, schedule, members, and task progress appear. Your organization's event information becomes available after membership approval.",
    "event-details-tools": "Try the task search, committee and status filters, and view selector to explore the layout. There are no task records in this preview.",
    "event-details-tasks": "Review the task layout: instructions, prerequisites, assignee, deadline, and attachments. Updating work and planning tasks become available after membership approval.",
    organization: "Explore Overview, Members, Committees, and Announcements using preview layouts. Submit a join request or check its status here. Organization information and actions become available after approval.",
    "organization-overview": "Overview previews organization details, members, and events. Use Join organization to submit a request, or check your pending request while waiting for approval.",
    "organization-members": "Preview the member list, including names, roles, skills, and availability. Your organization's member information appears after membership is approved.",
    "organization-committees": "Preview how committees group members and responsibilities. Committee information and permitted management actions become available after you join.",
    "organization-announcements": "Preview where organization and committee announcements will appear, including the audience, message, author, and date. Actual announcements become available after you join.",
    analytics: "This section summarizes task completion, performance, and workload. Your organization's results appear after membership is approved and activity is recorded.",
    "analytics-overview": "Review the analytics layout. Task completion, performance, and workload results appear after you join an organization and activity is recorded.",
    finish: "You can continue exploring before joining. Check Organization for your membership request, and reopen Get Started or Help / User Guide at any time."
  };
  return steps.map((step) => descriptions[step.id] ? { ...step, description: descriptions[step.id] } : step);
}

function getBaseTourSteps(role: UserRole, kind: TourKind): TourStep[] {
  if (kind === "sidebar") return getSidebarTourSteps(role, role === "Admin" ? "/admin" : "/dashboard");
  if (PAGE_TOUR_IDS.includes(kind as PageTourId)) return getPageTours(role).find((tour) => tour.id === kind)?.steps ?? [];
  if (kind !== "quick" && kind !== "features") return compactWorkflowSteps(getWorkflowTours(role).find((tour) => tour.id === kind)?.steps ?? []);
  const page = (id: string, title: string, description: string, route: string, target = "workspace"): TourStep => ({
    id, title, description, route, target,
    ...(kind === "features" ? { selector: '[data-tour="workspace"]', sidebarTarget: `nav-${route.split("/").filter(Boolean)[1] ?? "dashboard"}` } : {}),
    ...(id === "events" ? { prepare: "events" as const } : {})
  });
  const admin = role === "Admin";
  const leader = role === "Student Leader";
  const home = admin ? "/admin" : "/dashboard";
  const dashboard = page("dashboard", "Your Dashboard", admin
    ? "Review platform statistics and recent administrative activity in your central workspace."
    : leader ? "Review active events, task progress, member availability, and recent organization activity."
    : "Monitor your assigned tasks, upcoming deadlines, task reminders, and organization updates.", home);
  const notifications = page("notifications", "Reminders and nudges", "Review assignments, deadlines, and updates in Notifications. The header bell displays your unread notification count.", "/dashboard/notifications");
  const organization = page("organization", "Your organization", leader
    ? "Use Overview for organization details, Members for membership requests, Committees for teams, and Announcements for updates. Management actions depend on your role."
    : "Explore organization details, member profiles, committees, and announcements. Your role determines which information and actions are available.", "/dashboard/organization");
  const events = page("events", leader ? "Events, goals, and tasks" : "Your assigned tasks", leader
    ? "Open an event to review its goals and tasks. Select New Event to define the schedule, responsibilities, and planned work."
    : "Open an assigned task to review its instructions, deadline, priority, and status. Update its progress as work is completed.", "/dashboard/events", leader ? "create-event" : "workspace");
  const finish: TourStep = { id: "finish", title: "You're ready!", description: "Access Help / User Guide at any time to replay a walkthrough or review detailed instructions.", route: home, target: "help" };
  if (kind === "quick") return admin ? [dashboard,
    page("requests", "Organization requests", "Review each organization registration before approving or rejecting it. Rejection requires a reason; close the guide before submitting a decision.", "/admin/org-requests"),
    page("members", "Manage campus accounts", "Find accounts and review their roles, positions, organization assignments, and account status. Verify intended permissions before saving changes.", "/admin/members"), finish]
    : [dashboard, events, organization, notifications, finish];
  if (admin) return [dashboard,
    page("requests", "Review organization requests", "Review each organization registration before approving or rejecting it. Rejection requires a reason; close the guide before submitting a decision.", "/admin/org-requests"),
    page("organizations", "Registered organizations", "Browse registered organizations and open an entry to review its details and membership.", "/admin/organizations"),
    page("members", "User management", "Find accounts and review their roles, positions, organization assignments, and account status. Verify intended permissions before saving changes.", "/admin/members"),
    page("audit", "Audit logs", "Review recorded administrative actions and platform activity. Use filters to locate relevant records.", "/admin/audit-logs"),
    page("settings", "Administrator settings", "Review account preferences in Settings. Open your profile from the sidebar or account menu to review and update editable information.", "/admin/settings"), finish];
  return [dashboard,
    { ...events, description: leader
      ? "Open an event to review its tasks. Define the expected outcome, responsible member, and deadline when planning work. Use filters to monitor progress."
      : "Review your assigned task's instructions, deadline, and prerequisites. Update its status and attach supporting work as required." },
    ...(leader ? [
      page("delegation", "Plan with AI, then review", "Describe your goal to generate a proposed task plan. Review member skills, availability, and workload, then adjust assignments before publishing.", "/dashboard/events", "ai-tab")
    ] : []),
    { ...organization, description: leader
      ? "Review members and join requests, organize committees, and share announcements. Open Help / User Guide for instructions on specific tasks."
      : "Review member profiles, committee responsibilities, and announcements relevant to your organization." },
    ...(leader ? [page("analytics", "Organization analytics", "Review task performance, completion, and workload to assess organization progress and identify areas requiring attention.", "/dashboard/analytics")] : []),
    notifications,
    page("settings", "Settings and your profile", "Review account preferences in Settings. Open your profile from the sidebar or account menu to review and update editable information.", "/dashboard/settings"), finish];
}

export function tutorialKey(uid: string, role: UserRole) {
  return `musubi:tutorial:${encodeURIComponent(uid)}:${role}:v${TUTORIAL_VERSION}`;
}

export function shouldOfferTutorial(status: TutorialStatus | null) {
  return !status || (status.status === "in_progress" && !status.acknowledged);
}

export function nextTutorialStatus(previous: TutorialStatus | null, status: TutorialStatus["status"], step: number, tour: TourKind): TutorialStatus {
  return {
    version: TUTORIAL_VERSION, status, step, tour, updatedAt: new Date().toISOString(),
    acknowledged: status !== "in_progress" || Boolean(previous?.acknowledged) || previous?.status === "completed" || previous?.status === "dismissed",
    ...(previous?.seenPages ? { seenPages: [...previous.seenPages] } : {}),
    ...(previous?.onboarding ? { onboarding: previous.onboarding } : {})
  };
}

export function isTutorialStatus(value: unknown): value is TutorialStatus {
  if (!value || typeof value !== "object") return false;
  const s = value as TutorialStatus;
  return s.version === TUTORIAL_VERSION && ["in_progress", "completed", "dismissed"].includes(s.status)
    && Number.isInteger(s.step) && s.step >= 0 && s.step <= 500
    && TOUR_IDS.includes(s.tour) && typeof s.updatedAt === "string"
    && (s.acknowledged === undefined || typeof s.acknowledged === "boolean")
    && (s.onboarding === undefined || isOnboardingProgress(s.onboarding))
    && (s.seenPages === undefined || (Array.isArray(s.seenPages) && s.seenPages.length <= PAGE_TOUR_IDS.length && s.seenPages.every((id) => PAGE_TOUR_IDS.includes(id))));
}
