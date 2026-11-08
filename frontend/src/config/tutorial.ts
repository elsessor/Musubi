import type { UserRole } from "../types/auth";
import { compactWorkflowSteps, getWorkflowTours, WORKFLOW_IDS, type WorkflowId } from "./tutorialWorkflows";

export const TUTORIAL_VERSION = 1;
export type TourKind = "quick" | "features" | "controls" | WorkflowId;
export const TOUR_IDS = ["quick", "features", "controls", ...WORKFLOW_IDS] as const;
export type TutorialStatus = {
  version: number;
  status: "in_progress" | "completed" | "dismissed";
  step: number;
  tour: TourKind;
  updatedAt: string;
  acknowledged?: boolean;
};
export type TourStep = { id: string; title: string; description: string; route: string; target: string; highlightTargets?: string[]; details?: { title: string; description: string }[]; interaction?: "click"; openOnNext?: string; reveal?: string[]; selector?: string; prepare?: "events" | "ai" | "members" | "committees" | "announcements" };

const page = (id: string, title: string, description: string, route: string, target = "workspace"): TourStep => ({ id, title, description, route, target });

export function getTourSteps(role: UserRole, kind: TourKind): TourStep[] {
  if (kind !== "quick" && kind !== "features") return compactWorkflowSteps(getWorkflowTours(role).find((tour) => tour.id === kind)?.steps ?? []);
  const admin = role === "Admin";
  const leader = role === "Student Leader";
  const home = admin ? "/admin" : "/dashboard";
  const dashboard = page("dashboard", "Your Dashboard", admin
    ? "Review platform statistics and recent administrative activity from your central workspace."
    : leader ? "See your organization's active events, task progress, member availability, and recent activity."
    : "See your assigned work, upcoming deadlines, nudges, and organization activity in one place.", home);
  const notifications = page("notifications", "Reminders and nudges", "Open Notifications to review task assignments, deadline reminders, and organization updates. Your unread count also appears on the header bell.", "/dashboard/notifications");
  const organization = page("organization", "Your organization", leader
    ? "Use the Overview, Members, Committees, and Announcements tabs to coordinate your organization. Review membership and join requests using the controls available to your role."
    : "Use the organization tabs to see your fellow members, committees, and announcements. Your available actions follow your organization permissions.", "/dashboard/organization");
  const events = page("events", leader ? "Events, goals, and tasks" : "Your assigned tasks", leader
    ? "Open an event to review its goals and subtasks. Create an event to plan goals, deadlines, and task assignments."
    : "Browse events and open an assigned task to inspect its description, deadline, priority, and current status. Update your assigned work as you make progress.", "/dashboard/events", leader ? "create-event" : "workspace");
  const finish = page("finish", "You're ready!", "Use Help / User Guide in the header anytime to restart this tour, explore the feature walkthrough, or read the instructions at your own pace.", home, "help");
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
      ? "Open an event to see its tasks. When creating work, describe the outcome, choose an owner, and set a deadline. Use filters and views to monitor progress."
      : "Open an assigned task to read its instructions, check the deadline and prerequisites, update progress, and attach your work." },
    ...(leader ? [
      page("delegation", "Plan with AI, then review", "Describe your goal to generate a draft plan. Check suggested tasks, member matches, skills, availability, and workload; edit assignments before publishing.", "/dashboard/events", "ai-tab")
    ] : []),
    { ...organization, description: leader
      ? "Manage your roster and join requests in Members, organize teams in Committees, and share updates in Announcements. Choose a detailed guide from Help when you need one."
      : "Find your teammates in Members, see your groups in Committees, and read updates in Announcements." },
    ...(leader ? [page("analytics", "Organization analytics", "Review available task and organization performance information to understand progress and workload.", "/dashboard/analytics")] : []),
    notifications,
    page("settings", "Settings and your profile", "Adjust your preferences in Settings. Open your profile from the account menu or sidebar to review your information, skills, availability, and performance.", "/dashboard/settings"), finish];
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
    acknowledged: status !== "in_progress" || Boolean(previous?.acknowledged) || previous?.status === "completed" || previous?.status === "dismissed"
  };
}

export function isTutorialStatus(value: unknown): value is TutorialStatus {
  if (!value || typeof value !== "object") return false;
  const s = value as TutorialStatus;
  return s.version === TUTORIAL_VERSION && ["in_progress", "completed", "dismissed"].includes(s.status)
    && Number.isInteger(s.step) && s.step >= 0 && s.step <= 500
    && TOUR_IDS.includes(s.tour) && typeof s.updatedAt === "string"
    && (s.acknowledged === undefined || typeof s.acknowledged === "boolean");
}
