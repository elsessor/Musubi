import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";

import { getFirebaseDb } from "../firebase/config";
import type { Event, EventStatus } from "../components/events/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

async function getValidToken(user: User | null): Promise<string> {
  if (user) {
    try {
      return await user.getIdToken(true);
    } catch {
      return await user.getIdToken();
    }
  }
  return "";
}

export function normalizeEvent(id: string, data: Record<string, any>): Event {
  return {
    id,
    title: typeof data.title === "string" ? data.title : "Untitled Event",
    description: typeof data.description === "string" ? data.description : "",
    status: (["Active", "Planning", "Completed", "Archived"].includes(data.status)
      ? data.status
      : "Planning") as EventStatus,
    startDate: typeof data.startDate === "string" ? data.startDate : "TBD",
    endDate: typeof data.endDate === "string" ? data.endDate : "TBD",
    memberCount: typeof data.memberCount === "number" ? data.memberCount : 0,
    progress: typeof data.progress === "number" ? data.progress : 0,
    committee: typeof data.committee === "string" ? data.committee : "General",
    tasks: Array.isArray(data.tasks) ? data.tasks : []
  };
}

export async function fetchEvents(user: User | null, orgId?: string | null): Promise<Event[]> {
  const token = await getValidToken(user);
  if (token) {
    try {
      const queryParams = new URLSearchParams();
      if (orgId) queryParams.set("orgId", orgId);
      const res = await fetch(`${API_BASE_URL}/auth/events?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.events)) {
          return data.events.map((e: any) => normalizeEvent(e.id, e));
        }
      }
    } catch (err) {
      console.warn("fetchEvents error:", err);
    }
  }
  return [];
}

export function subscribeEventsFirestore(
  user: User | null,
  orgId: string | null | undefined,
  onData: (events: Event[]) => void
) {
  const targetOrgId = orgId && orgId.trim() ? orgId.trim() : null;

  // 1. Initial immediate fetch via secure backend API
  void fetchEvents(user, targetOrgId).then((events) => {
    if (events.length > 0) {
      onData(events);
    }
  });

  // 2. Poll every 2 seconds to keep live data synced with backend
  const interval = setInterval(() => {
    void fetchEvents(user, targetOrgId).then((events) => {
      onData(events);
    });
  }, 2000);

  // 3. Optional client snapshot listener fallback
  try {
    const db = getFirebaseDb();
    if (targetOrgId) {
      const q = query(collection(db, "events"), where("orgId", "==", targetOrgId));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const events = snapshot.docs.map((document) =>
              normalizeEvent(document.id, document.data())
            );
            onData(events);
          }
        },
        () => {}
      );
      return () => {
        clearInterval(interval);
        unsubscribe();
      };
    }
  } catch {}

  return () => {
    clearInterval(interval);
  };
}

export async function createEventFirestore(
  user: User | null,
  orgId: string,
  event: Partial<Event>
): Promise<string> {
  const token = await getValidToken(user);
  if (token) {
    const res = await fetch(`${API_BASE_URL}/auth/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ ...event, orgId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(typeof err.message === "string" ? err.message : "Failed to create event.");
    }
    const data = await res.json();
    return data.id;
  }

  const db = getFirebaseDb();
  const targetOrgId = orgId || "default-org";
  const docRef = await addDoc(collection(db, "events"), {
    title: event.title || "New Event",
    description: event.description || "",
    status: event.status || "Active",
    startDate: event.startDate || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    endDate: event.endDate || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    memberCount: event.memberCount || 1,
    progress: event.progress || 0,
    committee: event.committee || "General",
    tasks: event.tasks || [],
    orgId: targetOrgId,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export async function updateEventFirestore(
  user: User | null,
  eventId: string,
  update: Partial<Event>
): Promise<void> {
  const token = await getValidToken(user);
  if (token) {
    const res = await fetch(`${API_BASE_URL}/auth/events/${eventId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(update)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(typeof err.message === "string" ? err.message : "Failed to update event.");
    }
    return;
  }

  const db = getFirebaseDb();
  const docRef = doc(db, "events", eventId);
  await updateDoc(docRef, {
    ...update,
    updatedAt: serverTimestamp()
  });
}

export async function deleteEventFirestore(eventId: string): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, "events", eventId);
  await deleteDoc(docRef);
}
