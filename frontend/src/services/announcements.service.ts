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

class AnnouncementRequestError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

async function announcementRequest(user: User | null | undefined, path: string, init?: RequestInit) {
  const firebaseUser = user || useAuthStore.getState().firebaseUser;
  if (!firebaseUser) throw new Error("Sign in again to access announcements.");
  const token = await firebaseUser.getIdToken();
  const response = await fetch(`${API_BASE_URL}/auth/announcements${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new AnnouncementRequestError(data.message || "Unable to save or load announcements.", response.status);
  return data;
}

const announcementsCache = new Map<string, { data: Announcement[]; timestamp: number }>();
const inFlightAnnouncements = new Map<string, Promise<Announcement[]>>();
let cacheGeneration = 0;
let cacheAuthKey: string | null = null;

function announcementAuthKey(state: ReturnType<typeof useAuthStore.getState>): string | null {
  if (state.loading || !state.firebaseUser || !state.profile || state.firebaseUser.uid !== state.profile.uid) return null;
  return JSON.stringify([state.firebaseUser.uid, state.profile.organizationId?.trim() || null, state.profile.role, state.profile.committeeId || null]);
}

function announcementReadSession(user?: User | null, orgId?: string | null) {
  const state = useAuthStore.getState();
  const authKey = announcementAuthKey(state);
  if (cacheAuthKey !== authKey) {
    cacheAuthKey = authKey;
    invalidateAnnouncementsCache();
  }
  if (!authKey || !state.firebaseUser || !state.profile || (user && user.uid !== state.firebaseUser.uid)) return null;
  const targetOrgId = (orgId ?? state.profile.organizationId)?.trim();
  if (!targetOrgId || (state.profile.role !== "Admin" && targetOrgId !== state.profile.organizationId?.trim())) return null;
  return { user: state.firebaseUser, orgId: targetOrgId, cacheKey: JSON.stringify([authKey, targetOrgId]) };
}

export function invalidateAnnouncementsCache() {
  cacheGeneration += 1;
  announcementsCache.clear();
  inFlightAnnouncements.clear();
}

export async function fetchAnnouncements(user?: User | null, orgId?: string | null): Promise<Announcement[]> {
  const session = announcementReadSession(user, orgId);
  if (!session) return [];
  const { cacheKey } = session;
  const now = Date.now();
  const cached = announcementsCache.get(cacheKey);
  if (cached && now - cached.timestamp < 20000) {
    return cached.data;
  }
  if (inFlightAnnouncements.has(cacheKey)) {
    return inFlightAnnouncements.get(cacheKey)!;
  }

  const requestGeneration = cacheGeneration;
  const promise = (async () => {
    const params = new URLSearchParams({ orgId: session.orgId });
    const data = await announcementRequest(session.user, `?${params}`);
    // An old account's response cannot refill the cache or reach the next account.
    if (requestGeneration !== cacheGeneration || announcementReadSession(user, orgId)?.cacheKey !== cacheKey) return [];
    const list = Array.isArray(data.announcements) ? data.announcements : [];
    announcementsCache.set(cacheKey, { data: list, timestamp: Date.now() });
    return list;
  })();

  inFlightAnnouncements.set(cacheKey, promise);
  try { return await promise; }
  finally { if (inFlightAnnouncements.get(cacheKey) === promise) inFlightAnnouncements.delete(cacheKey); }
}

// All reads use the server's current organization, role and committee checks.
export function subscribeAnnouncementsFirestore(orgId: string | null | undefined, _userRole: string | undefined, onData: (announcements: Announcement[]) => void): () => void {
  let active = true;
  let generation = 0;
  let loadingGeneration: number | null = null;
  let blockedSessionKey: string | null = null;
  const targetOrgId = orgId?.trim();
  onData([]);
  if (!targetOrgId) return () => {};
  // Remove the old shared cache so restricted announcements cannot reappear on another account.
  try {
    if (typeof window !== "undefined") localStorage.removeItem("musubi_announcements_cache");
  } catch { /* Storage may be disabled; announcements still load from the API. */ }
  async function load() {
    if (!active) return;
    const session = announcementReadSession(null, targetOrgId);
    if (!session || loadingGeneration === generation || blockedSessionKey === session.cacheKey) return;
    const currentGeneration = generation;
    loadingGeneration = currentGeneration;
    try {
      const announcements = await fetchAnnouncements(session.user, targetOrgId);
      if (active && currentGeneration === generation && announcementReadSession(null, targetOrgId)?.cacheKey === session.cacheKey) onData(announcements);
    } catch (error) {
      if (active && currentGeneration === generation) {
        if (error instanceof AnnouncementRequestError && error.status === 403) blockedSessionKey = session.cacheKey;
        onData([]);
      }
    } finally {
      if (loadingGeneration === currentGeneration) loadingGeneration = null;
    }
  }
  void load();
  const interval = setInterval(() => {
    if (typeof document === "undefined" || !document.hidden) void load();
  }, 60000);
  const unsubscribeAuth = useAuthStore.subscribe((state, previous) => {
    if (announcementAuthKey(state) !== announcementAuthKey(previous)) {
      generation += 1;
      blockedSessionKey = null;
      announcementReadSession(null, targetOrgId);
      onData([]);
      void load();
    }
  });
  return () => { active = false; generation += 1; clearInterval(interval); unsubscribeAuth(); onData([]); };
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
  invalidateAnnouncementsCache();
  if (!data.announcement?.id) throw new Error("The announcement could not be saved.");
  return data.announcement;
}
