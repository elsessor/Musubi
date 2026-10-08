export type AdminAccountStatus = "Active" | "Pending Join Request" | "Onboarding" | "Inactive";

export function getAdminAccountStatus(
  user: { onboardingCompleted?: unknown; accountStatus?: unknown; inviteStatus?: unknown },
  hasPendingJoinRequest: boolean
): AdminAccountStatus {
  if (user.accountStatus === "Inactive" || user.inviteStatus === "Inactive") return "Inactive";
  if (hasPendingJoinRequest) return "Pending Join Request";
  return user.onboardingCompleted === true ? "Active" : "Onboarding";
}
