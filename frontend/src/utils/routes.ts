import type { UserRole } from "@/types/auth";

export function getDashboardRoute(role: UserRole): string {
  return "/dashboard";
}
