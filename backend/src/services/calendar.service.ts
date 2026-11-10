import { google } from "googleapis";
import { env } from "../config/env.js";
import { firestore } from "../config/firebase.js";
import { AppError } from "../utils/AppError.js";

/**
 * Returns an OAuth2 client configured with client ID, secret, and redirect URI.
 */
function getOAuth2Client(customRedirectUri?: string) {
  const redirectUri =
    customRedirectUri ||
    env.googleCalendarRedirectUri ||
    (process.env.NODE_ENV === "production"
      ? "https://musubi-backend-4roe.onrender.com/auth/calendar/google/callback"
      : "http://localhost:5000/auth/calendar/google/callback");

  if (!env.googleClientId || !env.googleClientSecret) {
    throw new AppError(
      "Google Calendar integration is not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.",
      503
    );
  }

  return new google.auth.OAuth2(env.googleClientId, env.googleClientSecret, redirectUri);
}

/**
 * Generates the Google OAuth 2.0 authorization URL for calendar access.
 */
export function generateGoogleCalendarAuthUrl(uid: string, returnOrigin?: string): string {
  if (!uid || typeof uid !== "string") {
    throw new AppError("Cannot generate calendar auth link: user UID is required.", 400);
  }

  const oauth2 = getOAuth2Client();

  // Encode state as base64url so we safely restore user context upon redirect
  const statePayload = JSON.stringify({ uid, returnOrigin: returnOrigin || env.frontendUrl });
  const state = Buffer.from(statePayload, "utf-8").toString("base64url");

  return oauth2.generateAuthUrl({
    access_type: "offline", // Essential to obtain refresh_token
    prompt: "consent", // Guarantees Google returns refresh_token on every connect
    include_granted_scopes: true,
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email"
    ],
    state
  });
}

/**
 * Handles the OAuth2 callback from Google, exchanges code for tokens, and stores them in Firestore.
 */
export async function handleGoogleCalendarCallback(
  code: string,
  state: string
): Promise<{ uid: string; returnOrigin: string }> {
  let uid = "";
  let returnOrigin = env.frontendUrl;

  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
    uid = decoded.uid || "";
    if (decoded.returnOrigin) {
      returnOrigin = decoded.returnOrigin;
    }
  } catch {
    throw new AppError("Invalid or expired OAuth state parameter.", 400);
  }

  if (!uid) {
    throw new AppError("User identity missing from callback state.", 400);
  }

  const oauth2 = getOAuth2Client();
  const { tokens } = await oauth2.getToken(code);

  if (!tokens.refresh_token) {
    // If user already authorized without prompt=consent, check if they already have one stored
    const existing = await firestore.collection("users").doc(uid).get();
    const existingToken = existing.data()?.googleCalendar?.refreshToken;
    if (!existingToken) {
      throw new AppError(
        "No refresh token was provided by Google. Please disconnect and reconnect to grant offline access.",
        400
      );
    }
    tokens.refresh_token = existingToken;
  }

  // Get user's Google email address for UI display
  let googleEmail: string | undefined;
  try {
    oauth2.setCredentials(tokens);
    const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 });
    const userinfo = await oauth2Api.userinfo.get();
    googleEmail = userinfo.data.email || undefined;
  } catch (err) {
    console.warn("[Calendar Callback] Failed to retrieve Google profile email:", err);
  }

  // Save to Firestore under user document
  await firestore.collection("users").doc(uid).set(
    {
      googleCalendar: {
        connected: true,
        refreshToken: tokens.refresh_token,
        email: googleEmail || null,
        connectedAt: new Date().toISOString()
      }
    },
    { merge: true }
  );

  return { uid, returnOrigin };
}

/**
 * Returns connection status and connected Google account info for a user.
 */
