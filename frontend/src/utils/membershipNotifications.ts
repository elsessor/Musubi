import type { NotificationRecord } from "@/services/notifications.service";
import type { ToastMessage } from "@/store/toastStore";

export function membershipNotificationAction(item: NotificationRecord, role?: string) {
  if (item.membershipEvent === "join-accepted") return { label: "View organization", href: "/dashboard/organization?tab=overview" };
  if (item.membershipEvent === "join-rejected") return { label: "Find an organization", href: "/dashboard/organization" };
  if (item.joinRequestId && role === "Student Leader") return {
    label: "Review join requests", href: `/dashboard/organization?tab=members&request=${encodeURIComponent(item.joinRequestId)}`
  };
  return null;
}

export class MembershipNotificationTracker {
  private seen = new Set<string>();
  private queued = new Map<string, NotificationRecord>();
  constructor(private uid: string, private startedAt: number) {}

  collect(items: NotificationRecord[], visible: boolean): Array<Omit<ToastMessage, "id">> {
    for (const item of items) {
      if (item.recipientUID !== this.uid || !item.membershipEvent || !item.unread) continue;
      const createdAt = Date.parse(item.createdAt || "");
      if (!Number.isFinite(createdAt) || createdAt < this.startedAt) continue;
      const key = `${item.id}:${item.createdAt}`;
      if (this.seen.has(key)) continue;
      this.seen.add(key); this.queued.set(key, item);
    }
    if (!visible) return [];
    const toasts = [...this.queued.values()].map((item) => ({ title: item.title, description: item.description,
      tone: item.membershipEvent === "join-accepted" ? "success" as const : "info" as const }));
    this.queued.clear();
    return toasts;
  }
}
