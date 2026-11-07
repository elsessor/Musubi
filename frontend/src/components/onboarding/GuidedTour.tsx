"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { usePathname, useRouter } from "next/navigation";
import type { TourStep } from "@/config/tutorial";

type Rect = { x: number; y: number; width: number; height: number };
type Props = { steps: TourStep[]; index: number; onStep: (index: number) => void; onExit: (complete: boolean) => void };
const control = "rounded-xl px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-40";

export function GuidedTour({ steps, index, onStep, onExit }: Props) {
  const step = steps[index];
  const router = useRouter();
  const pathname = usePathname();
  const maskId = useId().replace(/:/g, "");
  const panel = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [position, setPosition] = useState({ left: 16, top: 16 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRect(null); setReady(false);
    if (pathname !== step.route) router.push(step.route);
  }, [step, pathname, router]);

  useEffect(() => {
    if (pathname !== step.route) return;
    const deadline = Date.now() + 3000;
    let scrolled = false;
    let prepared = false;
    const measure = () => {
      const workspace = document.querySelector('[data-tour="workspace"]');
      if (!prepared && workspace?.getAttribute("data-tutorial-ready") === "true" && step.route === "/dashboard/events" && step.target !== "ai-tab") {
        const tab = document.querySelector<HTMLButtonElement>('[data-tour="events-tab"]');
        if (tab) { tab.click(); prepared = true; }
      }
      // On desktop, introduce each page beside its real navigation control.
      // Mobile navigation is collapsed, so highlight the rendered page instead.
      const navId = step.route.split("/").filter(Boolean)[1] ?? "dashboard";
      const selector = step.target === "workspace" && window.innerWidth >= 768
        ? `[data-tour="nav-${navId}"]` : `[data-tour="${step.target}"]`;
      const el = document.querySelector<HTMLElement>(selector);
      const box = el?.getBoundingClientRect();
      if (workspace?.getAttribute("data-tutorial-ready") === "true" && el && box && box.width > 0 && box.height > 0 && box.right > 0 && box.left < window.innerWidth) {
        if (!scrolled) {
          // These selectors identify read-only tabs, never forms or business actions.
          if (["announcements-tab", "ai-tab", "members-tab", "committees-tab"].includes(step.target)) el.click();
          el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" }); scrolled = true;
        }
        const b = el.getBoundingClientRect();
        const x = Math.max(4, b.left - 5), y = Math.max(4, b.top - 5);
        setRect({ x, y, width: Math.max(0, Math.min(window.innerWidth - 4, b.right + 5) - x), height: Math.max(0, Math.min(window.innerHeight - 4, b.bottom + 5) - y) });
        setReady(true);
      } else {
        setRect(null);
        if (Date.now() >= deadline) setReady(true);
      }
    };
    measure();
    const timer = window.setInterval(() => { measure(); if (Date.now() >= deadline) window.clearInterval(timer); }, 100);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { window.clearInterval(timer); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [step, pathname]);

  useLayoutEffect(() => {
    const place = () => {
      const width = panel.current?.offsetWidth ?? 360, height = panel.current?.offsetHeight ?? 320;
      const vw = window.innerWidth, vh = window.innerHeight;
      let left = (vw - width) / 2, top = (vh - height) / 2;
      if (vw < 640) { left = 12; top = vh - height - 12; }
      else if (rect) {
        if (rect.x + rect.width + width + 24 < vw) { left = rect.x + rect.width + 16; top = rect.y; }
        else if (rect.y + rect.height + height + 24 < vh) { left = rect.x; top = rect.y + rect.height + 16; }
        else if (rect.y > height + 24) { left = rect.x; top = rect.y - height - 16; }
        else if (rect.x > width + 24) { left = rect.x - width - 16; top = rect.y; }
      }
      setPosition({ left: Math.max(12, Math.min(left, vw - width - 12)), top: Math.max(12, Math.min(top, vh - height - 12)) });
    };
    place();
    const observer = new ResizeObserver(place);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener("resize", place);
    return () => { observer.disconnect(); window.removeEventListener("resize", place); };
  }, [rect, step, ready]);

  return <Dialog.Root open onOpenChange={(open) => { if (!open) onExit(false); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[200]">
        <svg className="h-full w-full" aria-hidden="true">
          <defs><mask id={maskId}><rect width="100%" height="100%" fill="white" />{rect && <rect {...rect} rx="12" fill="black" />}</mask></defs>
          <rect width="100%" height="100%" fill="rgb(15 23 42 / 0.68)" mask={`url(#${maskId})`} />
          {rect && <rect {...rect} rx="12" fill="none" stroke="#60a5fa" strokeWidth="3" />}
        </svg>
      </Dialog.Overlay>
      <Dialog.Content data-tour-dialog ref={panel} style={position} className="fixed z-[201] max-h-[calc(100dvh-24px)] w-[calc(100%-24px)] max-w-sm overflow-y-auto rounded-2xl border border-blue-100 bg-white p-5 text-slate-900 shadow-2xl outline-none motion-safe:transition-[left,top] motion-safe:duration-150"
        onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => { e.preventDefault(); document.querySelector<HTMLButtonElement>('[data-tour="help"]')?.focus(); }}>
        <div aria-live="polite" aria-atomic="true">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-blue-700">Step {index + 1} of {steps.length}</p>
          <Dialog.Title className="pr-8 text-lg font-bold">{step.title}</Dialog.Title>
          <Dialog.Description className="mt-3 text-sm leading-relaxed text-slate-600">{step.description}</Dialog.Description>
        </div>
        {!ready && <p role="status" className="mt-3 text-xs text-slate-500">Opening your workspace…</p>}
        {ready && !rect && <p className="mt-3 text-xs text-slate-500">This control is currently unavailable. You can still read this instruction and continue.</p>}
        <div role="progressbar" aria-label="Tutorial progress" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={index + 1} className="my-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-blue-600" style={{ width: `${(index + 1) / steps.length * 100}%` }} /></div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" className={`${control} text-slate-600 hover:bg-slate-100`} onClick={() => onExit(false)}>Skip Tutorial</button>
          <div className="flex gap-1">
            <button type="button" className={`${control} border border-slate-200`} disabled={index === 0} onClick={() => onStep(index - 1)}>Back</button>
            <button type="button" className={`${control} bg-blue-600 text-white hover:bg-blue-700`} onClick={() => index === steps.length - 1 ? onExit(true) : onStep(index + 1)}>{index === steps.length - 1 ? "Finish" : "Next"}</button>
          </div>
        </div>
        <Dialog.Close aria-label="Close tutorial" className="absolute right-4 top-4 rounded-lg px-2 py-1 text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">✕</Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
