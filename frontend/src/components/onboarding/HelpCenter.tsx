"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, BarChart3, Bell, BookOpen, Building2, CalendarDays, ChevronRight, Compass, LayoutDashboard, ListChecks, MoreHorizontal, Play, Search, Settings, ShieldCheck, UserRound, Users, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getHelpCategories, searchHelp, type HelpCategory, type HelpGuide } from "@/config/helpCenter";
import { getTourSteps, type TourKind } from "@/config/tutorial";
import type { UserRole } from "@/types/auth";

type View = { type: "home" } | { type: "category"; categoryId: string } | { type: "guide"; categoryId: string; guideId: string; fromSearch: boolean } | { type: "reference" };
type Props = {
  role: UserRole;
  preview: boolean;
  eventOpen: boolean;
  initialTour?: TourKind | null;
  currentPageTour?: TourKind;
  resumeTour?: TourKind;
  localOnly: boolean;
  onClose: () => void;
  onStart: (tour: TourKind, resume?: boolean) => void;
  onInspect: (route: string) => void;
  onGetStarted: () => void;
  onSidebar: () => void;
  onRestart: () => void;
};
const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600";
const primary = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 ${focus}`;
const icons: Record<string, typeof BookOpen> = { dashboard: LayoutDashboard, events: CalendarDays, organization: Users, organizations: Building2, "org-requests": ListChecks, members: Users, analytics: BarChart3, "audit-logs": ShieldCheck, notifications: Bell, settings: Settings, profile: UserRound };

function TopicRow({ title, description, icon, onClick }: { title: string; description?: string; icon?: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`flex min-h-12 w-full min-w-0 items-center gap-3 rounded-lg px-2 py-3 text-left hover:bg-slate-50 ${focus}`}>
    {icon && <span className="shrink-0 text-slate-500">{icon}</span>}
    <span className="min-w-0 flex-1"><span className="block break-words text-sm font-medium text-slate-900">{title}</span>{description && <span className="mt-1 block break-words text-xs leading-5 text-slate-500">{description}</span>}</span>
    <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
  </button>;
}

function CategoryList({ categories, onSelect }: { categories: HelpCategory[]; onSelect: (id: string) => void }) {
  return <nav aria-label="Help topics" className="divide-y divide-slate-100">{categories.map((category) => {
    const Icon = icons[category.id] ?? BookOpen;
    return <TopicRow key={category.id} title={category.title} icon={<Icon aria-hidden="true" className="size-5" />} onClick={() => onSelect(category.id)} />;
  })}</nav>;
}

export function HelpCenter({ role, preview, eventOpen, initialTour, currentPageTour, resumeTour, localOnly, onClose, onStart, onInspect, onGetStarted, onSidebar, onRestart }: Props) {
  const categories = useMemo(() => getHelpCategories(role, preview, eventOpen), [role, preview, eventOpen]);
  const [view, setView] = useState<View>(() => {
    const category = initialTour && categories.find((item) => item.guides.some((guide) => guide.tour === initialTour));
    return category ? { type: "guide", categoryId: category.id, guideId: initialTour!, fromSearch: false } : { type: "home" };
  });
  const [query, setQuery] = useState("");
  const searchId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const results = useMemo(() => searchHelp(categories, query), [categories, query]);
  const category = "categoryId" in view ? categories.find((item) => item.id === view.categoryId) : undefined;
  const guide = view.type === "guide" ? category?.guides.find((item) => item.id === view.guideId) : undefined;
  const searching = Boolean(query.trim());
  const title = view.type === "home" ? "Help Center" : view.type === "reference" ? "User guide" : guide?.title ?? category?.title ?? "Help Center";
  const description = view.type === "home" ? "How can we help you?" : view.type === "reference" ? "Read an overview of the main sections." : guide?.description ?? category?.description ?? "Browse help topics.";
  useEffect(() => {
    if (content.current) content.current.scrollTop = 0;
    if (mounted.current) heading.current?.focus({ preventScroll: true });
    mounted.current = true;
  }, [view]);

  function back() {
    if (view.type === "guide") setView(view.fromSearch ? { type: "home" } : { type: "category", categoryId: view.categoryId });
    else setView({ type: "home" });
  }
  function openGuide(selected: HelpGuide, selectedCategory: HelpCategory, fromSearch = false) {
    setView({ type: "guide", categoryId: selectedCategory.id, guideId: selected.id, fromSearch });
  }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent data-tour-help overlayClassName="z-[200] motion-reduce:animate-none" className="inset-y-0 left-auto right-0 z-[201] flex h-dvh max-h-dvh w-full max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 border-l border-slate-200 bg-white p-0 text-slate-900 motion-reduce:animate-none sm:max-w-md [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-lg [&>button]:right-3 [&>button]:top-3" onCloseAutoFocus={(event) => { event.preventDefault(); if (!document.querySelector('[data-tour-dialog]')) document.querySelector<HTMLButtonElement>('[data-tour="help"]')?.focus(); }}>
      <header className="shrink-0 border-b border-slate-100 px-4 pb-4 pt-5 sm:px-6">
        <div className="flex min-w-0 items-start gap-2 pr-12">
          {view.type !== "home" && <button type="button" onClick={back} aria-label={view.type === "guide" && !view.fromSearch ? `Back to ${category?.title ?? "category"}` : "Back to Help Center"} className={`-ml-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 ${focus}`}><ArrowLeft aria-hidden="true" className="size-5" /></button>}
          <div className="min-w-0 flex-1"><DialogTitle ref={heading} tabIndex={-1} className="break-words text-lg font-semibold leading-6 outline-none">{title}</DialogTitle><DialogDescription className="mt-1.5 break-words text-xs leading-5 text-slate-500">{description}</DialogDescription></div>
        </div>
        {view.type === "home" && <div className="relative mt-4">
          <label htmlFor={searchId} className="sr-only">Search help topics</label><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" />
          <input id={searchId} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search help topics..." autoComplete="off" className="min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 [&::-webkit-search-cancel-button]:appearance-none" />
          {query && <button type="button" aria-label="Clear search" onClick={() => { setQuery(""); document.getElementById(searchId)?.focus(); }} className={`absolute right-0 top-0 flex size-11 items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 ${focus}`}><X aria-hidden="true" className="size-4" /></button>}
        </div>}
        {view.type === "home" && <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={() => onStart("quick")} className={`${primary} flex-1`}><Play aria-hidden="true" className="size-4" />Start Quick Tour</button>
          <DropdownMenu modal={false}><DropdownMenuTrigger asChild><button type="button" aria-label="More help options" className={`flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 ${focus}`}><MoreHorizontal aria-hidden="true" className="size-5" /></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="z-[220] max-h-[var(--radix-dropdown-menu-content-available-height)] max-w-[calc(100vw-2rem)] rounded-xl border-slate-200 bg-white p-1.5 text-slate-700 shadow-lg">
            <DropdownMenuItem onSelect={onGetStarted} className="min-h-11 rounded-lg"><Compass aria-hidden="true" />Get Started</DropdownMenuItem>
            <DropdownMenuItem onSelect={onSidebar} className="min-h-11 rounded-lg">Replay sidebar introduction</DropdownMenuItem>
            <DropdownMenuItem onSelect={onRestart} className="min-h-11 rounded-lg">Restart onboarding</DropdownMenuItem>
            {currentPageTour && <DropdownMenuItem onSelect={() => onStart(currentPageTour)} className="min-h-11 rounded-lg">Replay this page guide</DropdownMenuItem>}
            <DropdownMenuItem onSelect={() => onStart("features")} className="min-h-11 rounded-lg">Full Walkthrough</DropdownMenuItem>
            {resumeTour && <DropdownMenuItem onSelect={() => onStart(resumeTour, true)} className="min-h-11 rounded-lg">{resumeTour === "quick" || resumeTour === "features" ? "Resume walkthrough" : "Reopen last guide"}</DropdownMenuItem>}
            <DropdownMenuItem onSelect={() => setView({ type: "reference" })} className="min-h-11 rounded-lg">Read the user guide</DropdownMenuItem>
          </DropdownMenuContent></DropdownMenu>
        </div>}
      </header>
      <div ref={content} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
        {view.type === "home" && (searching ? <section aria-label="Search results">
          <p role="status" aria-live="polite" className="mb-2 text-xs font-medium text-slate-500">{results.length ? `${results.length} matching ${results.length === 1 ? "topic" : "topics"}` : "No matching topics"}</p>
          {results.length ? <div className="divide-y divide-slate-100">{results.map(({ category: match, guide: matchGuide }) => <TopicRow key={`${match.id}:${matchGuide?.id ?? "category"}`} title={matchGuide?.title ?? match.title} description={matchGuide ? `${match.title} · ${matchGuide.description}` : "Browse category"} onClick={() => matchGuide ? openGuide(matchGuide, match, true) : setView({ type: "category", categoryId: match.id })} />)}</div> : <div className="py-6"><p className="text-sm font-medium text-slate-800">Try a feature or task name</p><p className="mt-2 text-xs leading-5 text-slate-500">Search for terms such as filters, notifications, or assignments. You can also clear your search to browse categories.</p><button type="button" onClick={() => setQuery("")} className={`mt-3 min-h-11 rounded-lg px-2 text-sm font-medium text-blue-700 hover:bg-blue-50 ${focus}`}>Browse all topics</button></div>}
        </section> : <section aria-label="Browse Help Topics"><h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Browse Help Topics</h2><CategoryList categories={categories} onSelect={(categoryId) => setView({ type: "category", categoryId })} /></section>)}
        {view.type === "category" && category && <nav aria-label={`${category.title} guides`} className="divide-y divide-slate-100">{category.guides.map((item) => <TopicRow key={item.id} title={item.title} description={item.stepCount ? `${item.stepCount} steps` : "Explore the controls on this page"} onClick={() => openGuide(item, category)} />)}</nav>}
        {view.type === "guide" && guide && <section aria-label="Guide details" className="space-y-5">
          <div className="flex items-center gap-2 text-xs text-slate-500"><BookOpen aria-hidden="true" className="size-4" /><span>{guide.stepCount ? `${guide.stepCount} steps · Interactive walkthrough` : "Interactive control guide"}</span></div>
          <p className="text-sm leading-6 text-slate-600">{guide.tour ? "Follow the highlighted areas and use the arrows to continue. Field details are available where relevant. You may skip or finish the guide at any time." : "The guide opens this page and explains its available buttons, tabs, filters, and fields."}</p>
          {preview && <p className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">You can explore preview layouts before joining an organization. Organization information and actions become available after membership approval.</p>}
          <button type="button" onClick={() => guide.tour ? onStart(guide.tour) : onInspect(guide.route)} className={primary}>{initialTour && initialTour === guide.tour ? "Show me how" : "Start walkthrough"}<ArrowRight aria-hidden="true" className="size-4" /></button>
          <p className="text-xs leading-5 text-slate-500">Guides do not save, publish, approve, or submit changes.</p>
        </section>}
        {view.type === "reference" && <div className="divide-y divide-slate-100">{getTourSteps(role, "features", preview).filter((step) => step.id !== "finish").map((step) => <article key={step.id} className="py-4 first:pt-0"><h2 className="text-sm font-semibold text-slate-900">{step.title}</h2><p className="mt-2 text-xs leading-5 text-slate-600">{step.description}</p></article>)}</div>}
      </div>
      {localOnly && <p role="status" className="shrink-0 border-t border-slate-100 px-4 py-3 text-xs leading-5 text-slate-500 sm:px-6">Account sync is unavailable. Progress is retained in this browser when storage is available.</p>}
    </DialogContent>
  </Dialog>;
}