export async function getCalendarConnectionStatus(
  uid: string
): Promise<{ connected: boolean; email?: string; connectedAt?: string }> {
  const userDoc = await firestore.collection("users").doc(uid).get();
  const data = userDoc.data()?.googleCalendar;

  if (!data || !data.connected || !data.refreshToken) {
    return { connected: false };
  }

  return {
    connected: true,
    email: data.email || undefined,
    connectedAt: data.connectedAt || undefined
  };
}

/**
 * Disconnects Google Calendar integration for a user.
 */
export async function disconnectGoogleCalendar(uid: string): Promise<void> {
  const userDoc = await firestore.collection("users").doc(uid).get();
  const refreshToken = userDoc.data()?.googleCalendar?.refreshToken;

  if (refreshToken && env.googleClientId && env.googleClientSecret) {
    try {
      const oauth2 = getOAuth2Client();
      await oauth2.revokeToken(refreshToken);
    } catch (err) {
      console.warn("[Calendar Disconnect] Token revocation warning:", err);
    }
  }

  await firestore.collection("users").doc(uid).set(
    {
      googleCalendar: {
        connected: false,
        refreshToken: null,
        disconnectedAt: new Date().toISOString()
      }
    },
    { merge: true }
  );
}

/**
 * Helper to obtain an authenticated google.calendar instance for a specific user.
 */
async function getCalendarClientForUser(uid: string) {
  if (!env.googleClientId || !env.googleClientSecret) {
    return null;
  }

  const userDoc = await firestore.collection("users").doc(uid).get();
  const data = userDoc.data()?.googleCalendar;

  if (!data || !data.connected || !data.refreshToken) {
    return null;
  }

  const oauth2 = new google.auth.OAuth2(env.googleClientId, env.googleClientSecret);
  oauth2.setCredentials({ refresh_token: data.refreshToken });

  return google.calendar({ version: "v3", auth: oauth2 });
}

/**
 * Normalizes input date strings into Google Calendar start/end date objects.
 * Handles both "Oct 15, 2026" / "2026-10-15" (all-day) and ISO timestamp strings.
 */
function normalizeDateRangeForCalendar(
  startDateStr: string,
  endDateStr?: string
): {
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
} {
  const parseDate = (val?: string) => {
    if (!val) return new Date();
    const parsed = new Date(val);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  const startD = parseDate(startDateStr);
  const endD = parseDate(endDateStr || startDateStr);

  const isTimed = (startDateStr && startDateStr.includes("T") && startDateStr.includes(":")) || false;

  if (isTimed) {
    return {
      start: { dateTime: startD.toISOString() },
      end: { dateTime: endD > startD ? endD.toISOString() : new Date(startD.getTime() + 3600000).toISOString() }
    };
  }

  // All-day event formatting (YYYY-MM-DD)
  const formatYMD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const startYMD = formatYMD(startD);

  // Google Calendar all-day end dates are EXCLUSIVE. If start and end are same day,
  // end must be start + 1 day.
  const exclusiveEnd = new Date(endD.getTime());
  exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
  const endYMD = formatYMD(exclusiveEnd);

  return {
    start: { date: startYMD },
    end: { date: endYMD }
  };
}

/**
 * Inserts an event into the user's primary Google Calendar.
 */
export async function syncEventToGoogleCalendar(
  uid: string,
  event: {
    id?: string;
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    location?: string;
  }
): Promise<string | null> {
  const calendar = await getCalendarClientForUser(uid);
  if (!calendar) return null;

  const { start, end } = normalizeDateRangeForCalendar(event.startDate, event.endDate);

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: event.title,
      description:
        (event.description ? `${event.description}\n\n` : "") +
        "Synced from Musubi Campus Workflow (https://musubi-1bf94.web.app)",
      location: event.location || "Campus",
      start,
      end,
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 1440 }, // 1 day before
          { method: "popup", minutes: 120 } // 2 hours before
        ]
      }
    }
  });

  return response.data.id || null;
}

/**
 * Formats a task summary for Google Calendar.
 */
