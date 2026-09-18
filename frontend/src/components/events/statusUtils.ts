export type StatusThemeColor = "blue" | "purple" | "emerald" | "amber" | "rose" | "cyan" | "indigo" | "violet" | "slate";

export type CustomStatusConfig = {
  name: string;
  color: StatusThemeColor;
};

export const COLOR_OPTIONS: { key: StatusThemeColor; label: string; dot: string; bg: string }[] = [
  { key: "blue", label: "Blue", dot: "bg-blue-500", bg: "bg-blue-50" },
  { key: "purple", label: "Purple", dot: "bg-purple-500", bg: "bg-purple-50" },
  { key: "emerald", label: "Emerald", dot: "bg-emerald-500", bg: "bg-emerald-50" },
  { key: "amber", label: "Amber", dot: "bg-amber-400", bg: "bg-amber-50" },
  { key: "rose", label: "Rose", dot: "bg-rose-500", bg: "bg-rose-50" },
  { key: "cyan", label: "Cyan", dot: "bg-cyan-500", bg: "bg-cyan-50" },
  { key: "indigo", label: "Indigo", dot: "bg-indigo-500", bg: "bg-indigo-50" },
  { key: "violet", label: "Violet", dot: "bg-violet-500", bg: "bg-violet-50" },
  { key: "slate", label: "Slate", dot: "bg-slate-400", bg: "bg-slate-100" },
];

export const THEME_MAP: Record<
  StatusThemeColor,
  {
    dot: string;
    text: string;
    bg: string;
    badge: string;
    border: string;
    headerTone: string;
  }
> = {
  blue: {
    dot: "bg-blue-500",
    text: "text-blue-600",
    bg: "bg-blue-50",
    badge: "bg-blue-50 text-blue-600 ring-blue-200 border-blue-200",
    border: "border-l-blue-500",
    headerTone: "bg-blue-50 text-blue-700"
  },
  purple: {
    dot: "bg-purple-500",
    text: "text-purple-600",
    bg: "bg-purple-50",
    badge: "bg-purple-50 text-purple-600 ring-purple-200 border-purple-200",
    border: "border-l-purple-500",
    headerTone: "bg-purple-50 text-purple-700"
  },
  emerald: {
    dot: "bg-emerald-500",
    text: "text-emerald-600",
    bg: "bg-emerald-50",
    badge: "bg-emerald-50 text-emerald-600 ring-emerald-200 border-emerald-200",
    border: "border-l-emerald-500",
    headerTone: "bg-emerald-50 text-emerald-700"
  },
  amber: {
    dot: "bg-amber-400",
    text: "text-amber-600",
    bg: "bg-amber-50",
    badge: "bg-amber-50 text-amber-700 ring-amber-200 border-amber-200",
    border: "border-l-amber-400",
    headerTone: "bg-amber-50 text-amber-700"
  },
  rose: {
    dot: "bg-rose-500",
    text: "text-rose-600",
    bg: "bg-rose-50",
    badge: "bg-rose-50 text-rose-600 ring-rose-200 border-rose-200",
    border: "border-l-rose-500",
    headerTone: "bg-rose-50 text-rose-700"
  },
  cyan: {
    dot: "bg-cyan-500",
    text: "text-cyan-600",
    bg: "bg-cyan-50",
    badge: "bg-cyan-50 text-cyan-600 ring-cyan-200 border-cyan-200",
    border: "border-l-cyan-500",
    headerTone: "bg-cyan-50 text-cyan-700"
  },
  indigo: {
    dot: "bg-indigo-500",
    text: "text-indigo-600",
    bg: "bg-indigo-50",
    badge: "bg-indigo-50 text-indigo-600 ring-indigo-200 border-indigo-200",
    border: "border-l-indigo-500",
    headerTone: "bg-indigo-50 text-indigo-700"
  },
  violet: {
    dot: "bg-violet-500",
    text: "text-violet-600",
    bg: "bg-violet-50",
    badge: "bg-violet-50 text-violet-600 ring-violet-200 border-violet-200",
    border: "border-l-violet-500",
    headerTone: "bg-violet-50 text-violet-700"
  },
  slate: {
    dot: "bg-slate-400",
    text: "text-slate-600",
    bg: "bg-slate-100",
    badge: "bg-slate-100 text-slate-600 ring-slate-200 border-slate-200",
    border: "border-l-slate-400",
    headerTone: "bg-slate-100 text-slate-700"
  }
};

export function getStatusTheme(status: string, customStatuses?: CustomStatusConfig[]): {
  dot: string;
  text: string;
  bg: string;
  badge: string;
  border: string;
  headerTone: string;
} {
  const normalized = status.trim().toLowerCase();

  // Known default event & task statuses
  if (normalized === "active" || normalized === "in progress") return THEME_MAP.blue;
  if (normalized === "planning" || normalized === "in review") return THEME_MAP.amber;
  if (normalized === "completed") return THEME_MAP.emerald;
  if (normalized === "archived" || normalized === "to do") return THEME_MAP.slate;

  // Custom status match
  if (customStatuses) {
    const match = customStatuses.find((c) => c.name.trim().toLowerCase() === normalized);
    if (match && THEME_MAP[match.color]) {
      return THEME_MAP[match.color];
    }
  }

  // Fallback based on string hash for consistent colors
  const keys: StatusThemeColor[] = ["indigo", "purple", "rose", "cyan", "violet", "amber", "blue"];
  let hash = 0;
  for (let i = 0; i < status.length; i++) {
    hash = status.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorKey = keys[Math.abs(hash) % keys.length];
  return THEME_MAP[colorKey];
}
