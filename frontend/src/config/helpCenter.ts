import type { UserRole } from "../types/auth";
import { getDashboardNavItems } from "../utils/routes";
import { getTourSteps, type TourKind } from "./tutorial";
import { getPageTourForRoute } from "./tutorialPages";
import { getWorkflowTours } from "./tutorialWorkflows";

export type HelpGuide = {
  id: string;
  title: string;
  description: string;
  route: string;
  tour?: TourKind;
  stepCount?: number;
};
export type HelpCategory = { id: string; title: string; description: string; route: string; guides: HelpGuide[] };
export type HelpSearchResult = { category: HelpCategory; guide?: HelpGuide };

// Build the help catalog from the same definitions and permissions as the tours.
export function getHelpCategories(role: UserRole, preview = false, eventOpen = false): HelpCategory[] {
  const workflows = getWorkflowTours(role);
  const pages = [...getDashboardNavItems(role), { id: "profile", label: "Profile", href: "/dashboard/profile" }];
  return pages.map((page) => {
    const intro = getPageTourForRoute(role, page.href);
    const introSteps = intro ? getTourSteps(role, intro.id, preview) : [];
    const guides: HelpGuide[] = intro ? [{ id: intro.id, title: intro.title, description: introSteps[0].description, route: intro.route, tour: intro.id, stepCount: introSteps.length }] : [];
    if (eventOpen && page.id === "events") {
      const eventIntro = getPageTourForRoute(role, page.href, "event");
      if (eventIntro) {
        const steps = getTourSteps(role, eventIntro.id, preview);
        guides.push({ id: eventIntro.id, title: eventIntro.title, description: steps[0].description, route: eventIntro.route, tour: eventIntro.id, stepCount: steps.length });
      }
    }
    guides.push(...workflows.filter((tour) => tour.route === page.href).map((tour) => ({
      id: tour.id, title: tour.title, description: tour.description, route: tour.route, tour: tour.id,
      stepCount: getTourSteps(role, tour.id, preview).length
    })));
    guides.push({ id: `controls-${page.id}`, title: "Detailed control guide", description: "Explore the buttons, tabs, filters, and fields available on this page.", route: page.href });
    return { id: page.id, title: page.label, description: introSteps[0]?.description ?? "Explore the features and controls available in this section.", route: page.href, guides };
  });
}

export function searchHelp(categories: HelpCategory[], query: string): HelpSearchResult[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const matches = (value: string) => terms.every((term) => value.toLocaleLowerCase().includes(term));
  return categories.flatMap((category) => {
    const results: HelpSearchResult[] = matches(`${category.title} ${category.description}`) ? [{ category }] : [];
    for (const guide of category.guides) {
      if (matches(`${category.title} ${guide.title} ${guide.description}`)) results.push({ category, guide });
    }
    return results;
  });
}
