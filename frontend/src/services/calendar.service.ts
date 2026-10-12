import type { User } from "firebase/auth";
import { useAuthStore } from "@/store/authStore";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

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

export type CalendarStatusResponse = {
  connected: boolean;
  email?: string;
  connectedAt?: string;
};

export async function getCalendarConnectUrl(
  user: User | null,
  returnOrigin?: string
): Promise<string> {
  const token = await getValidToken(user);
  if (!token) throw new Error("Sign in again to connect Google Calendar.");

  const origin = returnOrigin || (typeof window !== "undefined" ? window.location.origin : "");
  const query = origin ? `?returnOrigin=${encodeURIComponent(origin)}` : "";

  const response = await fetch(`${API_BASE_URL}/auth/calendar/google/connect-url${query}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Failed to generate Google Calendar authorization link.");
  }

  return data.url;
}

export async function getCalendarStatus(user: User | null): Promise<CalendarStatusResponse> {
  const token = await getValidToken(user);
  if (!token) return { connected: false };

  try {
    const response = await fetch(`${API_BASE_URL}/auth/calendar/google/status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return { connected: false };
    }

    return await response.json();
  } catch {
    return { connected: false };
  }
}

export async function disconnectCalendar(user: User | null): Promise<void> {
  const token = await getValidToken(user);
  if (!token) throw new Error("Sign in again to disconnect Google Calendar.");

  const response = await fetch(`${API_BASE_URL}/auth/calendar/google/disconnect`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Failed to disconnect Google Calendar.");
  }
}

export async function syncAllEventsToGoogle(
  user: User | null
): Promise<{ syncedCount: number }> {
  const token = await getValidToken(user);
  if (!token) throw new Error("Sign in again to sync events.");

  const response = await fetch(`${API_BASE_URL}/auth/calendar/google/sync-all`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Failed to sync events to Google Calendar.");
  }

  return { syncedCount: data.syncedCount || 0 };
}
