import type { TourStep } from "@/config/tutorial";
import { TUTORIAL_ACTIONS } from "../../config/tutorialActions";

export function findTourTarget(step: TourStep): HTMLElement | null {
  const selector = step.selector ?? `[data-tour="${step.target}"]`;
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find((el) => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== "hidden" && rect.right > 0 && rect.left < window.innerWidth;
  }) ?? null;
}

export function findTourHighlightTargets(step: TourStep): HTMLElement[] {
  const targets = step.highlightTargets?.length ? step.highlightTargets : [step.target];
  return [...new Set(targets.map((target) => findTourTarget(target === step.target ? step : { ...step, target, selector: undefined })).filter((element): element is HTMLElement => Boolean(element)))];
}

export function findTourSidebarTarget(step: TourStep): HTMLElement | null {
  if (!step.sidebarTarget) return null;
  return findTourTarget({ ...step, target: step.sidebarTarget, selector: undefined })
    ?? findTourTarget({ ...step, selector: 'button[aria-label="Open navigation"]' });
}

export function getTourHighlightRect(elements: HTMLElement[]): { x: number; y: number; width: number; height: number } | null {
  const boxes = elements.flatMap((element) => {
    const box = element.getBoundingClientRect();
    let left = Math.max(4, box.left - 5), top = Math.max(4, box.top - 5);
    let right = Math.min(window.innerWidth - 4, box.right + 5), bottom = Math.min(window.innerHeight - 4, box.bottom + 5);
    // Offscreen fields in a scrolling form must not expose its header or footer.
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      const bounds = parent.getBoundingClientRect();
      if (/auto|scroll|hidden|clip/.test(style.overflowX)) {
        left = Math.max(left, bounds.left + parent.clientLeft);
        right = Math.min(right, bounds.left + parent.clientLeft + parent.clientWidth);
      }
      if (/auto|scroll|hidden|clip/.test(style.overflowY)) {
        top = Math.max(top, bounds.top + parent.clientTop);
        bottom = Math.min(bottom, bounds.top + parent.clientTop + parent.clientHeight);
      }
    }
    return right > left && bottom > top ? [{ left, top, right, bottom }] : [];
  });
  if (!boxes.length) return null;
  const x = Math.min(...boxes.map((box) => box.left)), y = Math.min(...boxes.map((box) => box.top));
  return { x, y, width: Math.max(...boxes.map((box) => box.right)) - x, height: Math.max(...boxes.map((box) => box.bottom)) - y };
}

export function canInteractWithTourTarget(el: HTMLElement | null, step: TourStep) {
  return Boolean(step.interaction === "click" && el && !el.matches(':disabled, [aria-disabled="true"]'));
}

export function openTutorialControl(target: string): { opened: boolean; close?: string } {
  const action = TUTORIAL_ACTIONS[target];
  if (!action) return { opened: false };
  const probe = (name: string) => findTourTarget({ id: name, target: name, title: "", description: "", route: "" });
  if (action.expected && probe(action.expected)) return { opened: false };
  const element = probe(target);
  if (!element || element.matches(':disabled, [aria-disabled="true"], [type="submit"]')) return { opened: false };
  element.click();
  return { opened: true, close: action.close };
}
