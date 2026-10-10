import { randomUUID } from "node:crypto";
import { firebaseAdmin, firestore } from "../config/firebase.js";
import { getCurrentUser } from "./auth.service.js";
import { writeAuditLog } from "../utils/auditLog.js";
import { AppError } from "../utils/AppError.js";
import { applyTaskStatusUpdate, assertCanContributeTask, assertEventAccess, isTaskLeader, type TaskActor, type TaskRecord } from "../utils/taskPermissions.js";
import { MAX_TASK_ATTACHMENTS, normalizeAttachmentContentType, splitAttachmentFile, validateAttachmentLink, validateAttachmentName, type TaskAttachment } from "../utils/taskAttachments.js";
import { recordTaskPerformance } from "../utils/taskPerformance.js";
import { appCache } from "../utils/cache.js";

function getTask(event: TaskRecord, taskId: string): TaskRecord {
  const task = Array.isArray(event.tasks) ? event.tasks.find((item: TaskRecord) => item.id === taskId) : null;
  if (!task) throw new AppError("Subtask not found.", 404);
  return task;
}

function eventReference(eventId: string) {
  if (!eventId || eventId.includes("/")) throw new AppError("Event not found.", 404);
  return firestore.collection("events").doc(eventId);
}

function logTaskAction(user: TaskActor, event: TaskRecord, task: TaskRecord, action: string) {
  writeAuditLog({ actorUID: user.uid, actorName: user.fullName, actorRole: user.role, action,
    actionCategory: "Events & Tasks", targetType: "Subtask", targetName: task.title || "Subtask", orgId: event.orgId || null });
}

export async function updateTaskStatusForUser(uid: string, eventId: string, taskId: string, input: unknown) {
  const user = await getCurrentUser(uid);
  const eventRef = eventReference(eventId);
  const result = await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(eventRef);
    if (!snapshot.exists) throw new AppError("Event not found.", 404);
    const event = snapshot.data() || {};
    const original = getTask(event, taskId);
    assertCanContributeTask(user, event.orgId, original);
    const updated = recordTaskPerformance([applyTaskStatusUpdate(original, input, event)], [original], { uid, fullName: user.fullName, isLeader: isTaskLeader(user) })[0];
    const tasks = event.tasks.map((task: TaskRecord) => task.id === taskId ? updated : task);
    const completedCount = tasks.filter((task: TaskRecord) => ["completed", "done"].includes(String(task.status).trim().toLowerCase())).length;
    transaction.update(eventRef, { tasks, progress: tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0, updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp() });
    return { event, task: updated };
  });
  appCache.deletePrefix("events_raw:");
  appCache.deletePrefix("members:");
  logTaskAction(user, result.event, result.task, `Updated subtask status to ${result.task.status}`);
  return { task: result.task };
}

async function saveAttachment(uid: string, eventId: string, taskId: string, attachment: TaskAttachment, chunks?: Buffer[]) {
  const user = await getCurrentUser(uid);
  const eventRef = eventReference(eventId);
  const fileRef = firestore.collection("taskFiles").doc(attachment.id);
  const result = await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(eventRef);
    if (!snapshot.exists) throw new AppError("Event not found.", 404);
    const event = snapshot.data() || {};
    const original = getTask(event, taskId);
    assertCanContributeTask(user, event.orgId, original);
    const attachments: TaskAttachment[] = Array.isArray(original.attachments) ? original.attachments : [];
    if (attachments.length >= MAX_TASK_ATTACHMENTS) throw new AppError(`A subtask can have up to ${MAX_TASK_ATTACHMENTS} attachments.`, 400);
    const saved = { ...attachment, uploadedByUID: uid, uploadedByName: user.fullName };
    const task = { ...original, attachments: [...attachments, saved] };
    if (chunks) {
      transaction.set(fileRef, { ...saved, eventId, taskId, orgId: event.orgId, chunkCount: chunks.length });
      chunks.forEach((bytes, index) => transaction.set(fileRef.collection("chunks").doc(String(index).padStart(4, "0")), { bytes }));
    }
    transaction.update(eventRef, { tasks: event.tasks.map((item: TaskRecord) => item.id === taskId ? task : item), updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp() });
    return { event, task };
  });
  appCache.deletePrefix("events_raw:");
  appCache.deletePrefix("members:");
  logTaskAction(user, result.event, result.task, `Added attachment: ${attachment.name}`);
  return { task: result.task };
}

