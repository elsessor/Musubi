import type { AuthUserProfile, UserRole } from "@/types/auth";

export function getDashboardRoute(role: UserRole): string {
  return "/dashboard";
}

export function getPostAuthenticationRoute(user: AuthUserProfile): string {
  return user.onboardingCompleted || user.organizationId ? getDashboardRoute(user.role) : "/onboarding";
}
