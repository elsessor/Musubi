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