function getTaskSummary(taskTitle: string, eventTitle: string, status?: string): string {
  const isDone = (status || "").toLowerCase().includes("completed") || (status || "").toLowerCase().includes("done");
  return isDone ? `✅ [Done] Task: ${taskTitle} [${eventTitle}]` : `🎯 Task: ${taskTitle} [${eventTitle}]`;
}

/**
 * Formats task description for Google Calendar.
 */
function getTaskDescription(task: any, eventTitle: string): string {
  return [
    `Campus Event: ${eventTitle}`,
    `Task: ${task.title || "Subtask"}`,
    task.description ? `Description:\n${task.description}\n` : "",
    `Priority: ${task.priority || "Medium"}`,
    `Status: ${task.status || "To Do"}`,
    `Assignee: ${task.assignedMemberName || task.assignee?.name || "Unassigned"}`,
    "",
    "View on Musubi Workflow: https://musubi-1bf94.web.app/dashboard/events"
  ].filter(Boolean).join("\n");
}

/**
 * Inserts a subtask into the user's primary Google Calendar as an event on its deadline.
 */
export async function syncTaskToGoogleCalendar(
  uid: string,
  task: {
    title: string;
    description?: string;
    dueDate?: string;
    deadline?: string;
    startDate?: string;
    priority?: string;
    status?: string;
    assignedMemberName?: string;
  },
  eventTitle: string,
  fallbackDate?: string
): Promise<string | null> {
  const calendar = await getCalendarClientForUser(uid);
  if (!calendar) return null;

  const targetDate = task.dueDate || task.deadline || task.startDate || fallbackDate || new Date().toISOString();
  const startDate = task.startDate && task.startDate !== targetDate ? task.startDate : targetDate;
  const { start, end } = normalizeDateRangeForCalendar(startDate, targetDate);

  const summary = getTaskSummary(task.title || "Subtask", eventTitle, task.status);
  const description = getTaskDescription(task, eventTitle);

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary,
      description,
      location: "Campus",
      start,
      end,
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 1440 }, // 1 day before
          { method: "popup", minutes: 120 } // 2 hours before
        ]
      }
    }
  });

  return response.data.id || null;
}

/**
 * Updates an existing subtask on Google Calendar.
 */
export async function updateGoogleCalendarTask(
  uid: string,
  googleEventId: string,
  task: {
    title: string;
    description?: string;
    dueDate?: string;
    deadline?: string;
    startDate?: string;
    priority?: string;
    status?: string;
    assignedMemberName?: string;
  },
  eventTitle: string,
  fallbackDate?: string
): Promise<void> {
  const calendar = await getCalendarClientForUser(uid);
  if (!calendar || !googleEventId) return;

  const targetDate = task.dueDate || task.deadline || task.startDate || fallbackDate || new Date().toISOString();
  const startDate = task.startDate && task.startDate !== targetDate ? task.startDate : targetDate;
  const { start, end } = normalizeDateRangeForCalendar(startDate, targetDate);

  const summary = getTaskSummary(task.title || "Subtask", eventTitle, task.status);
  const description = getTaskDescription(task, eventTitle);

  try {
    await calendar.events.patch({
      calendarId: "primary",
      eventId: googleEventId,
      requestBody: {
        summary,
        description,
        start,
        end
      }
    });
  } catch (err: any) {
    if (err?.code === 404 || err?.code === 410 || err?.status === 404 || err?.status === 410) {
      console.log(`[Calendar Task] Task ${googleEventId} not found, re-inserting...`);
      await syncTaskToGoogleCalendar(uid, task, eventTitle, fallbackDate);
      return;
    }
    throw err;
  }
}

/**
 * Updates an existing Google Calendar event.
 */
