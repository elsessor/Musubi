"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { TourStep } from "@/config/tutorial";
import { canInteractWithTourTarget, findTourHighlightTargets, getTourHighlightRect, openTutorialControl } from "./tourTargets";
import { FieldReference } from "./FieldReference";

type Rect = { x: number; y: number; width: number; height: number };
type Props = { steps: TourStep[]; index: number; onStep: (index: number) => void; onExit: (complete: boolean) => void };
const control = "inline-flex min-h-11 items-center justify-center rounded-xl px-2.5 py-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-40 sm:px-3 sm:text-sm";

export function GuidedTour({ steps, index, onStep, onExit }: Props) {
  const step = steps[index];
  const router = useRouter();
  const pathname = usePathname();
  const maskId = useId().replace(/:/g, "");
  const panel = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const openedControls = useRef<string[]>([]);
  const openControl = useCallback((target: string) => {
    const result = openTutorialControl(target);
    if (result.close) openedControls.current.push(result.close);
  }, []);
  const callbacks = useRef({ onStep, onExit, index, count: steps.length });
  callbacks.current = { onStep, onExit, index, count: steps.length };
  const [rect, setRect] = useState<Rect | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number; maxHeight?: number; maxWidth?: number }>({ left: 16, top: 16 });
  const [ready, setReady] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const returnFocus = document.activeElement as HTMLElement | null;
    return () => {
      for (const target of openedControls.current.reverse()) openTutorialControl(target);
      openedControls.current = [];
      const help = document.querySelector<HTMLButtonElement>('[data-tour="help"]');
      (returnFocus?.isConnected ? returnFocus : help)?.focus();
    };
  }, []);

  useEffect(() => {
    setReferenceOpen(false);
    if (content.current) content.current.scrollTop = 0;
    panel.current?.focus({ preventScroll: true });
  }, [index, portalHost]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault(); event.stopImmediatePropagation(); callbacks.current.onExit(false); return;
      }
      const target = targetRef.current;
      if (interactive && target === document.activeElement && (event.key === "Enter" || event.key === " ") && !target?.matches("button, a, input, select, textarea")) {
        event.preventDefault(); target?.click(); return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), summary, select, [tabindex="0"]') ?? []).filter((element) => element.getClientRects().length > 0);
      if (interactive && target) controls.unshift(target);
      if (!controls.length) return;
      const current = controls.indexOf(document.activeElement as HTMLElement);
      event.preventDefault();
      controls[current < 0 ? (event.shiftKey ? controls.length - 1 : 0) : (current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus();
    };
    document.addEventListener("keydown", handleKey, true);
    return () => document.removeEventListener("keydown", handleKey, true);
  }, [interactive]);

  useEffect(() => {
    setRect(null); setReady(false); setInteractive(false);
    if (pathname !== step.route) router.push(step.route);
  }, [step, pathname, router]);

  useEffect(() => {
    if (pathname !== step.route) return;
    const deadline = Date.now() + 3000;
    let scrolled = false;
    let prepared = false;
    const revealed = new Set<string>();
    let timer: number;
    let advanceTimer: number | undefined;
    let attached: HTMLElement | null = null;
    let previousTabIndex: string | null = null;
    let clicked = false;
    const clickedTarget = (event: MouseEvent) => {
      if (!attached || !canInteractWithTourTarget(attached, step) || clicked) return;
      // Only the expected control's own click advances; clicks on nested action buttons do not.
      if (event.target instanceof Element && event.target.closest('button, a, input, select, textarea') && !attached.matches('button, a') && event.target !== attached) return;
      clicked = true;
      advanceTimer = window.setTimeout(() => {
        const cb = callbacks.current;
        if (cb.index === index) cb.index === cb.count - 1 ? cb.onExit(true) : cb.onStep(index + 1);
      }, 150);
    };
    const detach = () => {
      if (!attached) return;
      attached.removeEventListener("click", clickedTarget);
      if (previousTabIndex === null) attached.removeAttribute("tabindex"); else attached.setAttribute("tabindex", previousTabIndex);
      attached = null;
    };
    const measure = () => {
      const workspace = document.querySelector('[data-tour="workspace"]');
      setPortalHost(document.querySelector<HTMLDialogElement>('dialog[open]') ?? document.body);
      if (!prepared && workspace?.getAttribute("data-tutorial-ready") === "true" && step.prepare === "events") {
        window.dispatchEvent(new Event("musubi:tutorial:prepare-events")); prepared = true;
      }
      let targets = findTourHighlightTargets(step);
      let el = targets[0] ?? null;
      if (!el && workspace?.getAttribute("data-tutorial-ready") === "true") {
        const opener = step.reveal?.find((target) => !revealed.has(target));
        if (opener) { revealed.add(opener); openControl(opener); targets = findTourHighlightTargets(step); el = targets[0] ?? null; }
      }
      targetRef.current = el;
      const box = el?.getBoundingClientRect();
      if (workspace?.getAttribute("data-tutorial-ready") === "true" && el && box && box.width > 0 && box.height > 0 && box.right > 0 && box.left < window.innerWidth) {
        if (!scrolled) {
          // These selectors identify read-only tabs, never forms or business actions.
          if (!step.interaction && ["overview-tab", "announcements-tab", "ai-tab", "members-tab", "committees-tab"].includes(step.target)) el.click();
          el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" }); scrolled = true;
        }
        const allowed = canInteractWithTourTarget(el, step);
        setInteractive(allowed);
        if (attached !== el) {
          detach(); attached = el; previousTabIndex = el.getAttribute("tabindex");
          if (allowed) { el.tabIndex = 0; el.addEventListener("click", clickedTarget); }
        }
        setRect(getTourHighlightRect(targets));
        setReady(true);
      } else {
        detach(); setInteractive(false);
        setRect(null);
        if (Date.now() >= deadline) setReady(true);
      }
    };
    measure();
    timer = window.setInterval(() => { measure(); if (Date.now() >= deadline) window.clearInterval(timer); }, 100);
    let mutationTimer: number | undefined;
    // A late loaded record, dialog, or responsive control can replace the target.
    const observer = new MutationObserver(() => { window.clearTimeout(mutationTimer); mutationTimer = window.setTimeout(measure, 50); });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { detach(); observer.disconnect(); window.clearTimeout(mutationTimer); window.clearTimeout(advanceTimer); window.clearInterval(timer); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [step, pathname, index, openControl]);

  useLayoutEffect(() => {
    const place = () => {
      const viewport = window.visualViewport;
      const vw = viewport?.width ?? window.innerWidth, vh = viewport?.height ?? window.innerHeight;
      const originX = viewport?.offsetLeft ?? 0, originY = viewport?.offsetTop ?? 0;
      const margin = vw < 640 ? 16 : 24;
      const maxWidth = Math.max(0, vw - margin * 2);
      const maxHeight = Math.max(0, Math.min(vh - margin * 2, vw < 640 ? Math.max(200, vh * (referenceOpen ? 0.72 : 0.48)) : vh));
      const width = Math.min(panel.current?.offsetWidth ?? 320, maxWidth), height = Math.min(panel.current?.offsetHeight ?? 260, maxHeight);
      const minLeft = originX + margin, minTop = originY + margin;
      const maxLeft = Math.max(minLeft, originX + vw - width - margin), maxTop = Math.max(minTop, originY + vh - height - margin);
      let left = originX + (vw - width) / 2, top = originY + (vh - height) / 2;
      if (vw < 640) {
        // Use the edge that covers the least of the highlighted form.
        const overlap = (y: number) => rect ? Math.max(0, Math.min(y + height, rect.y + rect.height) - Math.max(y, rect.y)) : 0;
        top = rect && overlap(minTop) < overlap(maxTop) ? minTop : maxTop;
      }
      else if (rect) {
        if (rect.x + rect.width + width + 16 <= originX + vw - margin) { left = rect.x + rect.width + 16; top = rect.y; }
        else if (rect.y + rect.height + height + 16 <= originY + vh - margin) { left = rect.x; top = rect.y + rect.height + 16; }
        else if (rect.y - height - 16 >= minTop) { left = rect.x; top = rect.y - height - 16; }
        else if (rect.x - width - 16 >= minLeft) { left = rect.x - width - 16; top = rect.y; }
      }
      setPosition({ left: Math.max(minLeft, Math.min(left, maxLeft)), top: Math.max(minTop, Math.min(top, maxTop)), maxHeight, maxWidth });
    };
    place();
    const observer = new ResizeObserver(place);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener("resize", place);
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", place);
    viewport?.addEventListener("scroll", place);
    return () => { observer.disconnect(); window.removeEventListener("resize", place); viewport?.removeEventListener("resize", place); viewport?.removeEventListener("scroll", place); };
  }, [rect, step, ready, interactive, portalHost, referenceOpen]);

  if (!portalHost) return null;
  return createPortal(<>
      <div className="pointer-events-none fixed inset-0 z-[200]" aria-hidden="true">
        <svg className="h-full w-full" aria-hidden="true">
          <defs><mask id={maskId}><rect width="100%" height="100%" fill="white" />{rect && <rect {...rect} rx="12" fill="black" />}</mask></defs>
          <rect width="100%" height="100%" fill="rgb(15 23 42 / 0.68)" mask={`url(#${maskId})`} />
          {rect && <rect {...rect} rx="12" fill="none" stroke="#60a5fa" strokeWidth="3" />}
        </svg>
      </div>
      {interactive && rect ? <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[200]">
        <div className="pointer-events-auto absolute inset-x-0 top-0" style={{ height: rect.y }} />
        <div className="pointer-events-auto absolute inset-x-0 bottom-0" style={{ top: rect.y + rect.height }} />
        <div className="pointer-events-auto absolute left-0" style={{ top: rect.y, width: rect.x, height: rect.height }} />
        <div className="pointer-events-auto absolute right-0" style={{ top: rect.y, left: rect.x + rect.width, height: rect.height }} />
      </div> : <div aria-hidden="true" className="fixed inset-0 z-[200]" />}
      <div data-tour-dialog role="dialog" aria-modal={!interactive} aria-labelledby={`${maskId}-title`} aria-describedby={`${maskId}-description`} tabIndex={-1} ref={panel} style={position} className="fixed z-[201] flex max-h-[48dvh] w-[min(20rem,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white p-3 text-slate-900 shadow-2xl outline-none [overflow-wrap:anywhere] motion-safe:transition-[left,top] motion-safe:duration-150 sm:max-h-[calc(100dvh-48px)] sm:w-[min(28rem,calc(100vw-48px))] sm:p-5">
        <div aria-live="polite" aria-atomic="true" className="shrink-0 pb-2 pr-8 sm:pb-3">
          <p className="mb-1 text-[11px] font-bold text-blue-700 sm:mb-2 sm:text-xs">Step {index + 1} of {steps.length}</p>
          <h2 id={`${maskId}-title`} className="text-[15px] font-bold leading-snug sm:text-lg">{step.title}</h2>
        </div>
        <div ref={content} className="min-h-0 overflow-y-auto overscroll-contain pr-1">
          <p id={`${maskId}-description`} className="text-xs leading-5 text-slate-600 sm:text-sm sm:leading-relaxed">{step.description}</p>
          {step.details && <FieldReference key={step.id} fields={step.details} onOpenChange={setReferenceOpen} />}
          {!ready && <p role="status" className="mt-2 text-xs text-slate-500">Opening your workspace…</p>}
          {ready && !rect && <p className="mt-2 text-xs text-slate-500">Currently unavailable. Read the guide and continue with Next.</p>}
          {interactive && <button type="button" onClick={() => targetRef.current?.focus()} className={`${control} mt-2 border border-blue-200 text-blue-700`}>Focus highlighted control</button>}
          {interactive && <p role="status" className="mt-1 text-xs text-blue-700">Select the highlight to continue, or skip this step.</p>}
        </div>
        <div className="shrink-0 bg-white">
          <div role="progressbar" aria-label="Tutorial progress" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={index + 1} className="mb-1 mt-2 h-1 overflow-hidden rounded-full bg-slate-100 sm:my-4 sm:h-1.5"><div className="h-full bg-blue-600" style={{ width: `${(index + 1) / steps.length * 100}%` }} /></div>
          <div className="flex items-center justify-between gap-1">
            <button type="button" aria-label="Skip tutorial" className={`${control} text-slate-600 hover:bg-slate-100`} onClick={() => onExit(false)}>Skip<span className="hidden sm:inline">&nbsp;Tutorial</span></button>
            <div className="flex gap-1">
              <button type="button" aria-label="Previous step" className={`${control} min-w-11 gap-1 border border-slate-200`} disabled={index === 0} onClick={() => onStep(index - 1)}>
                <ArrowLeft aria-hidden="true" className="size-4" /><span className="hidden sm:inline">Back</span>
              </button>
              <button type="button" className={`${control} gap-1 bg-blue-600 text-white hover:bg-blue-700`} onClick={() => {
                if (step.openOnNext) openControl(step.openOnNext);
                index === steps.length - 1 ? onExit(true) : onStep(index + 1);
              }}>{index === steps.length - 1 ? "Finish" : interactive ? "Skip step" : "Next"}<ArrowRight aria-hidden="true" className="size-4" /></button>
            </div>
          </div>
        </div>
        <button type="button" onClick={() => onExit(false)} aria-label="Close tutorial" className="absolute right-1 top-1 inline-flex size-11 items-center justify-center rounded-lg bg-white text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 sm:right-2 sm:top-2"><X aria-hidden="true" className="size-4" /></button>
      </div>
  </>, portalHost);
}
