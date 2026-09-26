import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";
import { getFirebaseDb } from "../firebase/config";

import { useAuthStore } from "@/store/authStore";

export type Announcement = {
  id: string;
  organizationId: string;
  title: string;
  content: string;
  targetAudience: "All Members" | "Leaders Only" | string;
  isPinned: boolean;
  authorName: string;
  authorUid?: string;
  authorRole?: string;
  createdAt: string;
  timestamp?: number;
};

const ANNOUNCEMENTS_CACHE_KEY = "musubi_announcements_cache";

export function getCachedAnnouncements(): Announcement[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ANNOUNCEMENTS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCachedAnnouncement(ann: Announcement): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getCachedAnnouncements();
    const updated = [ann, ...existing.filter((item) => item.id !== ann.id)];
    localStorage.setItem(ANNOUNCEMENTS_CACHE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function removeCachedAnnouncement(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getCachedAnnouncements();
    const updated = existing.filter((item) => item.id !== id);
    localStorage.setItem(ANNOUNCEMENTS_CACHE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export async function fetchAnnouncements(user?: import("firebase/auth").User | null, orgId?: string | null): Promise<Announcement[]> {
  try {
    const firebaseUser = user || useAuthStore.getState().firebaseUser;
    const token = firebaseUser ? await firebaseUser.getIdToken() : "";
    if (token) {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";
      const queryParams = new URLSearchParams();
      if (orgId) queryParams.set("orgId", orgId);

      const res = await fetch(`${API_BASE_URL}/auth/announcements?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.announcements)) {
          data.announcements.forEach((a: Announcement) => saveCachedAnnouncement(a));
          return data.announcements;
        }
      }
    }
  } catch (err) {
    console.warn("[fetchAnnouncements] Backend API fetch warning:", err);
  }
  return getCachedAnnouncements();
}

export function subscribeAnnouncementsFirestore(
  orgId: string | null | undefined,
  userRole: string | undefined,
  onData: (announcements: Announcement[]) => void
): () => void {
  const targetOrgId = orgId && orgId.trim() ? orgId.trim() : "default-org";
  const db = getFirebaseDb();

  let topLevelAnnouncements: Announcement[] = [];
  let subColAnnouncements: Announcement[] = [];

  function emitMerged() {
    const cached = getCachedAnnouncements();
    const uniqueMap = new Map<string, Announcement>();

    const allSources = [...cached, ...topLevelAnnouncements, ...subColAnnouncements];

    allSources.forEach((a) => {
      const itemOrgId = a.organizationId || "default-org";
      const isAllMembers = !a.targetAudience || a.targetAudience === "All Members";
      const isOrgMatch =
        !targetOrgId ||
        targetOrgId === "default-org" ||
        itemOrgId === "default-org" ||
        itemOrgId === targetOrgId;

      if (isAllMembers || isOrgMatch) {
        // Unique key based on title + content + createdAt to deduplicate temporary IDs and duplicate feeds
        const uniqueKey = `${(a.title || "").trim().toLowerCase()}_${(a.content || "").trim().toLowerCase()}_${a.createdAt}`;
        const existing = uniqueMap.get(uniqueKey);
        if (!existing) {
          uniqueMap.set(uniqueKey, a);
        } else if (existing.id.startsWith("ann-") && !a.id.startsWith("ann-")) {
          // Upgrade temporary local ID to real Firestore ID
          uniqueMap.set(uniqueKey, a);
        }
      }
    });

    const list = Array.from(uniqueMap.values());
    list.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });

    const activeRole = userRole || useAuthStore.getState().profile?.role;
    const filtered = activeRole === "Organization Member"
      ? list.filter((a) => a.targetAudience !== "Leaders Only")
      : list;

    onData(filtered);
  }

  // Initial immediate emit from cache before network listeners return
  emitMerged();

  // 1. Initial immediate fetch via secure backend Admin SDK API
  void fetchAnnouncements(null, targetOrgId).then((apiList) => {
    if (apiList && apiList.length > 0) {
      topLevelAnnouncements = apiList;
      emitMerged();
    }
  });

  // 2. Poll backend API every 10 seconds to preserve sync across tabs/users
  const interval = setInterval(() => {
    if (typeof document !== "undefined" && document.hidden) return;
    void fetchAnnouncements(null, targetOrgId).then((apiList) => {
      if (apiList && apiList.length > 0) {
        topLevelAnnouncements = apiList;
        emitMerged();
      }
    });
  }, 10000);

  // 3. Subscribe to top-level collection "announcements"
  const topRef = collection(db, "announcements");
  const unsubTop = onSnapshot(
    topRef,
    (snapshot) => {
      topLevelAnnouncements = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const itemOrgId = data.organizationId || data.orgId || "default-org";

        const isAllMembers = !data.targetAudience || data.targetAudience === "All Members";
        const isOrgMatch =
          !targetOrgId ||
          targetOrgId === "default-org" ||
          itemOrgId === "default-org" ||
          itemOrgId === targetOrgId;

        if (!isAllMembers && !isOrgMatch) {
          return;
        }

        const annItem: Announcement = {
          id: docSnap.id,
          organizationId: itemOrgId,
          title: typeof data.title === "string" ? data.title : "Untitled Announcement",
          content: typeof data.content === "string" ? data.content : "",
          targetAudience: typeof data.targetAudience === "string" ? data.targetAudience : "All Members",
          isPinned: Boolean(data.isPinned),
          authorName: typeof data.authorName === "string" ? data.authorName : "Student Leader",
          authorUid: typeof data.authorUid === "string" ? data.authorUid : undefined,
          authorRole: typeof data.authorRole === "string" ? data.authorRole : "Student Leader",
          createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
          timestamp: typeof data.timestamp === "number" ? data.timestamp : Date.now()
        };

        topLevelAnnouncements.push(annItem);
        saveCachedAnnouncement(annItem);
      });
      emitMerged();
    },
    (err) => {
      console.warn("[subscribeAnnouncementsFirestore] Top collection snapshot error:", err);
      emitMerged();
    }
  );

  // 4. Subscribe to sub-collection "organizations/{orgId}/announcements"
  const subRef = collection(db, "organizations", targetOrgId, "announcements");
  const unsubSub = onSnapshot(
    subRef,
    (snapshot) => {
      subColAnnouncements = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const annItem: Announcement = {
          id: docSnap.id,
          organizationId: targetOrgId,
          title: typeof data.title === "string" ? data.title : "Untitled Announcement",
          content: typeof data.content === "string" ? data.content : "",
          targetAudience: typeof data.targetAudience === "string" ? data.targetAudience : "All Members",
          isPinned: Boolean(data.isPinned),
          authorName: typeof data.authorName === "string" ? data.authorName : "Student Leader",
          authorUid: typeof data.authorUid === "string" ? data.authorUid : undefined,
          authorRole: typeof data.authorRole === "string" ? data.authorRole : "Student Leader",
          createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
          timestamp: typeof data.timestamp === "number" ? data.timestamp : Date.now()
        };

        subColAnnouncements.push(annItem);
        saveCachedAnnouncement(annItem);
      });
      emitMerged();
    },
    (err) => {
      emitMerged();
    }
  );

  return () => {
    clearInterval(interval);
    unsubTop();
    unsubSub();
  };
}

export async function createAnnouncementFirestore(
  orgId: string,
  announcementData: {
    title: string;
    content: string;
    targetAudience: string;
    isPinned: boolean;
    authorName: string;
    authorUid?: string;
    authorRole?: string;
  }
): Promise<Announcement> {
  const targetOrgId = orgId && orgId.trim() ? orgId.trim() : "default-org";
  const db = getFirebaseDb();

  const formattedDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  const timestamp = Date.now();
  const createdId = `ann-${timestamp}`;

  const announcementItem: Announcement = {
    id: createdId,
    organizationId: targetOrgId,
    title: announcementData.title.trim(),
    content: announcementData.content.trim(),
    targetAudience: announcementData.targetAudience || "All Members",
    isPinned: Boolean(announcementData.isPinned),
    authorName: announcementData.authorName || "Student Leader",
    authorUid: announcementData.authorUid || "",
    authorRole: announcementData.authorRole || "Student Leader",
    createdAt: formattedDate,
    timestamp
  };

  // 1. Immediately cache locally so page refreshes NEVER lose the announcement
  saveCachedAnnouncement(announcementItem);

  // 2. Persist via backend API with Firebase Admin SDK (guarantees Firestore write without client permission errors)
  try {
    const firebaseUser = useAuthStore.getState().firebaseUser;
    const token = firebaseUser ? await firebaseUser.getIdToken() : "";
    if (token) {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";
      const res = await fetch(`${API_BASE_URL}/auth/announcements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          orgId: targetOrgId,
          title: announcementItem.title,
          content: announcementItem.content,
          targetAudience: announcementItem.targetAudience,
          isPinned: announcementItem.isPinned,
          authorName: announcementItem.authorName,
          authorRole: announcementItem.authorRole
        })
      });
      if (res.ok) {
        const body = await res.json();
        if (body?.announcement?.id) {
          removeCachedAnnouncement(createdId);
          announcementItem.id = body.announcement.id;
          saveCachedAnnouncement(announcementItem);
          return announcementItem;
        }
      }
    }
  } catch (apiErr) {
    console.warn("[createAnnouncementFirestore] Backend API create warning:", apiErr);
  }

  // Fallback direct client Firestore write
  const payload = {
    organizationId: targetOrgId,
    orgId: targetOrgId,
    title: announcementItem.title,
    content: announcementItem.content,
    targetAudience: announcementItem.targetAudience,
    isPinned: announcementItem.isPinned,
    authorName: announcementItem.authorName,
    authorUid: announcementItem.authorUid,
    authorRole: announcementItem.authorRole,
    createdAt: announcementItem.createdAt,
    timestamp: announcementItem.timestamp,
    createdAtServer: serverTimestamp()
  };

  try {
    const topRef = collection(db, "announcements");
    const docRef = await addDoc(topRef, payload);
    if (docRef.id) {
      removeCachedAnnouncement(createdId);
      announcementItem.id = docRef.id;
      saveCachedAnnouncement(announcementItem);
    }
  } catch (topErr) {
    console.warn("[createAnnouncementFirestore] Top collection addDoc warning:", topErr);

    try {
      const subRef = collection(db, "organizations", targetOrgId, "announcements");
      const docRef = await addDoc(subRef, payload);
      if (docRef.id) {
        removeCachedAnnouncement(createdId);
        announcementItem.id = docRef.id;
        saveCachedAnnouncement(announcementItem);
      }
    } catch (subErr) {
      console.warn("[createAnnouncementFirestore] Sub-collection addDoc warning:", subErr);
    }
  }

  return announcementItem;
}
