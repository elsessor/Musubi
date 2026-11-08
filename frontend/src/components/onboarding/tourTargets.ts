import type { TourStep } from "@/config/tutorial";
import { TUTORIAL_ACTIONS } from "../../config/tutorialActions";

export function findTourTarget(step: TourStep): HTMLElement | null {
  const navId = step.route.split("/").filter(Boolean)[1] ?? "dashboard";
  const selector = step.selector ?? (step.target === "workspace" && window.innerWidth >= 768
    ? `[data-tour="nav-${navId}"]` : `[data-tour="${step.target}"]`);
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find((el) => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== "hidden" && rect.right > 0 && rect.left < window.innerWidth;
  }) ?? null;
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
