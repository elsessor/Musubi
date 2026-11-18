"use client";

import { useEffect, useRef } from "react";
import { subscribeNotificationsFirestore } from "@/services/notifications.service";
import { getMyProfile, ORGANIZATION_JOIN_STATUS_CHANGED } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { MembershipNotificationTracker } from "@/utils/membershipNotifications";

export function useMembershipNotifications() {
  const user = useAuthStore((state) => state.firebaseUser);
  const profile = useAuthStore((state) => state.profile);
  const showToast = useToastStore((state) => state.showToast);
  const session = useRef<{ uid: string; tracker: MembershipNotificationTracker; decisions: Set<string> } | null>(null);

  useEffect(() => {
    if (!user) { session.current = null; return; }
    if (session.current?.uid !== user.uid) session.current = { uid: user.uid, tracker: new MembershipNotificationTracker(user.uid, Date.now()), decisions: new Set() };
    if (profile?.uid !== user.uid) return;
    const current = session.current;
    let active = true;
    const unsubscribe = subscribeNotificationsFirestore(user, profile.organizationId, (items) => {
      if (!active || useAuthStore.getState().firebaseUser?.uid !== user.uid) return;
      for (const toast of current.tracker.collect(items, !document.hidden)) showToast(toast);
      const decisions = items.filter((item) => item.recipientUID === user.uid && (item.membershipEvent === "join-accepted" || item.membershipEvent === "join-rejected") && !current.decisions.has(`${item.id}:${item.createdAt}`));
      if (!decisions.length) return;
      for (const item of decisions) current.decisions.add(`${item.id}:${item.createdAt}`);
      window.dispatchEvent(new Event(ORGANIZATION_JOIN_STATUS_CHANGED));
      if (decisions.some((item) => item.membershipEvent === "join-accepted")) void getMyProfile(user).then((fresh) => {
        if (useAuthStore.getState().firebaseUser?.uid === user.uid) useAuthStore.getState().setProfile(fresh);
      }).catch(() => { /* The user-document listener or next page load can refresh the profile. */ });
    });
    const flush = () => { if (!document.hidden) for (const toast of current.tracker.collect([], true)) showToast(toast); };
    document.addEventListener("visibilitychange", flush);
    return () => { active = false; unsubscribe(); document.removeEventListener("visibilitychange", flush); };
  }, [user, profile?.uid, profile?.organizationId, profile?.role, profile?.committeeId, showToast]);
}
