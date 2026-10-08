import type { TaskPriority } from "./types";
import { THEME_MAP } from "./statusUtils";

export const PRIORITY_CONFIG = {
  Low: { label: "Low", ...THEME_MAP.slate, classes: THEME_MAP.slate.badge },
  Medium: { label: "Medium", ...THEME_MAP.blue, classes: THEME_MAP.blue.badge },
  High: { label: "High", ...THEME_MAP.amber, classes: THEME_MAP.amber.badge },
  Critical: { label: "Critical", ...THEME_MAP.rose, classes: THEME_MAP.rose.badge }
};

export const ALL_PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Critical"];