export async function updateGoogleCalendarEvent(
  uid: string,
  googleEventId: string,
  event: {
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    location?: string;
  }
): Promise<void> {
  const calendar = await getCalendarClientForUser(uid);
  if (!calendar || !googleEventId) return;

  const { start, end } = normalizeDateRangeForCalendar(event.startDate, event.endDate);

  try {
    await calendar.events.patch({
      calendarId: "primary",
      eventId: googleEventId,
      requestBody: {
        summary: event.title,
        description:
          (event.description ? `${event.description}\n\n` : "") +
          "Synced from Musubi Campus Workflow (https://musubi-1bf94.web.app)",
        location: event.location || "Campus",
        start,
        end
      }
    });
  } catch (err: any) {
    if (err?.code === 404 || err?.code === 410 || err?.status === 404 || err?.status === 410) {
      console.log(`[Calendar Event] Event ${googleEventId} not found, re-inserting...`);
      await syncEventToGoogleCalendar(uid, event);
      return;
    }
    throw err;
  }
}

/**
 * Synchronizes an event and all its individual subtasks to the creator's Google Calendar.
 * Also syncs assigned tasks to assigned members' calendars if they connected.
 */
export async function syncEventAndTasksToGoogleCalendar(
  uid: string,
  event: {
    id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    tasks?: any[];
  }
): Promise<{ googleEventId: string | null; tasks: any[] }> {
  // 1. Sync parent event
  let googleEventId: string | null = null;
  try {
    googleEventId = await syncEventToGoogleCalendar(uid, {
      id: event.id,
      title: event.title,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate
    });
  } catch (err) {
    console.warn(`[Calendar] Failed syncing parent event ${event.id}:`, err);
  }

  // 2. Sync each subtask to Google Calendar
  const tasks = Array.isArray(event.tasks) ? [...event.tasks] : [];
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    if (task.archivedAt) continue;

    try {
      if (task.googleCalendarEventId) {
        // Update existing task event
        await updateGoogleCalendarTask(uid, task.googleCalendarEventId, task, event.title, event.endDate);
      } else {
        // Create new task event
        const taskId = await syncTaskToGoogleCalendar(uid, task, event.title, event.endDate);
        if (taskId) {
          tasks[i] = { ...task, googleCalendarEventId: taskId };
        }
      }
    } catch (taskErr) {
      console.warn(`[Calendar] Failed syncing task "${task.title}":`, taskErr);
    }
  }

  return { googleEventId, tasks };
}

/**
 * Deletes an event from Google Calendar.
 */
export async function deleteGoogleCalendarEvent(uid: string, googleEventId: string): Promise<void> {
  const calendar = await getCalendarClientForUser(uid);
  if (!calendar || !googleEventId) return;

  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId: googleEventId
    });
  } catch (err: any) {
    if (err?.code !== 404 && err?.code !== 410) {
      console.warn("[Calendar Delete] Failed to delete event on Google Calendar:", err);
    }
  }
}

/**
 * Syncs all active events and their atomized subtasks to the user's personal Google Calendar.
 */
