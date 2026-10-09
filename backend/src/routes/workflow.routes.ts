import { Router } from "express";
import { firestore } from "../config/firebase.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getCurrentUser } from "../services/auth.service.js";
import type { AuthenticatedRequest } from "../types/auth.types.js";
import { assertCanEditEvent, assertEventAccess } from "../utils/taskPermissions.js";
import { AppError } from "../utils/AppError.js";
import { DEFAULT_EVENT_STATUSES, validateEventStatusSettings } from "../utils/workflowSettings.js";
import { appCache } from "../utils/cache.js";

export const workflowRouter = Router();

async function organizationFor(request: AuthenticatedRequest, write: boolean) {
  const actor = await getCurrentUser(request.authUser!.uid);
  const orgId = typeof request.query.orgId === "string" ? request.query.orgId : actor.organizationId;
  if (!orgId || orgId.includes("/")) throw new AppError("Choose an organization to manage statuses.", 400);
  if (write) assertCanEditEvent(actor, orgId);
  else assertEventAccess(actor, orgId);
  return { ref: firestore.collection("organizations").doc(orgId), orgId };
}

workflowRouter.get("/event-status-settings", requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const { ref, orgId } = await organizationFor(request, false);
    const cacheKey = "status_settings:" + orgId;
    const cached = appCache.get<any>(cacheKey);
    if (cached) {
      response.json(cached);
      return;
    }
    const data = (await ref.get()).data() || {};
    const result = {
      configured: Array.isArray(data.eventCustomStatuses),
      customStatuses: data.eventCustomStatuses || [],
      statusOrder: data.eventStatusOrder || DEFAULT_EVENT_STATUSES
    };
    appCache.set(cacheKey, result, 180_000);
    response.json(result);
  } catch (error) { next(error); }
});

workflowRouter.patch("/event-status-settings", requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const { ref, orgId } = await organizationFor(request, true);
    const settings = validateEventStatusSettings(request.body);
    await ref.set({ eventCustomStatuses: settings.customStatuses, eventStatusOrder: settings.statusOrder }, { merge: true });
    appCache.delete("status_settings:" + orgId);
    appCache.delete("events_raw:" + orgId);
    response.json({ ...settings, configured: true });
  } catch (error) { next(error); }
});
