import type { UserRole } from "../types/auth";
import type { TourStep } from "./tutorial";
import { getDashboardNavItems } from "../utils/routes";
import { getPageTourForRoute } from "./tutorialPages";

export function getSidebarTourSteps(role: UserRole, route: string): TourStep[] {
  return [
    ...getDashboardNavItems(role).map((item): TourStep => ({ id: `sidebar-${item.id}`, title: item.label, description: getPageTourForRoute(role, item.href)?.steps[0].description ?? "Open this section from the sidebar.", route, target: `nav-${item.id}`, reveal: ["navigation-open"] })),
    { id: "sidebar-profile", title: "Your profile", description: "Open your profile to review personal details, skills, and availability. You can update the information permitted for your account.", route, target: "sidebar-profile", reveal: ["navigation-open"], openOnNext: "navigation-close" },
    { id: "sidebar-finish", title: "Explore at your own pace", description: "Open a section when you are ready. A short guide will introduce it on your first visit. Help Center keeps all guides available for replay.", route, target: "help" }
  ];
}
