import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getConnectUrlController,
  calendarCallbackController,
  calendarStatusController,
  disconnectCalendarController,
  syncAllEventsController
} from "../controllers/calendar.controller.js";

export const calendarRouter = Router();

// OAuth callback from Google (public GET request from browser redirect)
calendarRouter.get("/google/callback", calendarCallbackController);

// Authenticated endpoints for user
calendarRouter.get("/google/connect-url", requireAuth, getConnectUrlController);
calendarRouter.get("/google/status", requireAuth, calendarStatusController);
calendarRouter.post("/google/disconnect", requireAuth, disconnectCalendarController);
calendarRouter.post("/google/sync-all", requireAuth, syncAllEventsController);
