import { z } from "zod";
import { onboardingSchema, pageTourSchema } from "./onboardingProgress.js";

export const tutorialStatusSchema = z.object({
  version: z.literal(1),
  role: z.enum(["Admin", "Student Leader", "Organization Member"]),
  status: z.enum(["in_progress", "completed", "dismissed"]),
  step: z.number().int().min(0).max(500),
  tour: z.enum(["quick", "features", "controls", "sidebar", "event-create", "event-browse", "task-create", "task-progress", "ai-delegation", "ai-review", "committees", "membership", "announcements", "request-review", "organization-manage", "user-manage", "audit-filters", "notifications", "preferences", "page-dashboard", "page-events", "page-organization", "page-notifications", "page-settings", "page-analytics", "page-audit", "page-requests", "page-organizations", "page-members", "page-profile", "page-event-details"]),
  acknowledged: z.boolean().optional(),
  seenPages: z.array(pageTourSchema).max(12).optional(),
  onboarding: onboardingSchema.optional()
}).strict();

