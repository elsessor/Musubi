import type { Request, Response } from "express";
import { firebaseAuth, firestore } from "../config/firebase.js";
import { sendNudgeNotificationEmail } from "../services/email.service.js";

export async function sendNudgeEmailController(req: Request, res: Response): Promise<void> {
  try {
    const { recipientEmail, recipientUID, taskTitle, eventName, deadline, message, isUrgent, nudgeType } = req.body;

    if (!taskTitle) {
      res.status(400).json({ error: "taskTitle is required" });
      return;
    }

    let targetEmail = recipientEmail;
    let targetName = "Team Member";

    if (!targetEmail && recipientUID) {
      try {
        if (firebaseAuth) {
          const userRecord = await firebaseAuth.getUser(recipientUID);
          targetEmail = userRecord.email;
          targetName = userRecord.displayName || targetName;
        }
      } catch (e) {
        console.warn(`Could not fetch Firebase user record for UID ${recipientUID}:`, e);
      }

      if (!targetEmail) {
        try {
          if (firestore) {
            const userDoc = await firestore.collection("users").doc(recipientUID).get();
            if (userDoc.exists) {
              const data = userDoc.data();
              targetEmail = data?.email;
              targetName = data?.name || data?.displayName || targetName;
            }
          }
        } catch (e) {
          console.warn(`Could not fetch Firestore user doc for UID ${recipientUID}:`, e);
        }
      }
    }

    if (!targetEmail) {
      res.status(400).json({ error: "Valid recipientEmail or recipientUID is required to send email" });
      return;
    }

    const result = await sendNudgeNotificationEmail({
      to: targetEmail,
      recipientName: targetName,
      taskTitle,
      eventName,
      deadline,
      message,
      isUrgent: Boolean(isUrgent),
      nudgeType
    });

    if (result.success) {
      res.status(200).json({ success: true, messageId: result.messageId, recipientEmail: targetEmail });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (err: any) {
    console.error("Error in sendNudgeEmailController:", err);
    res.status(500).json({ error: err.message || "Failed to process email request" });
  }
}

export async function runDueNudgesCheck(): Promise<{ processedCount: number; sentNudges: any[] }> {
  if (!firestore) {
    throw new Error("Firestore not initialized");
  }

  const eventsSnapshot = await firestore.collection("events").get();
  const sentResults: Array<{ taskId: string; taskTitle: string; recipientEmail: string; nudgeType: string }> = [];

  const now = new Date();
  const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime();

  for (const doc of eventsSnapshot.docs) {
    const eventData = doc.data();
    const eventId = doc.id;
    const eventTitle = eventData.title || "Organization Event";
    const tasks: any[] = Array.isArray(eventData.tasks) ? eventData.tasks : [];
    let tasksUpdated = false;

    for (const task of tasks) {
      const isCompleted = (task.status || "").toLowerCase().includes("completed") || (task.status || "").toLowerCase().includes("done");
      if (isCompleted) continue;

      const dueDateStr = task.dueDate || task.deadline;
      if (!dueDateStr) continue;

      const dueDate = new Date(dueDateStr);
      if (isNaN(dueDate.getTime())) continue;

      const dueMidnight = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate())).getTime();
      const diffDays = Math.round((dueMidnight - todayMidnight) / (1000 * 3600 * 24));

      const nudges: any[] = Array.isArray(task.nudges) ? [...task.nudges] : [];
      let taskModified = false;

      let nudge3d = nudges.find((n) => n.nudgeType === "3 Days Prior");
      if (!nudge3d) {
        const threeDaysBefore = new Date(dueMidnight - 3 * 24 * 3600 * 1000).toISOString().split("T")[0];
        nudge3d = { nudgeUID: `${task.id}_3d`, triggerDate: threeDaysBefore, nudgeType: "3 Days Prior", sent: false };
        nudges.push(nudge3d);
        taskModified = true;
      }

      let nudge1d = nudges.find((n) => n.nudgeType === "1 Day Prior");
      if (!nudge1d) {
        const oneDayBefore = new Date(dueMidnight - 1 * 24 * 3600 * 1000).toISOString().split("T")[0];
        nudge1d = { nudgeUID: `${task.id}_1d`, triggerDate: oneDayBefore, nudgeType: "1 Day Prior", sent: false };
        nudges.push(nudge1d);
        taskModified = true;
      }

      let targetEmail = task.assignedMemberEmail || task.assigneeEmail || task.assignee?.email || "";
      let targetName = task.assignee?.name || task.assignedMemberName || "Team Member";

      if (!targetEmail && task.assignedMemberUID && firebaseAuth) {
        try {
          const userRecord = await firebaseAuth.getUser(task.assignedMemberUID);
          targetEmail = userRecord.email || "";
          targetName = userRecord.displayName || targetName;
        } catch {}
      }
      if (!targetEmail && task.assignedMemberUID) {
        try {
          const userDoc = await firestore.collection("users").doc(task.assignedMemberUID).get();
          if (userDoc.exists) {
            const uData = userDoc.data();
            targetEmail = uData?.email || "";
            targetName = uData?.name || uData?.displayName || targetName;
          }
        } catch {}
      }
      if (!targetEmail && targetName && targetName !== "Unassigned" && targetName !== "Team Member") {
        try {
          const usersQuery = await firestore.collection("users").where("name", "==", targetName).limit(1).get();
          if (!usersQuery.empty) {
            targetEmail = usersQuery.docs[0].data()?.email || "";
          }
        } catch {}
      }

      if (targetEmail) {
        // 3 Days Prior Nudge (diffDays <= 3 and > 1)
        if (diffDays <= 3 && diffDays > 1 && !nudge3d.sent) {
          const sendRes = await sendNudgeNotificationEmail({
            to: targetEmail,
            recipientName: targetName,
            taskTitle: task.title || "Subtask",
            eventName: eventTitle,
            deadline: dueDateStr,
            message: "Friendly Reminder: Your assigned task has 3 days remaining before the deadline.",
            isUrgent: false,
            nudgeType: "3_days_prior"
          });
          if (sendRes.success) {
            nudge3d.sent = true;
            nudge3d.sentAt = new Date().toISOString();
            taskModified = true;
            sentResults.push({ taskId: task.id, taskTitle: task.title, recipientEmail: targetEmail, nudgeType: "3 Days Prior" });
          }
        }

        // 1 Day Prior Nudge (diffDays <= 1 and >= 0)
        if (diffDays <= 1 && diffDays >= 0 && !nudge1d.sent) {
          const sendRes = await sendNudgeNotificationEmail({
            to: targetEmail,
            recipientName: targetName,
            taskTitle: task.title || "Subtask",
            eventName: eventTitle,
            deadline: dueDateStr,
            message: "Urgent Final Notice: Your assigned task is due tomorrow!",
            isUrgent: true,
            nudgeType: "1_day_prior"
          });
          if (sendRes.success) {
            nudge1d.sent = true;
            nudge1d.sentAt = new Date().toISOString();
            taskModified = true;
            sentResults.push({ taskId: task.id, taskTitle: task.title, recipientEmail: targetEmail, nudgeType: "1 Day Prior" });
          }
        }
      }

      if (taskModified) {
        task.nudges = nudges;
        tasksUpdated = true;
      }
    }

    if (tasksUpdated) {
      await firestore.collection("events").doc(eventId).update({ tasks });
    }
  }

  return { processedCount: sentResults.length, sentNudges: sentResults };
}

export async function checkDueNudgesController(_req: Request, res: Response): Promise<void> {
  try {
    const result = await runDueNudgesCheck();
    res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    console.error("Error in checkDueNudgesController:", err);
    res.status(500).json({ error: err.message || "Failed to check due nudges" });
  }
}
