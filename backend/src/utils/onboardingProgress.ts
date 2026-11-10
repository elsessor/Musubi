import { z } from "zod";

export const pageTourSchema = z.enum(["page-dashboard", "page-events", "page-organization", "page-notifications", "page-settings", "page-analytics", "page-audit", "page-requests", "page-organizations", "page-members", "page-profile", "page-event-details", "page-member-profile"]);
const sectionSchema = z.object({ status: z.enum(["in_progress", "completed", "dismissed"]), step: z.number().int().min(0).max(500), updatedAt: z.string().datetime() }).strict();
export const onboardingSchema = z.object({
  version: z.literal(1),
  restartedAt: z.string().datetime().optional(),
  preference: z.object({ mode: z.enum(["guided", "independent"]), updatedAt: z.string().datetime(), source: z.enum(["user", "legacy"]).optional() }).strict().optional(),
  welcome: sectionSchema.optional(), sidebar: sectionSchema.optional(), modules: z.partialRecord(pageTourSchema, sectionSchema).optional()
}).strict();
type Progress = z.infer<typeof onboardingSchema>;
type Section = z.infer<typeof sectionSchema>;
export const onboardingRunTime = (progress?: Progress) => progress?.restartedAt ? Date.parse(progress.restartedAt) : 0;

export function normalizeLegacyOnboarding(progress: Progress | undefined, lastTour?: string): Progress | undefined {
  const preference = progress?.preference;
  if (!progress || !preference || preference.source || progress.welcome?.updatedAt !== preference.updatedAt || progress.sidebar?.status !== "dismissed" || progress.sidebar.updatedAt !== preference.updatedAt) return progress;
  const modules = { ...progress.modules };
  for (const id of pageTourSchema.options) {
    const item = modules[id];
    if (item?.status === "dismissed" && item.updatedAt === preference.updatedAt && lastTour !== id) modules[id] = { ...item, status: "in_progress", step: 0 };
  }
  return { ...progress, preference: { ...preference, mode: "guided", source: "legacy" }, modules };
}

export function mergeOnboarding(a?: Progress, b?: Progress): Progress | undefined {
  if (!a) return b;
  if (!b) return a;
  if (onboardingRunTime(a) !== onboardingRunTime(b)) return onboardingRunTime(a) > onboardingRunTime(b) ? a : b;
  const rank = { in_progress: 0, dismissed: 1, completed: 2 };
  const merge = (left?: Section, right?: Section) => !left ? right : !right ? left : rank[left.status] !== rank[right.status] ? rank[left.status] > rank[right.status] ? left : right : left.updatedAt > right.updatedAt ? left : right;
  const preference = !a.preference ? b.preference : !b.preference ? a.preference : a.preference.updatedAt > b.preference.updatedAt ? a.preference : b.preference;
  const modules: Progress["modules"] = {};
  for (const id of pageTourSchema.options) {
    const merged = merge(a.modules?.[id], b.modules?.[id]);
    if (merged) modules[id] = merged;
  }
  return { version: 1, ...(a.restartedAt ? { restartedAt: a.restartedAt } : {}), ...(preference ? { preference } : {}), ...(merge(a.welcome, b.welcome) ? { welcome: merge(a.welcome, b.welcome) } : {}), ...(merge(a.sidebar, b.sidebar) ? { sidebar: merge(a.sidebar, b.sidebar) } : {}), ...(Object.keys(modules).length ? { modules } : {}) };
}
