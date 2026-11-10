"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getTourSteps, nextTutorialStatus, restartedTutorialStatus, tutorialKey, type TourKind, type TutorialStatus, type TourStep } from "@/config/tutorial";
import { getPageTourForRoute, PAGE_TOUR_IDS, type PageTourId } from "@/config/tutorialPages";
import { getSidebarTourSteps } from "@/config/tutorialSidebar";
import { isFinished, onboardingProgress, sectionProgress, updateSection, type OnboardingProgress, type OnboardingSection } from "@/config/onboardingProgress";
import { loadTutorial, saveTutorial } from "@/services/tutorial.service";
import { getDashboardNavItems } from "@/utils/routes";
import { GuidedTour } from "./GuidedTour";
import { collectPageControls } from "./controlGuide";
import { findTourHighlightTargets } from "./tourTargets";
import { GetStarted } from "./GetStarted";
import { HelpCenter } from "./HelpCenter";
import { WelcomeOnboarding } from "./WelcomeOnboarding";

const HelpContext = createContext<(view?: "guide" | "started", tour?: TourKind) => void>(() => {});
type Run = { section?: OnboardingSection; context?: string; automatic: boolean; restart?: boolean };

export function TutorialHelpButton() {
  const open = useContext(HelpContext);
  return <button type="button" data-tour-help data-tour="help" onClick={() => open()} title="Help / User Guide" aria-label="Help / User Guide" className="inline-flex shrink-0 items-center gap-2 rounded-xl p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"><CircleHelp className="size-5" /><span className="hidden text-xs font-semibold lg:inline">Help / User Guide</span></button>;
}

