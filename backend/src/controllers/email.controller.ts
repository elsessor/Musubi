import type { Request, Response } from "express";
import { firebaseAuth, firestore } from "../config/firebase.js";
import { sendNudgeNotificationEmail } from "../services/email.service.js";

export async function sendNudgeEmailController(req: Request, res: Response): Promise<void> {
  try {
    const { recipientEmail, recipientUID, taskTitle, eventName, deadline, message, isUrgent } = req.body;

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
      isUrgent: Boolean(isUrgent)
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
