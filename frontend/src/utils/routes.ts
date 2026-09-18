import type { AuthUserProfile, UserRole } from "@/types/auth";
import type { DashboardNavItem } from "@/types/dashboard";

export function getDashboardRoute(role: UserRole): string {
  return role === "Admin" ? "/admin" : "/dashboard";
}

export function getPostAuthenticationRoute(user: AuthUserProfile): string {
  return user.onboardingCompleted || user.organizationId ? getDashboardRoute(user.role) : "/onboarding";
}

export function getDashboardNavItems(role: UserRole): DashboardNavItem[] {
  if (role === "Admin") {
    return [
      { id: "dashboard", label: "Dashboard", href: "/admin" },
      { id: "organizations", label: "Organizations", href: "/admin/organizations" },
      { id: "org-requests", label: "Org Requests", href: "/admin/org-requests" },
      { id: "members", label: "All Members", href: "/admin/members" },
      { id: "audit-logs", label: "Audit Logs", href: "/admin/audit-logs" },
      { id: "settings", label: "Settings", href: "/admin/settings" }
    ];
  }

  const baseItems: DashboardNavItem[] = [
    { id: "dashboard", label: "Dashboard", href: "/dashboard" },
    { id: "events", label: "Events & Tasks", href: "/dashboard/events" },
    { id: "organization", label: "Organization", href: "/dashboard/organization" },
    { id: "notifications", label: "Notifications", href: "/dashboard/notifications" },
    { id: "settings", label: "Settings", href: "/dashboard/settings" }
  ];

  return role === "Student Leader"
    ? [
        ...baseItems.slice(0, 3),
        { id: "analytics", label: "Analytics", href: "/dashboard/analytics" },
        { id: "audit-logs", label: "Audit Logs", href: "/dashboard/audit-logs" },
        ...baseItems.slice(3)
      ]
    : baseItems;
}
