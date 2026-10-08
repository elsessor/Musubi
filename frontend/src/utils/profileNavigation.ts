export function getProfileReturnPath(value: string | null): string {
  const fallback = "/dashboard/organization?tab=members";
  if (!value?.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, "https://profile.local");
    if (url.origin !== "https://profile.local") return fallback;
    if (url.pathname === "/dashboard/organization/committees") {
      const id = url.searchParams.get("committeeId");
      return id ? `/dashboard/organization/committees?${new URLSearchParams({ committeeId: id })}` : "/dashboard/organization?tab=committees";
    }
    if (url.pathname === "/dashboard/organization") {
      const tab = url.searchParams.get("tab");
      return `/dashboard/organization?tab=${tab && ["overview", "members", "committees", "announcements"].includes(tab) ? tab : "members"}`;
    }
  } catch { /* Use the organization member list when the source is invalid. */ }
  return fallback;
}
