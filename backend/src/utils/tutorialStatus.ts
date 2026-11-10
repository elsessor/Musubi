import { z } from "zod";

export const tutorialStatusSchema = z.object({
  version: z.literal(1),
  role: z.enum(["Admin", "Student Leader", "Organization Member"]),
  status: z.enum(["in_progress", "completed", "dismissed"]),
  step: z.number().int().min(0).max(500),
  tour: z.enum(["quick", "features", "controls", "event-create", "event-browse", "task-create", "task-progress", "ai-delegation", "ai-review", "committees", "membership", "announcements", "request-review", "organization-manage", "user-manage", "audit-filters", "notifications", "preferences", "page-dashboard", "page-events", "page-organization", "page-notifications", "page-settings", "page-analytics", "page-audit", "page-requests", "page-organizations", "page-members", "page-profile"]),
  acknowledged: z.boolean().optional(),
  seenPages: z.array(z.enum(["page-dashboard", "page-events", "page-organization", "page-notifications", "page-settings", "page-analytics", "page-audit", "page-requests", "page-organizations", "page-members", "page-profile"])).max(11).optional()
}).strict();

