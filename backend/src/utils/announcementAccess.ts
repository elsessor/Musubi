import { AppError } from "./AppError.js";
import type { TaskActor, TaskRecord } from "./taskPermissions.js";

export function assertCanPostAnnouncement(user: TaskActor, organizationId: string, audience: string, committeeId?: unknown) {
  if (user.role !== "Admin" && (user.role !== "Student Leader" || user.organizationId !== organizationId)) {
    throw new AppError("Only this organization's leader can post announcements.", 403);
  }
  if (!["All Members", "Leaders Only", "Officers Only", "Committee"].includes(audience)) throw new AppError("Choose a valid announcement audience.", 400);
  if (audience === "Committee" && (typeof committeeId !== "string" || !committeeId.trim())) throw new AppError("Select a committee for this announcement.", 400);
}

export function canViewAnnouncement(user: TaskActor & { committeeId?: string | null }, announcement: TaskRecord) {
  if (user.role === "Admin") return true;
  if (!user.organizationId || user.organizationId !== (announcement.organizationId || announcement.orgId)) return false;
  if (user.role === "Student Leader") return true;
  if (["Leaders Only", "Officers Only"].includes(announcement.targetAudience)) return false;
  if (announcement.targetAudience === "Committee") return Boolean(user.committeeId && user.committeeId === announcement.committeeId);
  return !announcement.targetAudience || announcement.targetAudience === "All Members";
}
