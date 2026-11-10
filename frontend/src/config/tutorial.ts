import type { UserRole } from "../types/auth";
import { compactWorkflowSteps, getWorkflowTours, WORKFLOW_IDS, type WorkflowId } from "./tutorialWorkflows";
import { getPageTours, PAGE_TOUR_IDS, type PageTourId } from "./tutorialPages";

export const TUTORIAL_VERSION = 1;
export type TourKind = "quick" | "features" | "controls" | WorkflowId | PageTourId;
export const TOUR_IDS = ["quick", "features", "controls", ...WORKFLOW_IDS, ...PAGE_TOUR_IDS] as const;
export type TutorialStatus = {
  version: number;
  status: "in_progress" | "completed" | "dismissed";
  step: number;
  tour: TourKind;
  updatedAt: string;
  acknowledged?: boolean;
  seenPages?: PageTourId[];
};
export type TourStep = { id: string; title: string; description: string; route: string; target: string; highlightTargets?: string[]; details?: { title: string; description: string }[]; interaction?: "click"; openOnNext?: string; reveal?: string[]; selector?: string; prepare?: "events" | "ai" | "members" | "committees" | "announcements" };

const page = (id: string, title: string, description: string, route: string, target = "workspace"): TourStep => ({ id, title, description, route, target });

export function getTourSteps(role: UserRole, kind: TourKind): TourStep[] {
  if (PAGE_TOUR_IDS.includes(kind as PageTourId)) return getPageTours(role).find((tour) => tour.id === kind)?.steps ?? [];
  if (kind !== "quick" && kind !== "features") return compactWorkflowSteps(getWorkflowTours(role).find((tour) => tour.id === kind)?.steps ?? []);
  const admin = role === "Admin";
  const leader = role === "Student Leader";
  const home = admin ? "/admin" : "/dashboard";
  const dashboard = page("dashboard", "Your Dashboard", admin
    ? "Review platform statistics and recent administrative activity from your central workspace."
    : leader ? "See your organization's active events, task progress, member availability, and recent activity."
    : "See your assigned work, upcoming deadlines, nudges, and organization activity in one place.", home);
  const notifications = page("notifications", "Reminders and nudges", "Check Notifications for assignments, deadlines, and updates. The header bell shows your unread count.", "/dashboard/notifications");
  const organization = page("organization", "Your organization", leader
    ? "Use Overview for organization details, Members for join requests, Committees for teams, and Announcements for updates. Actions follow your permissions."
    : "Use the organization tabs to find teammates, committees, and announcements. Actions follow your permissions.", "/dashboard/organization");
  const events = page("events", leader ? "Events, goals, and tasks" : "Your assigned tasks", leader
    ? "Open an event to review its goals and subtasks. Create an event to plan goals, deadlines, and task assignments."
    : "Open your assigned task to check instructions, deadline, priority, and status. Update it as you make progress.", "/dashboard/events", leader ? "create-event" : "workspace");
  const finish = page("finish", "You're ready!", "Return to Help / User Guide anytime to replay a walkthrough or read instructions at your own pace.", home, "help");
  if (kind === "quick") return admin ? [dashboard,
    page("requests", "Organization requests", "Review registration requests here. Open a request to inspect its details before approving it or rejecting it with a reason.", "/admin/org-requests"),
    page("members", "Manage campus accounts", "Find accounts and review their roles, positions, organization assignments, and account status using the available management controls.", "/admin/members"), finish]
    : [dashboard, events, organization, notifications, finish];
  if (admin) return [dashboard,
    page("requests", "Review organization requests", "Inspect each registration request before approving or rejecting it. Rejections require a reason; the tutorial never submits a review for you.", "/admin/org-requests"),
    page("organizations", "Registered organizations", "Browse registered organizations and open an organization to inspect its details and membership.", "/admin/organizations"),
    page("members", "User management", "Review accounts and use the existing controls to manage roles, positions, and organization assignments.", "/admin/members"),
    page("audit", "Audit logs", "Review administrative records and platform activity. Use the available filters to find relevant actions.", "/admin/audit-logs"),
    page("settings", "Administrator settings", "Review your available administrative settings. Your profile is accessible from the sidebar or account menu.", "/admin/settings"), finish];
  return [dashboard,
    { ...events, description: leader
      ? "Open an event to see tasks. When creating work, set the outcome, owner, and deadline. Use filters and views to track progress."
      : "Open an assigned task to read its instructions, check the deadline and prerequisites, update progress, and attach your work." },
    ...(leader ? [
      page("delegation", "Plan with AI, then review", "Describe your goal for a draft plan. Review tasks, member matches, skills, availability, and workload. Adjust assignments before publishing.", "/dashboard/events", "ai-tab")
    ] : []),
    { ...organization, description: leader
      ? "Manage your roster and join requests in Members, teams in Committees, and updates in Announcements. Find detailed guides in Help."
      : "Find your teammates in Members, see your groups in Committees, and read updates in Announcements." },
    ...(leader ? [page("analytics", "Organization analytics", "Review available task and organization performance information to understand progress and workload.", "/dashboard/analytics")] : []),
    notifications,
    page("settings", "Settings and your profile", "Adjust preferences in Settings. Open your profile from the menu or sidebar to review details, skills, availability, and performance.", "/dashboard/settings"), finish];
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
    ...(previous?.seenPages ? { seenPages: [...previous.seenPages] } : {})
  };
}

export function isTutorialStatus(value: unknown): value is TutorialStatus {
  if (!value || typeof value !== "object") return false;
  const s = value as TutorialStatus;
  return s.version === TUTORIAL_VERSION && ["in_progress", "completed", "dismissed"].includes(s.status)
    && Number.isInteger(s.step) && s.step >= 0 && s.step <= 500
    && TOUR_IDS.includes(s.tour) && typeof s.updatedAt === "string"
    && (s.acknowledged === undefined || typeof s.acknowledged === "boolean")
    && (s.seenPages === undefined || (Array.isArray(s.seenPages) && s.seenPages.length <= PAGE_TOUR_IDS.length && s.seenPages.every((id) => PAGE_TOUR_IDS.includes(id))));
}
