import type { User } from "firebase/auth";
import { addDoc, collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { getFirebaseDb } from "@/firebase/config";
import type { Event, EventStatus, Task } from "@/components/events/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

async function fetchEventsApi(user: User | null, orgId: string | null): Promise<Event[]> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (user) {
      headers.Authorization = `Bearer ${await user.getIdToken()}`;
    }
    const queryStr = orgId ? `?orgId=${encodeURIComponent(orgId)}` : "";
    const res = await fetch(`${API_BASE_URL}/auth/events${queryStr}`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.events) ? data.events : [];
  } catch {
    return [];
  }
}

export function subscribeEventsFirestore(
  user: User | null,
  orgId: string | null,
  callback: (events: Event[]) => void
): () => void {
  let isCancelled = false;

  const fallbackToApi = () => {
    void fetchEventsApi(user, orgId).then((events) => {
      if (!isCancelled) {
        callback(events);
      }
    });
  };

  try {
    const db = getFirebaseDb();
    const eventsRef = collection(db, "events");

    const q = orgId ? query(eventsRef, where("orgId", "==", orgId)) : eventsRef;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (isCancelled) return;
        const events: Event[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            title: typeof data.title === "string" ? data.title : "Untitled Event",
            description: typeof data.description === "string" ? data.description : "",
            status: (data.status as EventStatus) ?? "Active",
            startDate: typeof data.startDate === "string" ? data.startDate : "",
            endDate: typeof data.endDate === "string" ? data.endDate : "",
            memberCount: typeof data.memberCount === "number" ? data.memberCount : 1,
            progress: typeof data.progress === "number" ? data.progress : 0,
            committee: typeof data.committee === "string" ? data.committee : "General",
            tasks: Array.isArray(data.tasks) ? (data.tasks as Task[]) : []
          };
        });
        callback(events);
      },
      (_error) => {
        // Suppress raw error to prevent Next.js dev overlay on permission denied
        fallbackToApi();
      }
    );

    return () => {
      isCancelled = true;
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  } catch (_err) {
    fallbackToApi();
    return () => {
      isCancelled = true;
    };
  }
}

export async function createEventFirestore(
  user: User | null,
  orgId: string,
  eventData: Omit<Event, "id"> | Partial<Event>
): Promise<string> {
  const payload = {
    ...eventData,
    orgId,
    createdBy: user?.uid ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    const db = getFirebaseDb();
    const eventsRef = collection(db, "events");
    const docRef = await addDoc(eventsRef, payload);
    return docRef.id;
  } catch (_err) {
    // Fallback to backend REST API (Admin SDK)
    if (user) {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      headers.Authorization = `Bearer ${await user.getIdToken()}`;
      const res = await fetch(`${API_BASE_URL}/auth/events`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        return data.id ?? "new-event-id";
      }
    }
    throw new Error("Unable to create event. Permission denied.");
  }
}

export async function updateEventFirestore(
  user: User | null,
  eventId: string,
  updates: Partial<Event>
): Promise<void> {
  const payload = {
    ...updates,
    updatedAt: new Date().toISOString()
  };

  try {
    const db = getFirebaseDb();
    const docRef = doc(db, "events", eventId);
    await updateDoc(docRef, payload);
  } catch (_err) {
    // Fallback to backend REST API (Admin SDK)
    if (user) {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      headers.Authorization = `Bearer ${await user.getIdToken()}`;
      await fetch(`${API_BASE_URL}/auth/events/${eventId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload)
      });
    }
  }
}
