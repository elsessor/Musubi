import type { User } from "firebase/auth";
import { collection, doc, onSnapshot, query, updateDoc, arrayUnion, limit, where } from "firebase/firestore";
import { getFirebaseDb } from "../firebase/config";
import { subscribeAnnouncementsFirestore } from "./announcements.service";
import { useAuthStore } from "@/store/authStore";
import { getNotificationRecords, readNotificationRecords } from "./auth.service";

export type NotificationRecord = {
  id: string;
  recipientUID?: string | null;
  joinRequestId?: string;
  membershipEvent?: "join-request" | "join-accepted" | "join-rejected";
  orgId?: string | null;
  title: string;
  description: string;
  type: "announcement" | "nudge" | "task" | "ai" | "organization" | "event" | "system";
  unread: boolean;
  time: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  isPinned?: boolean;
  authorName?: string;
  nudgeCategory?: "deadline" | "followup" | "system";
  dueDate?: string;
  targetAudience?: string;
  committeeId?: string | null;
  committeeName?: string | null;
  content?: string;
};

const READ_NOTIFS_STORAGE_KEY = "musubi_read_notifications";
const ALL_READ_TIMESTAMP_KEY = "musubi_all_read_timestamp";
const NOTIF_READ_EVENT = "musubi_notif_read_change";

// In-memory registry of all notification IDs seen across all subscriptions in the current session
const allKnownNotifIds = new Map<string, Set<string>>();

// Active subscriber callbacks across the entire app
const subscribers = new Set<() => void>();

export function notifyNotifSubscribers(): void {
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.warn("[notifications] Error in subscriber callback:", e);
    }
  });
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent(NOTIF_READ_EVENT));
    } catch {
      // ignore
    }
  }
}

function getStorageKey(uid?: string | null): string {
  return uid ? `${READ_NOTIFS_STORAGE_KEY}_${uid}` : READ_NOTIFS_STORAGE_KEY;
}

function getTimestampKey(uid?: string | null): string {
  return uid ? `${ALL_READ_TIMESTAMP_KEY}_${uid}` : ALL_READ_TIMESTAMP_KEY;
}

function getReadNotifIdsFromStorage(uid?: string | null): string[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getStorageKey(uid);
    const raw = localStorage.getItem(key);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return Array.from(new Set(list));
  } catch {
    return [];
  }
}

