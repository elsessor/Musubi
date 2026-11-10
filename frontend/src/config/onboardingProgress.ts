import type { TutorialStatus } from "./tutorial";
import { PAGE_TOUR_IDS, type PageTourId } from "./tutorialPages";

export type SectionProgress = { status: "in_progress" | "completed" | "dismissed"; step: number; updatedAt: string };
export type OnboardingProgress = {
  version: 1;
  preference?: { mode: "guided" | "independent"; updatedAt: string; source?: "user" | "legacy" };
  welcome?: SectionProgress;
  sidebar?: SectionProgress;
  modules?: Partial<Record<PageTourId, SectionProgress>>;
};
export type OnboardingSection = "welcome" | "sidebar" | PageTourId;
export const isFinished = (section?: SectionProgress) => section?.status === "completed" || section?.status === "dismissed";

export function onboardingProgress(saved: TutorialStatus | null): OnboardingProgress {
  if (saved?.onboarding) {
    const progress = saved.onboarding;
    const preference = progress.preference;
    // Older migrations inferred an opt-out from any dismissed guide. Those
    // snapshots share one timestamp; an explicit welcome choice is separate.
    const inferred = preference && !preference.source && progress.welcome?.updatedAt === preference.updatedAt
      && progress.sidebar?.status === "dismissed" && progress.sidebar.updatedAt === preference.updatedAt;
    if (!inferred) return progress;
    const modules = { ...progress.modules };
    for (const id of PAGE_TOUR_IDS) {
      const item = modules[id];
      if (item?.status === "dismissed" && item.updatedAt === preference.updatedAt && saved.tour !== id) modules[id] = { ...item, status: "in_progress", step: 0 };
    }
    return { ...progress, preference: { ...preference, mode: "guided", source: "legacy" }, modules };
  }
  if (!saved) return { version: 1 };
  // Legacy seenPages recorded presentation; only the last guide has a known result.
  const established = saved.acknowledged || saved.status !== "in_progress" || Boolean(saved.seenPages?.length);
  if (!established) return { version: 1 };
  const modules: OnboardingProgress["modules"] = {};
  for (const id of saved.seenPages ?? []) modules[id] = { status: saved.tour === id ? saved.status : "in_progress", step: saved.tour === id ? saved.step : 0, updatedAt: saved.updatedAt };
  return { version: 1, preference: { mode: "guided", source: "legacy", updatedAt: saved.updatedAt }, welcome: { status: "completed", step: 0, updatedAt: saved.updatedAt }, sidebar: { status: "dismissed", step: 0, updatedAt: saved.updatedAt }, modules };
}

export function sectionProgress(progress: OnboardingProgress, section: OnboardingSection) {
  return section === "welcome" || section === "sidebar" ? progress[section] : progress.modules?.[section];
}

export function updateSection(progress: OnboardingProgress, section: OnboardingSection, status: SectionProgress["status"], step = 0): OnboardingProgress {
  const previous = sectionProgress(progress, section);
  // Replaying or pausing an acknowledged section never resets its acknowledgement.
  if (previous?.status === "completed" || (previous?.status === "dismissed" && status !== "completed")) return progress;
  const next = { status, step, updatedAt: new Date().toISOString() };
  return section === "welcome" || section === "sidebar" ? { ...progress, [section]: next } : { ...progress, modules: { ...progress.modules, [section]: next } };
}

export function mergeOnboarding(a?: OnboardingProgress, b?: OnboardingProgress): OnboardingProgress | undefined {
  if (!a) return b;
  if (!b) return a;
  const rank = { in_progress: 0, dismissed: 1, completed: 2 };
  const merge = (left?: SectionProgress, right?: SectionProgress) => !left ? right : !right ? left : rank[left.status] !== rank[right.status] ? rank[left.status] > rank[right.status] ? left : right : left.updatedAt > right.updatedAt ? left : right;
  const preference = !a.preference ? b.preference : !b.preference ? a.preference : a.preference.updatedAt > b.preference.updatedAt ? a.preference : b.preference;
  const modules: OnboardingProgress["modules"] = {};
  for (const id of PAGE_TOUR_IDS) {
    const merged = merge(a.modules?.[id], b.modules?.[id]);
    if (merged) modules[id] = merged;
  }
  return { version: 1, ...(preference ? { preference } : {}), ...(merge(a.welcome, b.welcome) ? { welcome: merge(a.welcome, b.welcome) } : {}), ...(merge(a.sidebar, b.sidebar) ? { sidebar: merge(a.sidebar, b.sidebar) } : {}), ...(Object.keys(modules).length ? { modules } : {}) };
}

export function isOnboardingProgress(value: unknown): value is OnboardingProgress {
  if (!value || typeof value !== "object") return false;
  const progress = value as OnboardingProgress;
  const stamp = (date: unknown) => typeof date === "string" && Number.isFinite(Date.parse(date));
  const section = (item: unknown): boolean => {
    if (!item || typeof item !== "object") return false;
    const s = item as SectionProgress;
    return ["in_progress", "completed", "dismissed"].includes(s.status) && Number.isInteger(s.step) && s.step >= 0 && s.step <= 500 && stamp(s.updatedAt);
  };
  return progress.version === 1 && (progress.preference === undefined || (progress.preference !== null && ["guided", "independent"].includes(progress.preference.mode) && stamp(progress.preference.updatedAt) && (progress.preference.source === undefined || ["user", "legacy"].includes(progress.preference.source))))
    && (progress.welcome === undefined || section(progress.welcome)) && (progress.sidebar === undefined || section(progress.sidebar))
    && (progress.modules === undefined || (progress.modules !== null && typeof progress.modules === "object" && !Array.isArray(progress.modules) && Object.entries(progress.modules).every(([id, state]) => PAGE_TOUR_IDS.includes(id as PageTourId) && section(state))));
}
