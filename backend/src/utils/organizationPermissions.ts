import { AppError } from "./AppError.js";
import type { TaskActor } from "./taskPermissions.js";

export function assertCanUpdateOrganization(user: TaskActor, organizationId: string, input: { setupStatus?: string }) {
  if (user.role !== "Admin" && (user.role !== "Student Leader" || user.organizationId !== organizationId)) {
    throw new AppError("Only this organization's student leader or an administrator can edit organization details.", 403);
  }
  if (input.setupStatus !== undefined && user.role !== "Admin") {
    throw new AppError("Setup status is managed through administrator review and cannot be edited here.", 403);
  }
}
