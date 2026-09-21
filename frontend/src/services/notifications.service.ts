import type { User } from "firebase/auth";
import { collection, doc, onSnapshot, orderBy, query, updateDoc, arrayUnion, limit } from "firebase/firestore";
import { getFirebaseDb } from "../firebase/config";

export type NotificationRecord = {
  id: string;
  recipientUID?: string | null;
  orgId?: string | null;
  title: string;
  description: string;
  type: "task" | "ai" | "organization" | "event" | "system";
  unread: boolean;
  time: string;
  createdAt?: string | null;
};

const READ_NOTIFS_STORAGE_KEY = "musubi_read_notifications";

function getReadNotifIdsFromStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(READ_NOTIFS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addReadNotifIdToStorage(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getReadNotifIdsFromStorage();
    if (!current.includes(id)) {
      current.push(id);
      localStorage.setItem(READ_NOTIFS_STORAGE_KEY, JSON.stringify(current));
    }
  } catch {
    // ignore storage errors
  }
}

function addMultipleReadNotifIdsToStorage(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const current = getReadNotifIdsFromStorage();
    const updated = Array.from(new Set([...current, ...ids]));
    localStorage.setItem(READ_NOTIFS_STORAGE_KEY, JSON.stringify(updated));
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

export function subscribeNotificationsFirestore(
  user: User | null,
  orgId: string | null | undefined,
  onData: (notifications: NotificationRecord[]) => void
): () => void {
  const db = getFirebaseDb();
  const currentUid = user?.uid;
  const targetOrgId = orgId && orgId.trim() ? orgId.trim() : null;

  let directNotifs: NotificationRecord[] = [];
  let auditNotifs: NotificationRecord[] = [];

  function emitMerged() {
    const readStorage = getReadNotifIdsFromStorage();
    const map = new Map<string, NotificationRecord>();

    directNotifs.forEach((item) => {
      const isRead = !item.unread || readStorage.includes(item.id);
      map.set(item.id, { ...item, unread: !isRead });
    });

    auditNotifs.forEach((item) => {
      if (!map.has(item.id)) {
        const isRead = !item.unread || readStorage.includes(item.id);
        map.set(item.id, { ...item, unread: !isRead });
      }
    });

    const merged = Array.from(map.values());
    merged.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    onData(merged);
  }

  const notifQuery = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(50));
  const unsubNotifs = onSnapshot(
    notifQuery,
    (snapshot) => {
      directNotifs = [];
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const recipientUID = data.recipientUID ?? null;
        const itemOrgId = data.orgId ?? null;

        const isForUser = currentUid && recipientUID === currentUid;
        const isForOrg = targetOrgId && itemOrgId === targetOrgId;
        const isGlobal = !recipientUID && !itemOrgId;

        if (isForUser || isForOrg || isGlobal) {
          const readBy = Array.isArray(data.readBy) ? data.readBy : [];
          const isRead = Boolean(data.read) || (currentUid ? readBy.includes(currentUid) : false);

          directNotifs.push({
            id: docSnap.id,
            recipientUID,
            orgId: itemOrgId,
            title: typeof data.title === "string" ? data.title : "Notification",
            description: typeof data.description === "string" ? data.description : "",
            type: (["task", "ai", "organization", "event", "system"].includes(data.type) ? data.type : "system") as any,
            unread: !isRead,
            time: formatRelativeTime(data.createdAt),
            createdAt: data.createdAt ? (typeof data.createdAt.toDate === "function" ? data.createdAt.toDate().toISOString() : String(data.createdAt)) : null
          });
        }
      });
      emitMerged();
    },
    (err) => {
      console.warn("[subscribeNotificationsFirestore] Notifications collection error:", err);
    }
  );

  const auditQuery = query(collection(db, "audit_logs"), orderBy("createdAt", "desc"), limit(40));
  const unsubAudit = onSnapshot(
    auditQuery,
    (snapshot) => {
      auditNotifs = [];
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const itemOrgId = typeof data.orgId === "string" ? data.orgId : null;

        if (targetOrgId && itemOrgId && itemOrgId !== targetOrgId) return;

        const category = typeof data.actionCategory === "string" ? data.actionCategory : "";
        const action = typeof data.action === "string" ? data.action : "System activity";
        const actorName = typeof data.actorName === "string" ? data.actorName : "System";
        const targetName = typeof data.targetName === "string" ? data.targetName : "";

        let title = "System Notification";
        let type: NotificationRecord["type"] = "system";

        if (category === "AI Agent Actions") {
          title = "AI Atomization Completed";
          type = "ai";
        } else if (category === "Events & Tasks") {
          title = "New Task / Event Activity";
          type = "task";
        } else if (category === "Organization") {
          title = "Organization Update";
          type = "organization";
        } else if (category === "User Management") {
          title = "Member Activity";
          type = "system";
        }

        const description = targetName
          ? `${action} on '${targetName}' by ${actorName}`
          : `${action} by ${actorName}`;

        const notifId = `audit_${docSnap.id}`;

        auditNotifs.push({
          id: notifId,
          orgId: itemOrgId,
          title,
          description,
          type,
          unread: true,
          time: formatRelativeTime(data.createdAt),
          createdAt: data.createdAt ? (typeof data.createdAt.toDate === "function" ? data.createdAt.toDate().toISOString() : String(data.createdAt)) : null
        });
      });
      emitMerged();
    },
    (err) => {
      console.warn("[subscribeNotificationsFirestore] Audit logs fallback error:", err);
    }
  );

  return () => {
    unsubNotifs();
    unsubAudit();
  };
}

export async function markNotificationAsRead(user: User | null, notificationId: string): Promise<void> {
  addReadNotifIdToStorage(notificationId);
  if (!user || !notificationId || notificationId.startsWith("audit_")) return;

  try {
    const db = getFirebaseDb();
    const docRef = doc(db, "notifications", notificationId);
    await updateDoc(docRef, {
      readBy: arrayUnion(user.uid),
      read: true
    });
  } catch (err) {
    console.warn("Failed to mark notification as read in Firestore:", err);
  }
}

export async function markAllNotificationsAsRead(user: User | null, notificationIds: string[]): Promise<void> {
  addMultipleReadNotifIdsToStorage(notificationIds);
  const directIds = notificationIds.filter((id) => !id.startsWith("audit_"));
  if (user && directIds.length > 0) {
    await Promise.all(directIds.map((id) => markNotificationAsRead(user, id)));
  }
}
