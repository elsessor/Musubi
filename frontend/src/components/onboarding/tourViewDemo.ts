import { TOUR_VIEW_MODES, type TourViewDemo, type TourViewMode } from "../../config/tutorialViews";
import { findTourTarget } from "./tourTargets";

export const VIEW_DEMO_EVENT = "musubi:tutorial:view";
export function isTourViewMode(value: unknown): value is TourViewMode {
  return typeof value === "string" && TOUR_VIEW_MODES.includes(value as TourViewMode);
}

// A view demonstration can only change local layout state; it never clicks a
// record, drag target, form action, or calendar item.
export function attachTutorialViewDemo(element: HTMLElement, select: (mode: TourViewMode) => void) {
  const change = (event: Event) => {
    const mode: unknown = (event as CustomEvent).detail;
    if (isTourViewMode(mode)) select(mode);
  };
  element.addEventListener(VIEW_DEMO_EVENT, change);
  return () => element.removeEventListener(VIEW_DEMO_EVENT, change);
}

export function createViewDemonstration() {
  const originals = new Map<HTMLElement, { initial: TourViewMode; latest: TourViewMode }>();
  return {
    show(demo: TourViewDemo): HTMLElement | null {
      if (!["events", "tasks"].includes(demo.scope) || !isTourViewMode(demo.mode)) return null;
      const element = findTourTarget({ id: "view-demo", title: "", description: "", route: "", target: "", selector: `[data-tour-view-scope="${demo.scope}"]` });
      const initial = element?.getAttribute("data-tour-view");
      if (!element || !isTourViewMode(initial)) return null;
      const saved = originals.get(element);
      originals.set(element, { initial: saved?.initial ?? initial, latest: demo.mode });
      element.dispatchEvent(new CustomEvent(VIEW_DEMO_EVENT, { detail: demo.mode }));
      return element;
    },
    restore() {
      for (const [element, saved] of originals) {
        if (element.isConnected && element.getAttribute("data-tour-view") === saved.latest) element.dispatchEvent(new CustomEvent(VIEW_DEMO_EVENT, { detail: saved.initial }));
      }
      originals.clear();
    }
  };
}
