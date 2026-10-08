import { Router } from "express";
import { firestore } from "../config/firebase.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getCurrentUser } from "../services/auth.service.js";
import type { AuthenticatedRequest } from "../types/auth.types.js";
import { assertCanEditEvent, assertEventAccess } from "../utils/taskPermissions.js";
import { AppError } from "../utils/AppError.js";
import { DEFAULT_EVENT_STATUSES, validateEventStatusSettings } from "../utils/workflowSettings.js";

export const workflowRouter = Router();

async function organizationFor(request: AuthenticatedRequest, write: boolean) {
  const actor = await getCurrentUser(request.authUser!.uid);
  const orgId = typeof request.query.orgId === "string" ? request.query.orgId : actor.organizationId;
  if (!orgId || orgId.includes("/")) throw new AppError("Choose an organization to manage statuses.", 400);
  if (write) assertCanEditEvent(actor, orgId);
  else assertEventAccess(actor, orgId);
  return firestore.collection("organizations").doc(orgId);
}

workflowRouter.get("/event-status-settings", requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const ref = await organizationFor(request, false);
    const data = (await ref.get()).data() || {};
    response.json({
      configured: Array.isArray(data.eventCustomStatuses),
      customStatuses: data.eventCustomStatuses || [],
      statusOrder: data.eventStatusOrder || DEFAULT_EVENT_STATUSES
    });
  } catch (error) { next(error); }
});

workflowRouter.patch("/event-status-settings", requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const ref = await organizationFor(request, true);
    const settings = validateEventStatusSettings(request.body);
    await ref.set({ eventCustomStatuses: settings.customStatuses, eventStatusOrder: settings.statusOrder }, { merge: true });
    response.json({ ...settings, configured: true });
  } catch (error) { next(error); }
});
