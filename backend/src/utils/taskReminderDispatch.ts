import type { Firestore } from "firebase-admin/firestore";
import { withTaskDependencyState } from "./taskDependencies.js";
import { campusDateKey, getTaskReminder, isTaskInactive, taskReminderId } from "./taskTiming.js";

type RecordData = Record<string, any>;
type EmailInput = { to: string; recipientName: string; recipientKind: "assignee" | "leader"; assigneeName: string; taskTitle: string; eventName: string; deadline: string; message: string; isUrgent: boolean; nudgeType: string };
type DispatchDependencies = {
  db: Firestore;
  sendEmail: (input: EmailInput) => Promise<{ success: boolean; error?: string }>;
  serverTimestamp: () => unknown;
  now?: Date;
};

function eventActive(event: RecordData) {
  return !isTaskInactive(event) && !["completed", "done"].includes(String(event.status).trim().toLowerCase());
}

function owns(task: RecordData, uid: string, user: RecordData) {
  if (task.assignedMemberUID) return task.assignedMemberUID === uid;
  const name = String(task.assignedMemberName || task.assignee?.name || "").trim().toLowerCase();
  return Boolean(name && name !== "unassigned" && name === String(user.fullName || "").trim().toLowerCase());
}

// Notifications are durable and unique per task/deadline/stage/recipient.
// Email attempts are reserved in the same transaction; never send inside a
// transaction callback, since Firestore may run that callback more than once.
export async function dispatchTaskReminders({ db, sendEmail, serverTimestamp, now = new Date() }: DispatchDependencies) {
  const events = await db.collection("events").get();
  const sentNudges: RecordData[] = [];
  const members = new Map<string, string[]>();
  for (const snapshot of events.docs) {
    const initial = snapshot.data();
    if (!initial.orgId || !eventActive(initial)) continue;
    if (!members.has(initial.orgId)) {
      const profiles = await db.collection("users").where("organizationId", "==", initial.orgId).get();
      members.set(initial.orgId, profiles.docs.map(doc => doc.id));
    }
    const memberIDs = members.get(initial.orgId)!;
    for (const original of initial.tasks || []) {
      if (!original.id || !getTaskReminder(original, now)) continue;
      const reservations = await db.runTransaction(async transaction => {
        const current = await transaction.get(snapshot.ref);
        const event = current.data();
        if (!event || !eventActive(event) || event.orgId !== initial.orgId) return [];
        const tasks = withTaskDependencyState<RecordData>(event.tasks || []);
        const task = tasks.find(item => item.id === original.id);
        const timing = task && getTaskReminder(task, now);
        if (!task || !timing?.deadline) return [];
        const profiles = await Promise.all(memberIDs.map(uid => transaction.get(db.collection("users").doc(uid))));
        const assignedProfile = profiles.find(profile => {
          const user = profile.data();
          return user && user.organizationId === event.orgId && owns(task, profile.id, user);
        });
        const assigneeName = assignedProfile?.data()?.fullName || task.assignedMemberName || task.assignee?.name || "Unassigned";
        const recipients = profiles.filter(profile => {
          const user = profile.data();
          return user && user.organizationId === event.orgId && !["inactive", "disabled"].includes(String(user.accountStatus || user.status).toLowerCase())
            && (owns(task, profile.id, user) || timing.kind === "overdue" && user.role === "Student Leader");
        });
        const refs = recipients.map(profile => db.collection("notifications").doc(taskReminderId(snapshot.id, task.id, timing.deadline!, timing.kind, profile.id)));
        const notices = await Promise.all(refs.map(ref => transaction.get(ref)));
        const nudges: RecordData[] = [...(task.nudges || [])];
        const reserved: Array<{ id: string; uid: string; input: EmailInput }> = [];
        const blockers = task.blockedBy ? ` Unfinished prerequisites: ${task.blockedByTaskTitles.join(", ")}.` : "";
        const label = timing.kind === "overdue" ? "Overdue" : timing.label;
        recipients.forEach((profile, index) => {
          const user = profile.data()!;
          const ref = refs[index];
          const recipientKind = owns(task, profile.id, user) ? "assignee" : "leader";
          const message = `${label}.${blockers} ${recipientKind === "leader"
            ? `Review this task${assignedProfile ? ` with ${assigneeName}` : " and its assignment"}. You can extend the deadline, reassign, or cancel after reviewing the situation; submissions remain available.`
            : timing.kind === "overdue" ? "Review the situation with your leader; submissions remain available." : "Please check your task progress."}`;
          if (!notices[index].exists) transaction.set(ref, {
            recipientUID: profile.id, orgId: event.orgId, eventId: snapshot.id, taskId: task.id,
            title: `${task.title || "Subtask"} (${label}${task.blockedBy ? " · Blocked" : ""})`,
            description: `${event.title || "Organization Event"}. Assigned to: ${assigneeName}.${blockers}`, type: "nudge", nudgeCategory: "deadline",
            recipientKind, assigneeUID: task.assignedMemberUID || assignedProfile?.id || null,
            dueDate: task.dueDate || task.deadline, deadlineKey: timing.deadline!.toISOString(), reminderKind: timing.kind,
            read: false, readBy: [], createdAt: serverTimestamp()
          });
          // Respect earlier successful reminders when adopting the new ledger.
          const legacyType = timing.kind === "approaching" ? "3 Days Prior" : timing.kind === "due-tomorrow" ? "1 Day Prior" : "";
          const alreadySent = nudges.some(nudge => nudge.nudgeUID === ref.id || !nudge.deadlineKey && nudge.sent && legacyType && nudge.nudgeType === legacyType && owns(task, profile.id, user));
          if (alreadySent || !user.email) return;
          nudges.push({ nudgeUID: ref.id, triggerDate: campusDateKey(now), nudgeType: timing.kind,
            deadlineKey: timing.deadline!.toISOString(), recipientUID: profile.id, sent: false,
            recipientKind, assigneeUID: task.assignedMemberUID || assignedProfile?.id || null,
            emailState: "reserved", emailReservedAt: now.toISOString() });
          reserved.push({ id: ref.id, uid: profile.id, input: { to: user.email, recipientName: user.fullName || "Team Member",
            recipientKind, assigneeName,
            taskTitle: task.title || "Subtask", eventName: event.title || "Organization Event", deadline: task.dueDate || task.deadline,
            message, isUrgent: ["overdue", "due-today"].includes(timing.kind),
            nudgeType: timing.kind === "due-tomorrow" ? "1_day_prior" : timing.kind === "due-today" ? "due_today" : timing.kind } });
        });
        if (reserved.length) transaction.update(snapshot.ref, { tasks: event.tasks.map((item: RecordData) => item.id === task.id ? { ...item, nudges } : item) });
        return reserved;
      });
      for (const reservation of reservations) {
        // A status/deadline/membership change after reservation suppresses delivery.
        const [latest, profile] = await Promise.all([snapshot.ref.get(), db.collection("users").doc(reservation.uid).get()]);
        const event = latest.data();
        const task = event?.tasks?.find((item: RecordData) => item.id === original.id);
        const timing = task && getTaskReminder(task, now);
        const user = profile.data();
        const eligible = event && eventActive(event) && timing?.deadline && user && user.organizationId === event.orgId
          && (owns(task, reservation.uid, user) || timing.kind === "overdue" && user.role === "Student Leader")
          && taskReminderId(snapshot.id, original.id, timing.deadline, timing.kind, reservation.uid) === reservation.id;
        let result: { success: boolean; error?: string } = { success: false };
        if (eligible) {
          try { result = await sendEmail(reservation.input); }
          catch (error) { result = { success: false, error: error instanceof Error ? error.message : "Email delivery failed" }; }
        }
        await db.runTransaction(async transaction => {
          const current = await transaction.get(snapshot.ref);
          const event = current.data();
          if (!event?.tasks) return;
          transaction.update(snapshot.ref, { tasks: event.tasks.map((task: RecordData) => task.id !== original.id ? task : {
            ...task, nudges: (task.nudges || []).map((nudge: RecordData) => nudge.nudgeUID !== reservation.id ? nudge : {
              ...nudge, sent: result.success, emailState: result.success ? "sent" : eligible ? "failed" : "suppressed",
              ...(result.success ? { sentAt: now.toISOString() } : result.error ? { emailError: result.error } : {})
            })
          }) });
        });
        if (result.success) sentNudges.push({ taskId: original.id, taskTitle: reservation.input.taskTitle, recipientEmail: reservation.input.to, nudgeType: reservation.input.nudgeType });
      }
    }
  }
  return { processedCount: sentNudges.length, sentNudges };
}
