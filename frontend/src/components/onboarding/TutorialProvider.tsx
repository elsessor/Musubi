"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getTourSteps, nextTutorialStatus, tutorialKey, type TourKind, type TutorialStatus, type TourStep } from "@/config/tutorial";
import { getPageTourForRoute, getPageTours, PAGE_TOUR_IDS, shouldShowPageTour, type PageTourId } from "@/config/tutorialPages";
import { getWorkflowTours } from "@/config/tutorialWorkflows";
import { loadTutorial, saveTutorial } from "@/services/tutorial.service";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { GuidedTour } from "./GuidedTour";
import { collectPageControls } from "./controlGuide";
import { getDashboardNavItems } from "@/utils/routes";

const HelpContext = createContext<() => void>(() => {});
const button = "inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:px-4 sm:py-2.5 sm:text-sm";

export function TutorialHelpButton() {
  const open = useContext(HelpContext);
  return <button type="button" data-tour-help data-tour="help" onClick={() => open()} title="Help / User Guide" aria-label="Help / User Guide" className="inline-flex shrink-0 items-center gap-2 rounded-xl p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
    <CircleHelp className="size-5" /><span className="hidden text-xs font-semibold lg:inline">Help / User Guide</span>
  </button>;
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.firebaseUser);
  const loading = useAuthStore((s) => s.loading);
  const pathname = usePathname();
  const router = useRouter();
  const [mode, setMode] = useState<"guide" | "tour" | null>(null);
  const [automaticRoute, setAutomaticRoute] = useState<string | null>(null);
  const [kind, setKind] = useState<TourKind>("quick");
  const [inspectRoute, setInspectRoute] = useState<string | null>(null);
  const [controlSteps, setControlSteps] = useState<TourStep[]>([]);
  const controlCleanup = useRef<() => void>(() => {});
  const [index, setIndex] = useState(0);
  const [localOnly, setLocalOnly] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState<string | null>(null);
  const [saved, setSaved] = useState<TutorialStatus | null>(null);
  const savedRef = useRef<TutorialStatus | null>(null);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const opened = useRef(new Set<string>());
  const identity = user && profile && user.uid === profile.uid ? tutorialKey(user.uid, profile.role) : null;
  const allowed = Boolean(profile && (profile.role === "Admin" ? pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/dashboard/profile" : pathname === "/dashboard" || pathname.startsWith("/dashboard/")));

  useEffect(() => {
    controlCleanup.current();
    setMode(null); setAutomaticRoute(null); setStatusLoaded(null); setSaved(null); savedRef.current = null;
    if (!identity || !user || !profile || loading) return;
    let cancelled = false;
    void loadTutorial(user, profile.role).then((result) => {
      if (cancelled) return;
      savedRef.current = result.status;
      setSaved(result.status); setLocalOnly(result.localOnly); setStatusLoaded(identity);
    });
    return () => { cancelled = true; };
    // Identity intentionally avoids reloading on unrelated profile refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, loading]);

  useEffect(() => {
    const check = () => {
      const el = document.querySelector('[data-tour="workspace"]');
      setWorkspaceReady(el?.getAttribute("data-tutorial-ready") === "true" && el?.getAttribute("data-tutorial-role") === profile?.role
        && !document.querySelector('[role="dialog"], [role="alertdialog"]'));
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-tutorial-ready", "data-tutorial-role"] });
    return () => observer.disconnect();
  }, [pathname, profile?.role]);

  useEffect(() => {
    const setupReady = profile?.role === "Admin" || profile?.onboardingCompleted || Boolean(profile?.organizationId);
    if (!identity || !profile || !setupReady || statusLoaded !== identity || loading || !allowed || !workspaceReady || mode || inspectRoute) return;
    const pageTour = getPageTourForRoute(profile.role, pathname);
    if (!pageTour || !shouldShowPageTour(savedRef.current, pageTour.id) || opened.current.has(`${identity}:${pageTour.id}`)) return;
    opened.current.add(`${identity}:${pageTour.id}`);
    setAutomaticRoute(pathname); setKind(pageTour.id); setIndex(0);
    // Remember presentation immediately, including refreshes or an interrupted visit.
    persist("in_progress", 0, pageTour.id, pageTour.id);
    setMode("tour");
    // Progress is read from its ref; profile refreshes must not restart a guide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, statusLoaded, loading, allowed, pathname, workspaceReady, mode, inspectRoute, profile?.role, profile?.onboardingCompleted, profile?.organizationId]);

  useEffect(() => {
    if (automaticRoute && pathname !== automaticRoute) {
      setMode(null); setAutomaticRoute(null);
    }
  }, [automaticRoute, pathname]);

  useEffect(() => { if (!allowed) setMode(null); }, [allowed]);
  useEffect(() => () => controlCleanup.current(), []);
  useEffect(() => { setInspectRoute(null); }, [identity]);

  useEffect(() => {
    if (!inspectRoute || pathname !== inspectRoute || !profile || !identity) return;
    const timeout = Date.now() + 6000;
    let timer: number;
    const collect = () => {
      const workspace = document.querySelector('[data-tour="workspace"]');
      if (workspace?.getAttribute("data-tutorial-ready") !== "true" && Date.now() < timeout) {
        timer = window.setTimeout(collect, 150); return;
      }
      controlCleanup.current();
      const result = collectPageControls(profile.role, inspectRoute);
      controlCleanup.current = result.cleanup;
      setControlSteps(result.steps.length ? result.steps : [{ id: "empty-page", route: inspectRoute, target: "workspace", title: "This page", description: "No controls are currently available. Records and actions will appear here when they are available to your account." }]);
      setKind("controls"); setIndex(0); persist("in_progress", 0, "controls", getPageTourForRoute(profile.role, inspectRoute)?.id); setMode("tour"); setInspectRoute(null);
    };
    timer = window.setTimeout(collect, 350);
    return () => window.clearTimeout(timer);
    // A scan belongs to the selected account and route, not profile refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectRoute, pathname, identity]);

  function persist(status: TutorialStatus["status"], step = index, tour = kind, seenPage?: PageTourId) {
    if (!user || !profile || !identity) return;
    const next = nextTutorialStatus(savedRef.current, status, step, tour);
    const currentPage = mode === "tour" && (!automaticRoute || automaticRoute === pathname) ? getPageTourForRoute(profile.role, pathname)?.id : undefined;
    const seenPages = [...new Set([...(next.seenPages ?? []), ...(seenPage ? [seenPage] : []), ...(currentPage ? [currentPage] : [])])];
    if (seenPages.length) next.seenPages = seenPages;
    savedRef.current = next;
    setSaved(next);
    void saveTutorial(user, profile.role, next).then((synced) => {
      if (useAuthStore.getState().firebaseUser?.uid === user.uid && useAuthStore.getState().profile?.role === profile.role) setLocalOnly(!synced);
    });
  }
  function close(complete = false) {
    if (mode !== "guide") persist(complete ? "completed" : "dismissed");
    controlCleanup.current();
    controlCleanup.current = () => {};
    setMode(null);
    setAutomaticRoute(null);
    setInspectRoute(null);
  }
  function inspectPage(route: string) {
    if (!profile || ![...getDashboardNavItems(profile.role).map((item) => item.href), "/dashboard/profile"].includes(route)) return;
    setMode(null); setAutomaticRoute(null); setInspectRoute(route);
    if (pathname !== route) router.push(route);
  }
  function start(tour: TourKind, resume = false, scope?: Element | null) {
    if (!profile) return;
    // Stored or manually supplied tour IDs never grant a role access to a workflow.
    if (!["quick", "features", "controls"].includes(tour) && !getWorkflowTours(profile.role).some((item) => item.id === tour) && !getPageTours(profile.role).some((item) => item.id === tour)) return;
    controlCleanup.current();
    controlCleanup.current = () => {};
    let count = getTourSteps(profile.role, tour).length;
    if (tour === "controls") {
      const collected = collectPageControls(profile.role, pathname, scope);
      controlCleanup.current = collected.cleanup;
      setControlSteps(collected.steps);
      count = collected.steps.length;
    }
    if (!count) return;
    // A feature form or selected record may no longer exist after refresh.
    // Replay its safe opening controls instead of opening an arbitrary record.
    const first = resume && saved && (tour === "quick" || tour === "features" || PAGE_TOUR_IDS.includes(tour as PageTourId)) ? Math.min(saved.step, count - 1) : 0;
    setAutomaticRoute(null);
    setKind(tour); setIndex(first); persist("in_progress", first, tour, getPageTourForRoute(profile.role, pathname)?.id); setMode("tour");
  }
  const visible = Boolean(identity && !loading && allowed && statusLoaded === identity);
  const role = profile?.role;
  const steps = useMemo(() => kind === "controls" ? controlSteps : role ? getTourSteps(role, kind) : [], [role, kind, controlSteps]);
  useEffect(() => {
    if (!visible || !role || mode !== "tour" || automaticRoute || steps[Math.min(index, steps.length - 1)]?.route !== pathname) return;
    const pageTour = getPageTourForRoute(role, pathname);
    // A page already introduced by a manual walkthrough needs no automatic repeat.
    if (pageTour && shouldShowPageTour(savedRef.current, pageTour.id)) persist("in_progress", index, kind, pageTour.id);
    // The ref avoids treating progress saves as a new page presentation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, role, mode, automaticRoute, steps, index, pathname, kind]);
  const workflows = profile ? getWorkflowTours(profile.role) : [];
  const currentPageTour = profile ? getPageTourForRoute(profile.role, pathname) : undefined;
  const fullTourCount = profile ? getTourSteps(profile.role, "features").length : 0;
  const pages = profile ? [...getDashboardNavItems(profile.role), { id: "profile", label: "Profile", href: "/dashboard/profile" }] : [];
  const canResume = saved?.status === "in_progress" && (saved.tour === "quick" || saved.tour === "features" || workflows.some((tour) => tour.id === saved.tour) || (profile && getPageTours(profile.role).some((tour) => tour.id === saved.tour)));
  return <HelpContext.Provider value={() => {
    setAutomaticRoute(null);
    setMode("guide");
  }}>
    {children}
    {visible && inspectRoute && <div role="status" className="fixed bottom-4 right-4 z-[201] rounded-xl bg-white p-4 text-sm text-slate-700 shadow-xl">Opening page guide…</div>}
    {visible && mode === "tour" && (!automaticRoute || automaticRoute === pathname) && steps.length > 0 && <GuidedTour steps={steps} index={Math.min(index, steps.length - 1)} onStep={(step) => { setIndex(step); persist("in_progress", step); }} onExit={close} />}
    {visible && mode === "guide" && <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent data-tour-help overlayClassName="z-[200] motion-reduce:animate-none" className="z-[201] flex max-h-[75dvh] max-w-[min(22rem,calc(100vw-32px))] flex-col gap-3 overflow-hidden rounded-2xl bg-white p-4 text-slate-900 motion-reduce:animate-none sm:max-h-[85dvh] sm:max-w-lg sm:gap-4 sm:p-6" onCloseAutoFocus={(event) => { event.preventDefault(); if (!document.querySelector('[data-tour-dialog]')) document.querySelector<HTMLButtonElement>('[data-tour="help"]')?.focus(); }}>
        <DialogTitle className="shrink-0 pr-6 text-base font-bold sm:text-xl">Help / User Guide</DialogTitle>
        <DialogDescription className="text-xs leading-5 text-slate-600 sm:text-sm sm:leading-relaxed">Replay this page's introduction, take the full walkthrough, or choose a specific task. Guides never save or publish changes.</DialogDescription>
        <div className="flex shrink-0 flex-wrap gap-1.5 sm:gap-2">
          {currentPageTour && <button type="button" className={`${button} bg-blue-600 text-white hover:bg-blue-700`} onClick={() => start(currentPageTour.id)}>Replay this page guide</button>}
          <button type="button" className={`${button} border border-slate-200`} onClick={() => start("features")}>Full walkthrough · {fullTourCount} steps</button>
          {canResume && saved && <button type="button" className={`${button} border border-slate-200`} onClick={() => start(saved.tour, true)}>{saved.tour === "quick" || saved.tour === "features" ? "Resume walkthrough" : "Reopen last guide"}</button>}
          <button type="button" className={`${button} text-slate-600 hover:bg-slate-100`} onClick={() => close()}>Close</button>
        </div>
        {mode === "guide" && <div className="min-h-0 space-y-2 overflow-y-auto overscroll-contain pr-1">
          <h3 className="text-sm font-bold">Help with a specific task</h3>
          {pages.map((page) => <details key={page.id} open={page.href === pathname} className="rounded-xl border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-bold text-slate-900">{page.label}</summary>
            <div className="mt-3 space-y-2">
              {workflows.filter((tour) => tour.route === page.href).map((tour) => <button key={tour.id} type="button" onClick={() => start(tour.id)} className="block w-full rounded-xl border border-blue-100 bg-blue-50/40 p-3 text-left hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                <span className="block text-sm font-semibold text-slate-900">{tour.title}</span><span className="mt-1 block text-xs text-slate-600">{getTourSteps(profile!.role, tour.id).length} steps · optional field reference</span>
              </button>)}
              <details className="rounded-xl border border-slate-200 p-3">
                <summary className="cursor-pointer text-xs font-semibold text-slate-600">Detailed control guide</summary>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">An optional, longer tour of individual buttons, tabs, and filters.</p>
                <button type="button" onClick={() => inspectPage(page.href)} className={`${button} mt-2 w-full border border-blue-200 text-left text-blue-700`}>Explore individual controls</button>
              </details>
            </div>
          </details>)}
          <p className="text-xs leading-relaxed text-slate-500">Use Next to move through each guide. Forms and tabs open automatically. The guide never saves, publishes, or approves changes.</p>
          <details className="rounded-xl border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-bold focus-visible:outline focus-visible:outline-blue-600">Read the user guide</summary>
            <div className="mt-2 space-y-2">
              {getTourSteps(profile!.role, "features").filter((step) => step.id !== "finish").map((step) => <details key={step.id} className="rounded-xl border border-slate-200 p-3">
                <summary className="cursor-pointer text-sm font-semibold focus-visible:outline focus-visible:outline-blue-600">{step.title}</summary>
                <p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-relaxed">{step.description}</p>
              </details>)}
            </div>
          </details>
        </div>}
        {localOnly && <p role="status" className="text-xs text-slate-500">Account sync is unavailable. Progress is saved in this browser when storage is available.</p>}
      </DialogContent>
    </Dialog>}
  </HelpContext.Provider>;
}
