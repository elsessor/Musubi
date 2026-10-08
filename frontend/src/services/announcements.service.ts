import type { User } from "firebase/auth";
import { useAuthStore } from "@/store/authStore";

export type Announcement = {
  id: string;
  organizationId: string;
  title: string;
  content: string;
  targetAudience: string;
  committeeId?: string | null;
  committeeName?: string | null;
  isPinned: boolean;
  authorName: string;
  authorUid?: string;
  authorRole?: string;
  createdAt: string;
  timestamp?: number;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

async function announcementRequest(user: User | null | undefined, path: string, init?: RequestInit) {
  const firebaseUser = user || useAuthStore.getState().firebaseUser;
  if (!firebaseUser) throw new Error("Sign in again to access announcements.");
  const token = await firebaseUser.getIdToken();
  const response = await fetch(`${API_BASE_URL}/auth/announcements${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Unable to save or load announcements.");
  return data;
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
      const itemOrgId = a.organizationId;
      const isOrgMatch =
        !targetOrgId ||
        targetOrgId === "all" ||
        targetOrgId === "default-org" ||
        !itemOrgId ||
        itemOrgId === "default-org" ||
        (itemOrgId && itemOrgId === targetOrgId);

      if (!isOrgMatch) return;

      const activeRole = userRole || useAuthStore.getState().profile?.role;
      const isMember = activeRole === "Organization Member";
      const isLeadersOnly = a.targetAudience === "Leaders Only" || a.targetAudience === "Officers Only";

      if (isMember && isLeadersOnly) return;

      // Unique key based on title + content + createdAt to deduplicate temporary IDs and duplicate feeds
      const uniqueKey = `${(a.title || "").trim().toLowerCase()}_${(a.content || "").trim().toLowerCase()}_${a.createdAt}`;
      const existing = uniqueMap.get(uniqueKey);
      if (!existing) {
        uniqueMap.set(uniqueKey, a);
      } else if (existing.id.startsWith("ann-") && !a.id.startsWith("ann-")) {
        // Upgrade temporary local ID to real Firestore ID
        uniqueMap.set(uniqueKey, a);
      }
    });

    const list = Array.from(uniqueMap.values());
    list.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });

    onData(list);
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
  export async function fetchAnnouncements(user?: User | null, orgId?: string | null): Promise<Announcement[]> {
    const params = new URLSearchParams(orgId ? { orgId } : {});
    const data = await announcementRequest(user, `?${params}`);
    return Array.isArray(data.announcements) ? data.announcements : [];
  }

  // All reads use the server's current organization, role and committee checks.
  export function subscribeAnnouncementsFirestore(orgId: string | null | undefined, _userRole: string | undefined, onData: (announcements: Announcement[]) => void): () => void {
    let active = true;
    let generation = 0;
    let loading = false;
    onData([]);
    // Remove the old shared cache so restricted announcements cannot reappear on another account.
    try {
      if (typeof window !== "undefined") localStorage.removeItem("musubi_announcements_cache");
    } catch { /* Storage may be disabled; announcements still load from the API. */ }
    async function load() {
      if (!active || loading) return;
      const currentGeneration = generation;
      loading = true;
      try {
        const announcements = await fetchAnnouncements(null, orgId);
        if (active && currentGeneration === generation) onData(announcements);
      } catch {
        if (active && currentGeneration === generation) onData([]);
      } finally {
        loading = false;
        if (active && currentGeneration !== generation) void load();
      }
    }
    void load();
    const interval = setInterval(() => {
      if (typeof document === "undefined" || !document.hidden) void load();
    }, 10000);

    // 3. Subscribe to top-level collection "announcements"
    const topRef = collection(db, "announcements");
    const unsubTop = onSnapshot(
      topRef,
      (snapshot) => {
        topLevelAnnouncements = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const itemOrgId = data.organizationId || data.orgId;

          const isOrgMatch =
            !targetOrgId ||
            targetOrgId === "all" ||
            targetOrgId === "default-org" ||
            !itemOrgId ||
            itemOrgId === "default-org" ||
            (itemOrgId && itemOrgId === targetOrgId);

          if (!isOrgMatch) {
            return;
          }

          const activeRole = userRole || useAuthStore.getState().profile?.role;
          const isMember = activeRole === "Organization Member";
          const isLeadersOnly = data.targetAudience === "Leaders Only" || data.targetAudience === "Officers Only";

          if (isMember && isLeadersOnly) {
            return;
          }

          const annItem: Announcement = {
            id: docSnap.id,
            organizationId: itemOrgId || targetOrgId || "default-org",
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
        emitMerged();
      }
    );

    // 4. Subscribe to sub-collection "organizations/{orgId}/announcements"
    const subRef = collection(db, "organizations", targetOrgId || "default-org", "announcements");
    const unsubSub = onSnapshot(
      subRef,
      (snapshot) => {
        subColAnnouncements = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const activeRole = userRole || useAuthStore.getState().profile?.role;
          const isMember = activeRole === "Organization Member";
          const isLeadersOnly = data.targetAudience === "Leaders Only" || data.targetAudience === "Officers Only";

          if (isMember && isLeadersOnly) {
            return;
          }

          const annItem: Announcement = {
            id: docSnap.id,
            organizationId: targetOrgId || "default-org",
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
    const unsubscribeAuth = useAuthStore.subscribe((state, previous) => {
      if (state.firebaseUser?.uid !== previous.firebaseUser?.uid || state.profile !== previous.profile) {
        generation += 1;
        onData([]);
        void load();
      }
    });
    return () => { active = false; clearInterval(interval); unsubscribeAuth(); };
  }

  export async function createAnnouncementFirestore(orgId: string, announcementData: {
    title: string;
    content: string;
    targetAudience: string;
    committeeId?: string;
    isPinned: boolean;
    authorName: string;
    authorUid?: string;
    authorRole?: string;
  }): Promise<Announcement> {
    const data = await announcementRequest(null, "", {
      method: "POST",
      body: JSON.stringify({ ...announcementData, orgId })
    });
    if (!data.announcement?.id) throw new Error("The announcement could not be saved.");
    return data.announcement;
  }
