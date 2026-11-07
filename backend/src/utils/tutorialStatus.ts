import { z } from "zod";

export const tutorialStatusSchema = z.object({
  version: z.literal(1),
  role: z.enum(["Admin", "Student Leader", "Organization Member"]),
  status: z.enum(["in_progress", "completed", "dismissed"]),
  step: z.number().int().min(0).max(50),
  tour: z.enum(["quick", "features"]),
  acknowledged: z.boolean().optional()
}).strict();