export async function addTaskLinkForUser(uid: string, eventId: string, taskId: string, input: Record<string, unknown>) {
  const url = validateAttachmentLink(input.url);
  const name = validateAttachmentName(input.name || new URL(url).hostname);
  return saveAttachment(uid, eventId, taskId, { id: randomUUID(), type: "link", name, url, uploadedByUID: uid, uploadedByName: "", uploadedAt: new Date().toISOString() });
}

export async function addTaskFileForUser(uid: string, eventId: string, taskId: string, fileName: unknown, contentType: unknown, file: unknown) {
  const name = validateAttachmentName(fileName);
  if (!Buffer.isBuffer(file)) throw new AppError("Select a file to attach.", 400);
  const chunks = splitAttachmentFile(file);
  return saveAttachment(uid, eventId, taskId, {
    id: randomUUID(), type: "file", name, contentType: normalizeAttachmentContentType(contentType), size: file.length,
    uploadedByUID: uid, uploadedByName: "", uploadedAt: new Date().toISOString()
  }, chunks);
}

export async function downloadTaskFileForUser(uid: string, eventId: string, taskId: string, attachmentId: string) {
  const user = await getCurrentUser(uid);
  const eventSnapshot = await eventReference(eventId).get();
  if (!eventSnapshot.exists) throw new AppError("Event not found.", 404);
  const event = eventSnapshot.data() || {};
  assertEventAccess(user, event.orgId);
  const task = getTask(event, taskId);
  const attachment: TaskAttachment | undefined = task.attachments?.find((item: TaskAttachment) => item.id === attachmentId && item.type === "file");
  if (!attachment) throw new AppError("Attachment not found.", 404);
  const fileRef = firestore.collection("taskFiles").doc(attachment.id);
  const fileSnapshot = await fileRef.get();
  const metadata = fileSnapshot.data();
  if (!metadata || metadata.eventId !== eventId || metadata.taskId !== taskId) throw new AppError("Attachment not found.", 404);
  const chunkSnapshot = await fileRef.collection("chunks").orderBy(firebaseAdmin.firestore.FieldPath.documentId()).get();
  if (chunkSnapshot.size !== metadata.chunkCount) throw new AppError("This attachment is incomplete. Please try again.", 500);
  const bytes = Buffer.concat(chunkSnapshot.docs.map((chunk) => Buffer.from(chunk.data().bytes)));
  if (bytes.length !== metadata.size) throw new AppError("This attachment is incomplete. Please try again.", 500);
  return { attachment, bytes };
}

export async function rateTaskForUser(uid: string, eventId: string, taskId: string, input: unknown) {
  const user = await getCurrentUser(uid);
  const eventRef = eventReference(eventId);
  const ratingData = input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, any>) : {};
  const ratingNum = Number(ratingData.rating);
  const feedbackStr = typeof ratingData.feedback === "string" ? ratingData.feedback : "";
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    throw new AppError("Performance ratings must be between 1 and 5 stars.", 400);
  }
  const result = await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(eventRef);
    if (!snapshot.exists) throw new AppError("Event not found.", 404);
    const event = snapshot.data() || {};
    const original = getTask(event, taskId);
    assertEventAccess(user, event.orgId);
    const ratingTarget = {
      ...original,
      performanceReview: {
        rating: ratingNum,
        feedback: feedbackStr
      }
    };
    const updated = recordTaskPerformance([ratingTarget], [original], { uid, fullName: user.fullName, isLeader: isTaskLeader(user) })[0];
    const tasks = (event.tasks || []).map((task: TaskRecord) => (task.id === taskId ? updated : task));
    transaction.update(eventRef, { tasks, updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp() });
    return { event, task: updated };
  });
  appCache.deletePrefix("events_raw:");
  appCache.deletePrefix("members:");
  logTaskAction(user, result.event, result.task, `Rated subtask performance: ${ratingNum}/5 stars`);
  return { task: result.task };
}

