import { AppError } from "./AppError.js";

export const DEFAULT_EVENT_STATUSES = ["Active", "Planning", "Completed", "Cancelled", "Archived"];
const COLORS = new Set(["blue", "purple", "emerald", "amber", "rose", "cyan", "indigo", "violet", "slate"]);

export function validateEventStatusSettings(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new AppError("Invalid status settings.", 400);
  const { customStatuses, statusOrder } = input as Record<string, unknown>;
  if (!Array.isArray(customStatuses) || customStatuses.length > 50 || !Array.isArray(statusOrder) || statusOrder.length > 55) {
    throw new AppError("Provide up to 50 custom statuses and their display order.", 400);
  }
  const names = new Set<string>();
  const statuses = customStatuses.map((entry) => {
    if (!entry || typeof entry.name !== "string" || !entry.name.trim() || entry.name.trim().length > 60 || !COLORS.has(entry.color)) {
      throw new AppError("Each status needs a name and a valid color.", 400);
    }
    const name = entry.name.trim();
    if (names.has(name.toLowerCase())) throw new AppError("Status names must be unique.", 400);
    names.add(name.toLowerCase());
    return { name, color: entry.color as string };
  });
  const allowed = [...DEFAULT_EVENT_STATUSES, ...statuses.map((entry) => entry.name)];
  if (statusOrder.some((entry) => typeof entry !== "string" || !allowed.includes(entry))) throw new AppError("Invalid status order.", 400);
  return { customStatuses: statuses, statusOrder: [...new Set([...statusOrder, ...allowed])] as string[] };
}
