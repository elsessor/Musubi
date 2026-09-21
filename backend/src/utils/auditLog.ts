import { firebaseAdmin, firestore } from "../config/firebase.js";

export type AuditCategory =
  | "User Management"
  | "Organization"
  | "AI Agent Actions"
  | "Security & Access"
  | "Events & Tasks";

export type AuditLogData = {
  orgId?: string | null;
  actorUID?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  actionCategory: AuditCategory;
  targetType?: string | null;
  targetName?: string | null;
  changes?: { field?: string; from?: unknown; to?: unknown } | Record<string, unknown> | null;
  reason?: string | null;
  context?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Writes a single audit log entry to the `audit_logs` Firestore collection.
 * Fire-and-forget — errors are swallowed so a logging failure never breaks a
 * user-facing request.
 */
export function writeAuditLog(data: AuditLogData): void {
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );

  firestore
    .collection("audit_logs")
    .add({
      ...cleanData,
      createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
    })
    .catch((err: unknown) => {
      console.error("[audit] Failed to write audit log:", err);
    });

  let notifType: "ai" | "task" | "organization" | "system" = "system";
  let title = "System Notification";

  if (data.actionCategory === "AI Agent Actions") {
    notifType = "ai";
    title = "AI Atomization Completed";
  } else if (data.actionCategory === "Events & Tasks") {
    notifType = "task";
    title = "Task / Event Activity";
  } else if (data.actionCategory === "Organization") {
    notifType = "organization";
    title = "Organization Update";
  }

  firestore
    .collection("notifications")
    .add({
      orgId: data.orgId ?? null,
      title,
      description: data.targetName
        ? `${data.action} on '${data.targetName}' by ${data.actorName ?? "System"}`
        : `${data.action} by ${data.actorName ?? "System"}`,
      type: notifType,
      read: false,
      readBy: [],
      createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
    })
    .catch((err: unknown) => {
      console.error("[notification] Failed to write notification from audit:", err);
    });
}
