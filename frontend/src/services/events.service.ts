import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";

import { getFirebaseDb } from "../firebase/config";
import type { Event, EventStatus, Task } from "../components/events/types";
import { useAuthStore } from "@/store/authStore";
import { getDateRangeError } from "@/utils/dateRange";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

export type EventStatusSettings = {
  configured?: boolean;
  customStatuses: import("../components/events/statusUtils").CustomStatusConfig[];
  statusOrder: string[];
};

export async function eventStatusSettings(user: User | null, orgId: string | null | undefined, settings?: EventStatusSettings): Promise<EventStatusSettings> {
  const token = await getValidToken(user);
  if (!token) throw new Error("Sign in again to load status colors.");
  const query = new URLSearchParams(orgId ? { orgId } : {});
  const response = await fetch(`${API_BASE_URL}/auth/event-status-settings?${query}`, {
    method: settings ? "PATCH" : "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: settings ? JSON.stringify(settings) : undefined,
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Status colors could not be saved.");
  return data;
}

async function getValidToken(user: User | null): Promise<string> {
  const firebaseUser = user || useAuthStore.getState().firebaseUser;
  if (firebaseUser) {
    try {
      return await firebaseUser.getIdToken();
    } catch {
      return "";
    }
  }
  return "";
}

export function normalizeEvent(id: string, data: Record<string, any>): Event {
  return {
    id,
    title: typeof data.title === "string" ? data.title : "Untitled Event",
    description: typeof data.description === "string" ? data.description : "",
    status: (typeof data.status === "string" && data.status.trim()
      ? data.status.trim()
      : "Planning") as EventStatus,
    eventCustomStatuses: Array.isArray(data.eventCustomStatuses) ? data.eventCustomStatuses : [],
    startDate: typeof data.startDate === "string" ? data.startDate : "TBD",
    endDate: typeof data.endDate === "string" ? data.endDate : "TBD",
    memberCount: typeof data.memberCount === "number" ? data.memberCount : 0,
    progress: typeof data.progress === "number" ? data.progress : 0,
    committee: typeof data.committee === "string" ? data.committee : "General",
    tasks: Array.isArray(data.tasks)
      ? data.tasks.map((t: any) => ({
        ...t,
        title: typeof t.title === "string" && t.title.trim()
          ? t.title
          : typeof t.description === "string" && t.description.trim()
            ? t.description
            : "Untitled Subtask",
        description: typeof t.description === "string" ? t.description : ""
      }))
      : [],
    customStatuses: Array.isArray(data.customStatuses) ? data.customStatuses : [],
    statusOrder: Array.isArray(data.statusOrder) ? data.statusOrder : []
  };
}

export async function fetchEvents(user: User | null, orgId?: string | null, throwOnError = false): Promise<Event[]> {
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
      if (throwOnError) throw new Error("Unable to load your tasks. Please try again.");
    } catch (err) {
      if (throwOnError) throw err;
      console.warn("fetchEvents error:", err);
    }
  }
  if (throwOnError) throw new Error("Sign in again to load your tasks.");
  return [];
}

export function subscribeEventsFirestore(
  user: User | null,
  orgId: string | null | undefined,
  onData: (events: Event[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const targetOrgId = orgId && orgId.trim() ? orgId.trim() : null;

  let cancelled = false;
  const refresh = async () => {
    try {
      const events = await fetchEvents(user, targetOrgId, Boolean(onError));
      if (!cancelled) onData(events);
    } catch (error) {
      if (!cancelled) onError?.(error);
    }
  };
  void refresh();

  // 2. Poll every 25 seconds (and pause if tab is hidden) to preserve Firestore quota
  const interval = setInterval(() => {
    if (typeof document !== "undefined" && document.hidden) return;
    void refresh();
  }, 25000);

  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}

export async function createEventFirestore(
  user: User | null,
  orgId: string,
  event: Partial<Event>
): Promise<string> {
  const error = getDateRangeError(event.startDate, event.endDate);
  if (error) throw new Error(error);
  for (const task of event.tasks || []) {
    const taskError = getDateRangeError(task.startDate, task.dueDate || task.deadline, "Task");
    if (taskError) throw new Error(`${task.title || "Subtask"}: ${taskError}`);
  }
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
    committee: event.committee ?? "",
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

export async function deleteEventFirestore(user: User | null, eventId: string): Promise<void> {
  const token = await getValidToken(user);
  if (token) {
    const res = await fetch(`${API_BASE_URL}/auth/events/${eventId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(typeof err.message === "string" ? err.message : "Failed to delete event.");
    }
    return;
  }

  const db = getFirebaseDb();
  const docRef = doc(db, "events", eventId);
  await deleteDoc(docRef);
}

export async function clearMockEventsFirestore(user: User | null, orgId?: string): Promise<void> {
  const token = await getValidToken(user);
  if (token && orgId) {
    await fetch(`${API_BASE_URL}/auth/organizations/${orgId}/events`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    return;
  }
  try {
    const db = getFirebaseDb();
    const targetOrgId = orgId || "default-org";
    const q = query(collection(db, "events"), where("orgId", "==", targetOrgId));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
  } catch {
    // Ignore cleanup errors
  }
}

async function requestTask(user: User | null, eventId: string, taskId: string, path: string, init?: RequestInit): Promise<Response> {
  const token = await getValidToken(user);
  if (!token) throw new Error("Sign in again to update this subtask.");
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}/auth/events/${encodeURIComponent(eventId)}/tasks/${encodeURIComponent(taskId)}${path}`, { ...init, headers, cache: "no-store" });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(typeof error.message === "string" ? error.message : "Unable to update this subtask. Please try again.");
  }
  return response;
}

export async function updateTaskStatus(user: User | null, eventId: string, taskId: string, status: Task["status"]): Promise<Task> {
  const response = await requestTask(user, eventId, taskId, "/status", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  return (await response.json()).task;
}

export async function addTaskFileAttachment(user: User | null, eventId: string, taskId: string, file: File): Promise<Task> {
  const response = await requestTask(user, eventId, taskId, "/attachments/files", {
    method: "POST", headers: { "Content-Type": "application/octet-stream", "X-File-Name": encodeURIComponent(file.name), "X-File-Type": file.type || "application/octet-stream" }, body: file
  });
  return (await response.json()).task;
}

export async function addTaskLinkAttachment(user: User | null, eventId: string, taskId: string, input: { name: string; url: string }): Promise<Task> {
  const response = await requestTask(user, eventId, taskId, "/attachments/links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  return (await response.json()).task;
}

export async function downloadTaskAttachment(user: User | null, eventId: string, taskId: string, attachmentId: string): Promise<Blob> {
  const response = await requestTask(user, eventId, taskId, `/attachments/${encodeURIComponent(attachmentId)}`);
  return response.blob();
}

export async function rateTaskInEvent(
  user: User | null,
  eventId: string,
  taskId: string,
  rating: number,
  feedback?: string
): Promise<Task> {
  const response = await requestTask(user, eventId, taskId, "/rate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating, feedback })
  });
  return (await response.json()).task;
}