function getAllReadTimestamp(uid?: string | null): number {
  if (typeof window === "undefined") return 0;
  try {
    const key = getTimestampKey(uid);
    const raw = localStorage.getItem(key);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function addReadNotifIdToStorage(id: string, uid?: string | null): void {
  if (typeof window === "undefined" || !id) return;
  try {
    const key = getStorageKey(uid);
    const current = getReadNotifIdsFromStorage(uid);
    if (!current.includes(id)) {
      current.push(id);
      localStorage.setItem(key, JSON.stringify(current));
    }
  } catch {
    // ignore storage errors
  }
}

function addMultipleReadNotifIdsToStorage(ids: string[], uid?: string | null): void {
  if (typeof window === "undefined" || !ids || ids.length === 0) return;
  try {
    const key = getStorageKey(uid);
    const current = getReadNotifIdsFromStorage(uid);
    const updated = Array.from(new Set([...current, ...ids]));
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
}

function setAllReadTimestamp(ts: number, uid?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const key = getTimestampKey(uid);
    localStorage.setItem(key, String(ts));
  } catch {
    // ignore storage errors
  }
}

export function formatRelativeTime(dateInput: any): string {
  if (!dateInput) return "Just now";
  let date: Date;
  if (typeof dateInput?.toDate === "function") {
    date = dateInput.toDate();
  } else if (typeof dateInput === "string") {
    date = new Date(dateInput);
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === "number") {
    date = new Date(dateInput);
  } else {
    return "Just now";
  }

  if (Number.isNaN(date.getTime())) return "Just now";

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 30) return "Just now";
  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 172800) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

type NotificationStream = { listeners: Set<(items: NotificationRecord[]) => void>; last: NotificationRecord[]; stop: () => void };
const notificationStreams = new Map<string, NotificationStream>();

export function subscribeNotificationsFirestore(user: User | null, orgId: string | null | undefined, onData: (items: NotificationRecord[]) => void): () => void {
  if (!user?.uid) { onData([]); return () => {}; }
  const profile = useAuthStore.getState().profile;
  const key = JSON.stringify([user.uid, orgId || "", profile?.role, profile?.committeeId]);
  let stream = notificationStreams.get(key);
  if (!stream) {
    stream = { listeners: new Set(), last: [], stop: () => {} };
    notificationStreams.set(key, stream);
    const current = stream;
    current.listeners.add(onData);
    current.stop = startNotificationStream(user, orgId, (items) => {
      current.last = items;
      for (const listener of current.listeners) listener(items);
    });
  } else { stream.listeners.add(onData); onData(stream.last); }
  const current = stream;
  return () => {
    current.listeners.delete(onData);
    if (!current.listeners.size) { current.stop(); notificationStreams.delete(key); }
  };
}

function normalizeNotification(id: string, data: Record<string, any>, uid: string): NotificationRecord {
  const date = (value: any) => value ? typeof value.toDate === "function" ? value.toDate().toISOString() : String(value) : null;
  return {
    id, recipientUID: data.recipientUID ?? null, orgId: data.orgId ?? null,
    title: typeof data.title === "string" ? data.title : "Notification", description: typeof data.description === "string" ? data.description : "",
    type: ["announcement", "nudge", "task", "ai", "organization", "event", "system"].includes(data.type) ? data.type : "system",
    joinRequestId: typeof data.joinRequestId === "string" ? data.joinRequestId : undefined,
    membershipEvent: ["join-request", "join-accepted", "join-rejected"].includes(data.membershipEvent) ? data.membershipEvent : undefined,
    unread: !data.read && !(Array.isArray(data.readBy) && data.readBy.includes(uid)),
    nudgeCategory: data.nudgeCategory, dueDate: data.dueDate,
    time: formatRelativeTime(data.createdAt), createdAt: date(data.createdAt), updatedAt: date(data.updatedAt)
  };
}

function startNotificationStream(
  user: User | null,
  orgId: string | null | undefined,
  onData: (notifications: NotificationRecord[]) => void
): () => void {
  let db: ReturnType<typeof getFirebaseDb> | null = null;
  try { db = getFirebaseDb(); } catch { /* Authenticated refresh can deliver without a client Firestore connection. */ }
  const currentUid = user?.uid;
  const targetOrgId = orgId && orgId.trim() ? orgId.trim() : null;

  let announcementNotifs: NotificationRecord[] = [];
  let personalNotifs: NotificationRecord[] = [], organizationNotifs: NotificationRecord[] = [], apiNotifs: NotificationRecord[] = [];
  let auditNotifs: NotificationRecord[] = [];

  function emitMerged() {
    const readStorage = getReadNotifIdsFromStorage(user?.uid);
    const allReadAt = getAllReadTimestamp(user?.uid);
    const map = new Map<string, NotificationRecord>();

    const checkIsRead = (id: string, createdAt?: string | null, explicitlyRead?: boolean) => {
      if (explicitlyRead) return true;
      if (readStorage.includes(id)) return true;
      if (allReadAt > 0 && createdAt) {
        const itemTime = new Date(createdAt).getTime();
        if (!isNaN(itemTime) && itemTime <= allReadAt) {
          return true;
        }
      }
      return false;
    };

    // 1. Real-time Announcements
    announcementNotifs.forEach((item) => {
      const isRead = checkIsRead(item.id, item.createdAt);
      map.set(item.id, { ...item, unread: !isRead });
    });

    // 2. Direct Notifications
    [...apiNotifs, ...organizationNotifs, ...personalNotifs].forEach((item) => {
      const isRead = checkIsRead(item.id, item.createdAt, !item.unread);
      const candidate = { ...item, unread: !isRead }, previous = map.get(item.id);
      if (!previous) { map.set(item.id, candidate); return; }
      const version = (record: NotificationRecord) => Date.parse(record.updatedAt || record.createdAt || "") || 0;
      const newest = version(candidate) >= version(previous) ? candidate : previous;
      map.set(item.id, { ...newest, unread: candidate.createdAt === previous.createdAt ? candidate.unread && previous.unread : newest.unread });
    });

    // 4. Audit Logs
    auditNotifs.forEach((item) => {
      if (!map.has(item.id)) {
        const isRead = checkIsRead(item.id, item.createdAt, !item.unread);
        map.set(item.id, { ...item, unread: !isRead });
      }
    });

    const merged = Array.from(map.values());

    // Register all seen notification IDs
    merged.forEach((item) => {
      if (currentUid) {
        const known = allKnownNotifIds.get(currentUid) ?? new Set<string>();
        known.add(item.id); allKnownNotifIds.set(currentUid, known);
      }
    });

    // Deduplicate merged array by type + title + description to eliminate duplicate notifications
    const dedupMap = new Map<string, NotificationRecord>();
    merged.forEach((item) => {
      const key = item.nudgeCategory === "deadline" || item.joinRequestId ? item.id : `${item.type}_${(item.title || "").trim().toLowerCase()}_${(item.description || "").trim().toLowerCase()}`;
      if (!dedupMap.has(key)) {
        dedupMap.set(key, item);
      } else {
        const existing = dedupMap.get(key)!;
        if (item.isPinned && !existing.isPinned) {
          dedupMap.set(key, item);
        }
      }
    });

    const finalMerged = Array.from(dedupMap.values());

    // Pinned announcements MUST appear FIRST, then by time DESC
    finalMerged.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    onData(finalMerged);
  }

  // Register into active subscribers
  subscribers.add(emitMerged);

  const handleGlobalReadChange = () => {
    emitMerged();
  };

  if (typeof window !== "undefined") {
    window.addEventListener(NOTIF_READ_EVENT, handleGlobalReadChange);
    window.addEventListener("storage", handleGlobalReadChange);
  }

  // Initial immediate emit
  emitMerged();

  // 1. Subscribe to real-time announcements from Firestore
  const userRole = useAuthStore.getState().profile?.role;
  const unsubAnnouncements = subscribeAnnouncementsFirestore(targetOrgId, userRole, (announcements) => {
    announcementNotifs = announcements.map((ann) => ({
      id: `announcement_${ann.id}`,
      orgId: ann.organizationId || targetOrgId,
      title: ann.title,
      content: ann.content,
      description: ann.authorName
        ? `Posted by ${ann.authorName}${ann.authorRole ? ` (${ann.authorRole})` : ""} · ${ann.createdAt || "Recent"}`
        : ann.content || "New announcement posted",
      type: "announcement" as const,
      unread: true,
      time: ann.createdAt || "Recent",
      createdAt: ann.createdAt || new Date().toISOString(),
      isPinned: Boolean(ann.isPinned),
      authorName: ann.authorName,
      targetAudience: ann.targetAudience,
      committeeId: ann.committeeId,
      committeeName: ann.committeeName
    }));
    emitMerged();
  });

  let stopped = false, refreshing = false, refreshAgain = false;
  let lastRefreshAt: number | null = null;
  let fallbackInterval: number | undefined;
  let controller: AbortController | undefined;
  const refreshBackend = async (force = false) => {
    if (stopped || typeof window === "undefined" || document.hidden || !user) return;
    if (refreshing) { if (force) refreshAgain = true; return; }
    if (!force && lastRefreshAt !== null && Date.now() - lastRefreshAt < 30000) return;
    lastRefreshAt = Date.now();
    refreshing = true;
    controller = new AbortController();
    const timeout = window.setTimeout(() => controller?.abort(), 15000);
    try {
      const records = await getNotificationRecords(user, controller.signal);
      if (stopped) return;
      apiNotifs = records.flatMap((record) => {
        if (!record || typeof record !== "object") return [];
        const data = record as Record<string, any>;
        return typeof data.id === "string" ? [normalizeNotification(data.id, data, currentUid!)] : [];
      });
      emitMerged();
    } catch (error) {
      if (!stopped && fallbackInterval) console.warn("Notification refresh failed; retrying shortly.", error);
    } finally {
      window.clearTimeout(timeout); refreshing = false;
      if (refreshAgain && !stopped) { refreshAgain = false; void refreshBackend(true); }
    }
  };
  const startApiFallback = () => {
    if (typeof window === "undefined" || fallbackInterval) return;
    console.warn("Live notification access is unavailable; using authenticated notification refresh.");
    fallbackInterval = window.setInterval(() => { void refreshBackend(true); }, 60000);
    void refreshBackend(true);
  };
  // Personal updates remain available before joining, after rejection, and after switching organizations.
  const unsubPersonal = db ? onSnapshot(query(collection(db, "notifications"), where("recipientUID", "==", currentUid)), (snapshot) => {
    if (stopped) return;
    personalNotifs = snapshot.docs.flatMap((document) => document.data().recipientUID === currentUid ? [normalizeNotification(document.id, document.data(), currentUid!)] : []);
    emitMerged();
  }, startApiFallback) : () => {};
  const unsubOrganization = db && targetOrgId ? onSnapshot(query(collection(db, "notifications"), where("orgId", "==", targetOrgId), where("recipientUID", "==", null)), (snapshot) => {
    if (stopped) return;
    organizationNotifs = snapshot.docs.flatMap((document) => {
      const data = document.data();
      return !data.recipientUID && data.orgId === targetOrgId ? [normalizeNotification(document.id, data, currentUid!)] : [];
    });
    emitMerged();
  }, startApiFallback) : () => {};
  if (!db) startApiFallback();
  const refresh = () => { void refreshBackend(); };
  if (typeof window !== "undefined") {
    void refreshBackend();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
  }

  return () => {
    stopped = true; controller?.abort();
    subscribers.delete(emitMerged);
    if (typeof window !== "undefined") {
      window.removeEventListener(NOTIF_READ_EVENT, handleGlobalReadChange);
      window.removeEventListener("storage", handleGlobalReadChange);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      if (fallbackInterval) window.clearInterval(fallbackInterval);
    }
    unsubAnnouncements();
    unsubPersonal(); unsubOrganization();
  };
}

export async function markNotificationAsRead(user: User | null, notificationId: string): Promise<void> {
  const authUser = user || useAuthStore.getState().firebaseUser;
  addReadNotifIdToStorage(notificationId, authUser?.uid);
  notifyNotifSubscribers();

  if (!authUser || !notificationId || notificationId.startsWith("audit_") || notificationId.startsWith("event_") || notificationId.startsWith("announcement_")) return;

  try {
    await readNotificationRecords(authUser, [notificationId]);
    return;
  } catch { /* Older deployments can still persist reads through Firestore. */ }
  try {
    const db = getFirebaseDb();
    const docRef = doc(db, "notifications", notificationId);
    await updateDoc(docRef, {
      readBy: arrayUnion(authUser.uid)
    });
  } catch (err) {
    console.warn("Failed to mark notification as read in Firestore:", err);
  }
}

export async function markAllNotificationsAsRead(user: User | null, notificationIds?: string[]): Promise<void> {
  const authUser = user || useAuthStore.getState().firebaseUser;
  const now = Date.now();
  setAllReadTimestamp(now, authUser?.uid);

  const allIds = Array.from(new Set(notificationIds ?? (authUser ? allKnownNotifIds.get(authUser.uid) ?? [] : [])));
  addMultipleReadNotifIdsToStorage(allIds, authUser?.uid);
  notifyNotifSubscribers();

  const directIds = allIds.filter((id) => !id.startsWith("audit_") && !id.startsWith("event_") && !id.startsWith("announcement_"));
  if (authUser && directIds.length > 0) {
    try { await readNotificationRecords(authUser, directIds); return; }
    catch { /* Preserve compatibility with deployments that only support SDK writes. */ }
    await Promise.all(
      directIds.map(async (id) => {
        try {
          const db = getFirebaseDb();
          const docRef = doc(db, "notifications", id);
          await updateDoc(docRef, {
            readBy: arrayUnion(authUser.uid)
          });
        } catch (err) {
          console.warn("Failed to mark notification as read in Firestore:", err);
        }
      })
    );
  }
}

export async function sendNudgeEmail(input: {
  recipientEmail?: string;
  recipientUID?: string;
  taskTitle: string;
  eventName?: string;
  deadline?: string;
  message?: string;
  isUrgent?: boolean;
  nudgeType?: "3_days_prior" | "1_day_prior" | string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = useAuthStore.getState().firebaseUser;
    if (!user) return { success: false, error: "Sign in again to send a nudge." };
    const token = await user.getIdToken();
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "https://musubi-backend-4roe.onrender.com";
    const res = await fetch(`${apiBaseUrl}/email/nudge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(input)
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || data.message || "Failed to send email" };
    }
    return { success: true };
  } catch (err: any) {
    console.warn("Failed to dispatch nudge email:", err);
    return { success: false, error: err.message || "Network error" };
  }
}

export async function checkAndDispatchDueNudges(): Promise<{ success: boolean; processedCount?: number; error?: string }> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    // Bound token retrieval and the network request, including a stalled response body.
    return await Promise.race([
      (async () => {
        const user = useAuthStore.getState().firebaseUser;
        if (!user) return { success: false, error: "Sign in again to check your nudges." };
        const token = await user.getIdToken();
        if (controller.signal.aborted) throw new Error("Nudge check timed out.");
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "https://musubi-backend-4roe.onrender.com";
        const res = await fetch(`${apiBaseUrl}/email/check-due-nudges`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          signal: controller.signal
        });
        const data = await res.json();
        return {
          success: res.ok && data.success !== false, processedCount: data.processedCount,
          error: res.ok ? undefined : data.error || data.message || "Could not check due nudges."
        };
      })(),
      new Promise<{ success: false; error: string }>((resolve) => {
        timeout = setTimeout(() => {
          controller.abort();
          resolve({ success: false, error: "The nudge check took too long. Please try again shortly." });
        }, 30000);
      })
    ]);
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Could not check due nudges." };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
