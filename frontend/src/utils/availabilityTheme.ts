import { THEME_MAP } from "@/components/events/statusUtils";

export function getAvailabilityTheme(value?: string | null) {
  const status = value?.trim().replace(/\s+/g, " ").toLowerCase();
  if (status === "available") return THEME_MAP.emerald;
  if (status === "busy") return THEME_MAP.amber;
  return THEME_MAP.slate;
}

export function getAvailabilityLabel(value?: string | null): string {
  const status = value?.trim().replace(/\s+/g, " ") || "";
  if (status.toLowerCase() === "available") return "Available";
  if (status.toLowerCase() === "busy") return "Busy";
  if (status.toLowerCase() === "on leave") return "On Leave";
  return status || "Status not set";
}
