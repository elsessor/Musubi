"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getTourSteps, nextTutorialStatus, shouldOfferTutorial, tutorialKey, type TourKind, type TutorialStatus, type TourStep } from "@/config/tutorial";
import { getWorkflowTours } from "@/config/tutorialWorkflows";
import { loadTutorial, saveTutorial } from "@/services/tutorial.service";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { GuidedTour } from "./GuidedTour";
import { collectPageControls } from "./controlGuide";
import { getDashboardNavItems } from "@/utils/routes";

const HelpContext = createContext<() => void>(() => {});
const button = "rounded-xl px-4 py-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

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
  const [mode, setMode] = useState<"welcome" | "guide" | "tour" | null>(null);
  const [kind, setKind] = useState<TourKind>("quick");
  const [inspectRoute, setInspectRoute] = useState<string | null>(null);
  const [controlSteps, setControlSteps] = useState<TourStep[]>([]);
  const controlCleanup = useRef<() => void>(() => {});
  const [index, setIndex] = useState(0);
  const [localOnly, setLocalOnly] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState<string | null>(null);
  const [saved, setSaved] = useState<TutorialStatus | null>(null);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const opened = useRef(new Set<string>());
  const identity = user && profile && user.uid === profile.uid ? tutorialKey(user.uid, profile.role) : null;
  const home = profile?.role === "Admin" ? "/admin" : "/dashboard";
  const allowed = Boolean(profile && (profile.role === "Admin" ? pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/dashboard/profile" : pathname === "/dashboard" || pathname.startsWith("/dashboard/")));

  useEffect(() => {
    controlCleanup.current();
    setMode(null); setStatusLoaded(null); setSaved(null);
    if (!identity || !user || !profile || loading) return;
    let cancelled = false;
    void loadTutorial(user, profile.role).then((result) => {
      if (cancelled) return;
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
    if (!identity || !setupReady || statusLoaded !== identity || loading || !allowed || pathname !== home || !workspaceReady || mode || opened.current.has(identity)) return;
    opened.current.add(identity);
    if (shouldOfferTutorial(saved)) setMode("welcome");
  }, [identity, statusLoaded, loading, allowed, pathname, home, workspaceReady, mode, saved, profile?.role, profile?.onboardingCompleted, profile?.organizationId]);

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
      setKind("controls"); setIndex(0); persist("in_progress", 0, "controls"); setMode("tour"); setInspectRoute(null);
    };
    timer = window.setTimeout(collect, 350);
    return () => window.clearTimeout(timer);
    // A scan belongs to the selected account and route, not profile refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectRoute, pathname, identity]);

  function persist(status: TutorialStatus["status"], step = index, tour = kind) {
    if (!user || !profile || !identity) return;
    const next = nextTutorialStatus(saved, status, step, tour);
    setSaved(next);
    void saveTutorial(user, profile.role, next).then((synced) => {
      if (useAuthStore.getState().firebaseUser?.uid === user.uid) setLocalOnly(!synced);
    });
  }
  function close(complete = false) {
    if (mode !== "guide") persist(complete ? "completed" : "dismissed");
    controlCleanup.current();
    controlCleanup.current = () => {};
    setMode(null);
    setInspectRoute(null);
  }
  function inspectPage(route: string) {
    if (!profile || ![...getDashboardNavItems(profile.role).map((item) => item.href), "/dashboard/profile"].includes(route)) return;
    if (identity) opened.current.add(identity);
    setMode(null); setInspectRoute(route);
    if (pathname !== route) router.push(route);
  }
  function start(tour: TourKind, resume = false, scope?: Element | null) {
    if (!profile) return;
    // Stored or manually supplied tour IDs never grant a role access to a workflow.
    if (!["quick", "features", "controls"].includes(tour) && !getWorkflowTours(profile.role).some((item) => item.id === tour)) return;
    if (identity) opened.current.add(identity);
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
    const first = resume && saved && (tour === "quick" || tour === "features") ? Math.min(saved.step, count - 1) : 0;
    setKind(tour); setIndex(first); persist("in_progress", first, tour); setMode("tour");
  }
  const visible = Boolean(identity && !loading && allowed && statusLoaded === identity);
  const role = profile?.role;
  const steps = useMemo(() => kind === "controls" ? controlSteps : role ? getTourSteps(role, kind) : [], [role, kind, controlSteps]);
  const workflows = profile ? getWorkflowTours(profile.role) : [];
  const pages = profile ? [...getDashboardNavItems(profile.role), { id: "profile", label: "Profile", href: "/dashboard/profile" }] : [];
  const canResume = saved?.status === "in_progress" && (saved.tour === "quick" || saved.tour === "features" || workflows.some((tour) => tour.id === saved.tour));
  return <HelpContext.Provider value={() => {
    if (identity) opened.current.add(identity);
    setMode("guide");
  }}>
    {children}
    {visible && inspectRoute && <div role="status" className="fixed bottom-4 right-4 z-[201] rounded-xl bg-white p-4 text-sm text-slate-700 shadow-xl">Opening page guide…</div>}
    {visible && mode === "tour" && steps.length > 0 && <GuidedTour steps={steps} index={Math.min(index, steps.length - 1)} onStep={(step) => { setIndex(step); persist("in_progress", step); }} onExit={close} />}
    {visible && (mode === "welcome" || mode === "guide") && <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent data-tour-help overlayClassName="z-[200] motion-reduce:animate-none" className="z-[201] max-h-[85dvh] overflow-y-auto rounded-2xl bg-white text-slate-900 motion-reduce:animate-none" onCloseAutoFocus={(event) => { event.preventDefault(); if (!document.querySelector('[data-tour-dialog]')) document.querySelector<HTMLButtonElement>('[data-tour="help"]')?.focus(); }}>
        <DialogTitle className="pr-6 text-xl font-bold">{mode === "welcome" ? "Welcome to Musubi!" : "Help / User Guide"}</DialogTitle>
        <DialogDescription className="text-sm leading-relaxed text-slate-600">{mode === "welcome"
          ? "Musubi helps campus organizations organize goals, coordinate tasks, and manage responsibilities through AI-assisted task orchestration and workflow management. Let's take a quick tour of your workspace."
          : `Explore the tools available to you as ${profile?.role === "Admin" ? "a System Administrator" : profile?.role === "Student Leader" ? "a Student Leader" : "an Organization Member"}. Tours explain features without changing your organization or task records.`}</DialogDescription>
        {mode === "guide" && <div className="space-y-2">
          <h3 className="text-sm font-bold">Choose a tab to learn</h3>
          {pages.map((page) => <details key={page.id} open={page.href === pathname} className="rounded-xl border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-bold text-slate-900">{page.label}</summary>
            <div className="mt-3 space-y-2">
              <button type="button" onClick={() => inspectPage(page.href)} className={`${button} w-full border border-blue-200 text-left text-blue-700`}>Explain buttons, tabs, and filters</button>
              {workflows.filter((tour) => tour.route === page.href).map((tour) => <button key={tour.id} type="button" onClick={() => start(tour.id)} className="block w-full rounded-xl border border-blue-100 bg-blue-50/40 p-3 text-left hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                <span className="block text-sm font-semibold text-slate-900">{tour.title}</span><span className="mt-1 block text-xs leading-relaxed text-slate-600">{tour.description}</span>
              </button>)}
            </div>
          </details>)}
          <p className="text-xs leading-relaxed text-slate-500">Select a tab or workflow here. Next opens safe forms and tabs automatically, then explains their contents. Saving, publishing, approval, and destructive actions are explained without submitting changes.</p>
          <h3 className="pt-3 text-sm font-bold">Read the user guide</h3>
          {getTourSteps(profile!.role, "features").filter((step) => step.id !== "finish").map((step) => <details key={step.id} className="rounded-xl border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-semibold focus-visible:outline focus-visible:outline-blue-600">{step.title}</summary>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
          </details>)}
        </div>}
        {localOnly && <p role="status" className="text-xs text-slate-500">Account sync is unavailable. Progress is saved in this browser when storage is available.</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={`${button} bg-blue-600 text-white hover:bg-blue-700`} onClick={() => start("quick")}>{mode === "welcome" ? "Start Tutorial" : "Restart Guided Tour"}</button>
          {canResume && saved && <button type="button" className={`${button} border border-slate-200`} onClick={() => start(saved.tour, true)}>{saved.tour === "quick" || saved.tour === "features" ? "Resume Tutorial" : "Reopen last feature guide"}</button>}
          {mode === "guide" && <button type="button" className={`${button} border border-slate-200`} onClick={() => start("features")}>Feature Walkthrough</button>}
          <button type="button" className={`${button} text-slate-600 hover:bg-slate-100`} onClick={() => close()}>{mode === "welcome" ? "Maybe Later" : "Close"}</button>
        </div>
      </DialogContent>
    </Dialog>}
  </HelpContext.Provider>;
}