export function TutorialContextualHelp({ tour, label }: { tour: TourKind; label: string }) {
  const open = useContext(HelpContext);
  const role = useAuthStore((state) => state.profile?.role);
  if (!role || !getTourSteps(role, tour).length) return null;
  return <button type="button" data-tour-help onClick={() => open("guide", tour)} title={label} aria-label={label} className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"><CircleHelp aria-hidden="true" className="size-4" /></button>;
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.firebaseUser);
  const loading = useAuthStore((s) => s.loading);
  const pathname = usePathname();
  const router = useRouter();
  const [mode, setMode] = useState<"welcome" | "started" | "guide" | "tour" | null>(null);
  const [kind, setKind] = useState<TourKind>("quick");
  const [index, setIndex] = useState(0);
  const [run, setRun] = useState<Run | null>(null);
  const [sidebarRoute, setSidebarRoute] = useState(pathname);
  const [automaticSteps, setAutomaticSteps] = useState<TourStep[] | null>(null);
  const [controlSteps, setControlSteps] = useState<TourStep[]>([]);
  const [initialHelpTour, setInitialHelpTour] = useState<TourKind | null>(null);
  const [inspectRoute, setInspectRoute] = useState<string | null>(null);
  const controlCleanup = useRef<() => void>(() => {});
  const [saved, setSaved] = useState<TutorialStatus | null>(null);
  const savedRef = useRef<TutorialStatus | null>(null);
  const [statusLoaded, setStatusLoaded] = useState<string | null>(null);
  const [localOnly, setLocalOnly] = useState(false);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [targetSignature, setTargetSignature] = useState("");
  const [eventId, setEventId] = useState<string | null>(null);
  const quietContext = useRef<string | null>(null);
  const identity = user && profile && user.uid === profile.uid ? tutorialKey(user.uid, profile.role) : null;
  const pageContext = pathname === "/dashboard/events" && eventId ? "event" : undefined;
  const contextKey = pageContext ? `${pathname}:event:${eventId}` : pathname;
  const preview = Boolean(profile && profile.role !== "Admin" && !profile.organizationId?.trim());
  const allowed = Boolean(profile && (profile.role === "Admin" ? pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/dashboard/profile" : pathname === "/dashboard" || pathname.startsWith("/dashboard/")));
  const visible = Boolean(identity && !loading && allowed && statusLoaded === identity);
  const role = profile?.role;
  const steps = useMemo(() => automaticSteps ?? (kind === "controls" ? controlSteps : kind === "sidebar" && role ? getSidebarTourSteps(role, sidebarRoute) : role ? getTourSteps(role, kind, preview) : []), [automaticSteps, kind, controlSteps, role, sidebarRoute, preview]);

  useEffect(() => {
    controlCleanup.current();
    setMode(null); setRun(null); setInspectRoute(null); setAutomaticSteps(null); setStatusLoaded(null); setSaved(null); savedRef.current = null; quietContext.current = null;
    if (!identity || !user || !profile || loading) return;
    let cancelled = false;
    void loadTutorial(user, profile.role).then((result) => {
      if (cancelled) return;
      savedRef.current = result.status;
      setSaved(result.status); setLocalOnly(result.localOnly); setStatusLoaded(identity);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, loading]);

  useEffect(() => {
    const check = () => {
      const el = document.querySelector('[data-tour="workspace"]');
      const selectedEvent = el?.querySelector('[data-tour="event-workspace"]')?.getAttribute("data-event-id") || null;
      setEventId(selectedEvent);
      const page = role && getPageTourForRoute(role, pathname, selectedEvent ? "event" : undefined);
      setTargetSignature(page && role ? getTourSteps(role, page.id).filter((step) => step.reveal?.length || findTourHighlightTargets(step).length).map((step) => step.id).join(":") : "");
      setWorkspaceReady(el?.getAttribute("data-tutorial-ready") === "true" && el?.getAttribute("data-tutorial-role") === role && !document.querySelector('[role="dialog"], [role="alertdialog"]'));
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-tutorial-ready", "data-tutorial-role", "data-event-id"] });
    return () => observer.disconnect();
  }, [pathname, role]);

  useEffect(() => {
    // Suppress another popup only for the visit where a guide was closed.
    if (quietContext.current !== contextKey) quietContext.current = null;
  }, [contextKey]);

  useEffect(() => {
    if (!visible || !profile || !workspaceReady || mode || inspectRoute || quietContext.current === contextKey) return;
    const progress = onboardingProgress(savedRef.current);
    if (!progress.preference) {
      persist("in_progress", 0, "quick", "welcome");
      setRun({ context: contextKey, automatic: true }); setMode("welcome");
      return;
    }
    if (progress.preference.mode !== "guided") return;
    if (!isFinished(progress.sidebar)) { startSidebar(true, true); return; }
    const page = getPageTourForRoute(profile.role, pathname, pageContext);
    if (!page || isFinished(progress.modules?.[page.id])) return;
    const available = getTourSteps(profile.role, page.id, preview).filter((step) => step.reveal?.length || findTourHighlightTargets(step).length);
    if (!available.length) return;
    const first = Math.min(progress.modules?.[page.id]?.step ?? 0, available.length - 1);
    setAutomaticSteps(available); setKind(page.id); setIndex(first); setRun({ section: page.id, context: contextKey, automatic: true });
    persist("in_progress", first, page.id, page.id); setMode("tour");
    // Progress refs avoid restarting a tour when a write refreshes the profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, workspaceReady, targetSignature, mode, inspectRoute, contextKey, pathname, pageContext, profile?.role, preview]);

  useEffect(() => {
    if (run?.context && run.context !== contextKey) {
      if (mode === "tour" && visible) persist("in_progress", index, kind, run.section);
      setMode(null); setRun(null); setAutomaticSteps(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey, run?.context]);
  useEffect(() => { if (!allowed) setMode(null); }, [allowed]);
  useEffect(() => () => controlCleanup.current(), []);

  useEffect(() => {
    if (!inspectRoute || pathname !== inspectRoute || !profile || !identity) return;
    const timeout = Date.now() + 6000;
    let timer: number;
    const collect = () => {
      if (document.querySelector('[data-tour="workspace"]')?.getAttribute("data-tutorial-ready") !== "true" && Date.now() < timeout) { timer = window.setTimeout(collect, 150); return; }
      controlCleanup.current();
      const result = collectPageControls(profile.role, inspectRoute);
      controlCleanup.current = result.cleanup;
      setControlSteps(result.steps.length ? result.steps : [{ id: "empty-page", route: inspectRoute, target: "workspace", title: "This page", description: "This page has no available controls. Features appear when they become accessible to your account." }]);
      setKind("controls"); setIndex(0); persist("in_progress", 0, "controls"); setRun({ automatic: false }); setMode("tour"); setInspectRoute(null);
    };
    timer = window.setTimeout(collect, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectRoute, pathname, identity]);

  function write(next: TutorialStatus) {
    if (!user || !profile || !identity) return;
    savedRef.current = next; setSaved(next);
    void saveTutorial(user, profile.role, next).then((synced) => {
      if (useAuthStore.getState().firebaseUser?.uid === user.uid && useAuthStore.getState().profile?.role === profile.role) setLocalOnly(!synced);
    });
  }
  function persist(status: TutorialStatus["status"], step = index, tour = kind, section?: OnboardingSection, override?: OnboardingProgress) {
    const next = nextTutorialStatus(savedRef.current, status, step, tour);
    const progress = override ?? onboardingProgress(savedRef.current);
    next.onboarding = section ? updateSection(progress, section, status, step) : progress;
    if (section && PAGE_TOUR_IDS.includes(section as PageTourId) && status !== "in_progress") next.seenPages = [...new Set([...(next.seenPages ?? []), section as PageTourId])];
    write(next);
  }
  function close(complete = false) {
    if (mode === "welcome") { dismissWelcome(); return; }
    if (mode === "tour") persist(complete ? "completed" : "dismissed", index, kind, run?.section);
    quietContext.current = complete && run?.section === "sidebar" && savedRef.current?.onboarding?.restartedAt ? null : contextKey;
    controlCleanup.current(); controlCleanup.current = () => {};
    setMode(null); setRun(null); setAutomaticSteps(null); setInspectRoute(null);
  }
  function startSidebar(automatic = false, resume = false, progress?: OnboardingProgress) {
    if (!profile) return;
    const first = resume ? Math.min(sectionProgress(progress ?? onboardingProgress(savedRef.current), "sidebar")?.step ?? 0, getSidebarTourSteps(profile.role, pathname).length - 1) : 0;
    controlCleanup.current(); controlCleanup.current = () => {};
    setAutomaticSteps(null); setSidebarRoute(pathname); setKind("sidebar"); setIndex(first); setRun({ section: "sidebar", context: contextKey, automatic });
    persist("in_progress", first, "sidebar", "sidebar", progress); setMode("tour");
  }
  function acceptWelcome() {
    const progress = updateSection(onboardingProgress(savedRef.current), "welcome", "completed");
    startSidebar(true, false, { ...progress, preference: { mode: "guided", source: "user", updatedAt: new Date().toISOString() } });
  }
  function dismissWelcome() {
    const progress = updateSection(onboardingProgress(savedRef.current), "welcome", "dismissed");
    persist("dismissed", 0, "quick", undefined, { ...progress, preference: { mode: "independent", source: "user", updatedAt: new Date().toISOString() } });
    quietContext.current = contextKey; setMode(null); setRun(null);
  }
  function restartOnboarding() {
    controlCleanup.current(); controlCleanup.current = () => {};
    write(restartedTutorialStatus(savedRef.current));
    quietContext.current = null; setKind("quick"); setIndex(0); setInspectRoute(null);
    setAutomaticSteps(null); setRun({ context: contextKey, automatic: false, restart: true }); setMode("started");
  }
  function continueRestart() {
    setRun({ context: contextKey, automatic: false }); setMode("welcome");
  }
  function inspectPage(route: string) {
    if (!profile || ![...getDashboardNavItems(profile.role).map((item) => item.href), "/dashboard/profile"].includes(route)) return;
    setMode(null); setRun(null); setAutomaticSteps(null); setInspectRoute(route);
    if (pathname !== route) router.push(route);
  }
  function start(tour: TourKind, resume = false) {
    if (!profile || (tour === "page-event-details" && pageContext !== "event") || !getTourSteps(profile.role, tour).length) return;
    if (tour === "sidebar") { startSidebar(false, resume); return; }
    controlCleanup.current(); controlCleanup.current = () => {};
    const first = resume && saved && (tour === "quick" || tour === "features" || PAGE_TOUR_IDS.includes(tour as PageTourId)) ? Math.min(saved.step, getTourSteps(profile.role, tour).length - 1) : 0;
    const section = PAGE_TOUR_IDS.includes(tour as PageTourId) ? tour as PageTourId : undefined;
    setAutomaticSteps(null); setKind(tour); setIndex(first); setRun({ section, automatic: false });
    persist("in_progress", first, tour, section); setMode("tour");
  }
  const currentPageTour = profile ? getPageTourForRoute(profile.role, pathname, pageContext) : undefined;
  const canResume = saved?.status === "in_progress" && saved.tour !== "controls" && profile && getTourSteps(profile.role, saved.tour).length > 0 && (saved.tour !== "page-event-details" || pageContext === "event");
  return <HelpContext.Provider value={(view = "guide", tour) => {
    if (tour && (!profile || !getTourSteps(profile.role, tour).length || (tour === "page-event-details" && pageContext !== "event"))) return;
    if (mode === "tour") persist("in_progress", index, kind, run?.section);
    controlCleanup.current(); controlCleanup.current = () => {};
    setInitialHelpTour(tour ?? null); setRun(null); setAutomaticSteps(null); setMode(view);
  }}>
    {children}
    {visible && inspectRoute && <div role="status" className="fixed bottom-4 right-4 z-[201] rounded-xl bg-white p-4 text-sm text-slate-700 shadow-xl">Opening page guide…</div>}
    {visible && mode === "welcome" && (!run?.context || run.context === contextKey) && <WelcomeOnboarding name={profile!.fullName} admin={profile!.role === "Admin"} onStart={acceptWelcome} onDismiss={dismissWelcome} />}
    {visible && mode === "tour" && (!run?.context || run.context === contextKey) && steps.length > 0 && <GuidedTour steps={steps} index={Math.min(index, steps.length - 1)} skipUnavailable={run?.automatic} onStep={(step) => { setIndex(step); persist("in_progress", step, kind, run?.section); }} onExit={close} />}
    {visible && mode === "started" && <GetStarted role={profile!.role} hasOrganization={!preview} onClose={close} onContinue={run?.restart ? continueRestart : undefined} onWalkthrough={run?.restart ? continueRestart : () => start("features")} onPageGuide={currentPageTour ? () => start(currentPageTour.id) : undefined} onHelp={() => { setRun(null); setInitialHelpTour(null); setMode("guide"); }} onOrganization={() => { close(); router.push("/dashboard/organization"); }} />}
    {visible && mode === "guide" && <HelpCenter key={initialHelpTour ?? "home"} role={profile!.role} preview={preview} eventOpen={pageContext === "event"} initialTour={initialHelpTour} currentPageTour={currentPageTour?.id} resumeTour={canResume && saved ? saved.tour : undefined} localOnly={localOnly} onClose={close} onStart={start} onInspect={inspectPage} onGetStarted={() => { setRun(null); setMode("started"); }} onSidebar={() => startSidebar()} onRestart={restartOnboarding} />}
  </HelpContext.Provider>;
}
