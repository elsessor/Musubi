import type { UserRole } from "@/types/auth";

export function getDashboardRoute(role: UserRole): string {
  const routes: Record<UserRole, string> = {
    Admin: "/admin/dashboard",
    "Student Leader": "/leader/dashboard",
    "Organization Member": "/member/dashboard"
  };

  return routes[role];
}