export async function syncAllUserEventsToCalendar(uid: string): Promise<{ syncedCount: number }> {
  const calendar = await getCalendarClientForUser(uid);
  if (!calendar) {
    throw new AppError("Google Calendar is not connected. Please connect your account first.", 400);
  }

  const userDoc = await firestore.collection("users").doc(uid).get();
  const orgId = userDoc.data()?.organizationId;

  let query = firestore.collection("events") as FirebaseFirestore.Query;
  if (orgId) {
    query = query.where("orgId", "==", orgId);
  } else {
    query = query.where("createdBy", "==", uid);
  }

  const snapshot = await query.get();
  let count = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.status === "Archived") continue;

    let docUpdated = false;
    let eventGId = data.googleCalendarEventId;

    try {
      // 1. Sync parent event
      if (eventGId) {
        await updateGoogleCalendarEvent(uid, eventGId, {
          title: data.title || "Campus Event",
          description: data.description,
          startDate: data.startDate,
          endDate: data.endDate,
          location: data.location
        });
      } else {
        eventGId = await syncEventToGoogleCalendar(uid, {
          id: doc.id,
          title: data.title || "Campus Event",
          description: data.description,
          startDate: data.startDate,
          endDate: data.endDate,
          location: data.location
        });
        if (eventGId) {
          docUpdated = true;
        }
      }
      count++;

      // 2. Sync all subtasks for this event
      const tasks = Array.isArray(data.tasks) ? [...data.tasks] : [];
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        if (task.archivedAt) continue;

        try {
          if (task.googleCalendarEventId) {
            await updateGoogleCalendarTask(uid, task.googleCalendarEventId, task, data.title || "Campus Event", data.endDate);
          } else {
            const taskGId = await syncTaskToGoogleCalendar(uid, task, data.title || "Campus Event", data.endDate);
            if (taskGId) {
              tasks[i] = { ...task, googleCalendarEventId: taskGId };
              docUpdated = true;
            }
          }
          count++;
        } catch (tErr) {
          console.warn(`[Sync All] Failed syncing task ${task.id}:`, tErr);
        }
      }

      if (docUpdated) {
        await doc.ref.update({
          googleCalendarEventId: eventGId || null,
          tasks
        });
      }
    } catch (err: any) {
      const msg = String(err?.message || err?.cause?.message || "");
      if (
        err?.code === 403 ||
        err?.status === 403 ||
        msg.includes("insufficient authentication scopes") ||
        msg.includes("PERMISSION_DENIED")
      ) {
        throw new AppError(
          "Your Google Calendar authorization has insufficient permissions. Please click Disconnect and then Reconnect Google Calendar to grant calendar access.",
          403
        );
      }
      console.warn(`[Sync All] Failed syncing event ${doc.id}:`, err);
    }
  }

  return { syncedCount: count };
}

/**
 * Fetches Google Calendar events from the user's primary calendar.
 * Excludes events pushed by Musubi to avoid visual duplication.
 */
export async function getGoogleCalendarEventsForUser(
  uid: string,
  timeMin?: string,
  timeMax?: string
): Promise<
  Array<{
    id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    isAllDay: boolean;
    location: string;
    htmlLink: string;
    status: string;
  }>
> {
  const calendar = await getCalendarClientForUser(uid);
  if (!calendar) return [];

  const now = new Date();
  const defaultMin = timeMin || new Date(now.getFullYear(), 0, 1).toISOString();
  const defaultMax = timeMax || new Date(now.getFullYear() + 2, 0, 1).toISOString();

  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: defaultMin,
      timeMax: defaultMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 2500
    });

    const items = response.data.items || [];
    const results = [];

    for (const item of items) {
      if (!item.summary || item.status === "cancelled") continue;

      // Filter out Musubi's own synced items so they don't appear duplicated
      const isMusubiSynced = Boolean(
        item.description?.includes("Synced from Musubi Campus Workflow") ||
        item.description?.includes("https://musubi-1bf94.web.app")
      );
      if (isMusubiSynced) continue;

      const isAllDay = Boolean(item.start?.date && !item.start?.dateTime);
      let startDate = item.start?.dateTime || item.start?.date || "";
      let endDate = item.end?.dateTime || item.end?.date || startDate;

      // Adjust Google's exclusive end date for all-day events
      if (isAllDay && item.start?.date && item.end?.date) {
        const s = new Date(item.start.date);
        const e = new Date(item.end.date);
        const adjusted = new Date(e.getTime() - 86400000);
        if (adjusted >= s) {
          const yyyy = adjusted.getFullYear();
          const mm = String(adjusted.getMonth() + 1).padStart(2, "0");
          const dd = String(adjusted.getDate()).padStart(2, "0");
          endDate = `${yyyy}-${mm}-${dd}`;
        }
      }

      results.push({
        id: item.id || `gcal-${Math.random().toString(36).substring(2, 9)}`,
        title: item.summary,
        description: item.description || "",
        startDate,
        endDate,
        isAllDay,
        location: item.location || "",
        htmlLink: item.htmlLink || "",
        status: "Google Calendar"
      });
    }

    return results;
  } catch (err) {
    console.warn(`[Calendar Fetch] Error fetching Google Calendar events for ${uid}:`, err);
    return [];
  }
}


