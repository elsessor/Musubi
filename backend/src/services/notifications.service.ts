import { firebaseAdmin, firestore } from "../config/firebase.js";
import { AppError } from "../utils/AppError.js";
import { getCurrentUser } from "./auth.service.js";

function timestamp(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof (value as { toDate?: unknown }).toDate === "function") return (value as { toDate(): Date }).toDate().toISOString();
  return null;
}

export async function getNotificationsForUser(uid: string) {
  const user = await getCurrentUser(uid, true);
  let [personal, organization, pending, applicantRequests] = await Promise.all([
    firestore.collection("notifications").where("recipientUID", "==", uid).get(),
    user.organizationId ? firestore.collection("notifications").where("orgId", "==", user.organizationId).get() : null,
    user.role === "Student Leader" && user.organizationId
      ? firestore.collection("organization_join_requests").where("organizationId", "==", user.organizationId).where("status", "==", "pending").get() : null,
    firestore.collection("organization_join_requests").where("requestedByUID", "==", uid).get()
  ]);
  // Older pending requests may predate membership notifications.
  const existing = new Set(personal.docs.map((notice) => notice.id));
  let repaired = false;
  for (const request of pending?.docs ?? []) {
    const ref = firestore.collection("notifications").doc(`org_join_${request.id}_${uid}`);
    if (existing.has(ref.id) || request.data().requestedByUID === uid) continue;
    const created = await firestore.runTransaction(async (transaction) => {
      const currentUser = await transaction.get(firestore.collection("users").doc(uid));
      const currentRequest = await transaction.get(request.ref);
      const currentNotice = await transaction.get(ref);
      if (currentNotice.exists || currentUser.data()?.role !== "Student Leader" || currentUser.data()?.organizationId !== user.organizationId
        || currentRequest.data()?.status !== "pending" || currentRequest.data()?.organizationId !== user.organizationId) return false;
      const data = currentRequest.data()!;
      const createdAt = data.submittedAt ?? firebaseAdmin.firestore.FieldValue.serverTimestamp();
      transaction.create(ref, {
        orgId: user.organizationId, recipientUID: uid, joinRequestId: request.id, requestedByUID: data.requestedByUID,
        membershipEvent: "join-request", title: "New organization join request",
        description: `${data.name || "A user"} requested to join ${user.organizationName || "your organization"}. Review the request in Organization → Members.`,
        type: "organization", read: false, readBy: [], createdAt, updatedAt: createdAt
      });
      return true;
    });
    repaired ||= created;
  }
  for (const request of applicantRequests.docs) {
    const data = request.data();
    if (!["accepted", "rejected"].includes(data.status) || personal.docs.some((notice) => notice.data().joinRequestId === request.id && ["join-accepted", "join-rejected"].includes(notice.data().membershipEvent))) continue;
    const ref = firestore.collection("notifications").doc(`org_join_result_${request.id}_${uid}`);
    const created = await firestore.runTransaction(async (transaction) => {
      const currentRequest = await transaction.get(request.ref);
      const currentNotice = await transaction.get(ref);
      const current = currentRequest.data();
      if (currentNotice.exists || current?.requestedByUID !== uid || !["accepted", "rejected"].includes(current?.status) || typeof current?.organizationId !== "string") return false;
      const organization = await transaction.get(firestore.collection("organizations").doc(current.organizationId));
      const name = organization.data()?.name || "the organization", accepted = current.status === "accepted";
      const createdAt = current.reviewedAt ?? current.submittedAt ?? firebaseAdmin.firestore.FieldValue.serverTimestamp();
      transaction.create(ref, {
        orgId: current.organizationId, recipientUID: uid, joinRequestId: request.id, membershipEvent: accepted ? "join-accepted" : "join-rejected",
        title: accepted ? "Your join request was accepted" : "Your join request was declined",
        description: accepted ? `Your request to join ${name} was accepted.` : `${name} declined your join request. You can request to join another organization.`,
        type: "organization", read: false, readBy: [], createdAt, updatedAt: createdAt
      });
      return true;
    });
    repaired ||= created;
  }
  if (repaired) personal = await firestore.collection("notifications").where("recipientUID", "==", uid).get();
  const documents = new Map([...(organization?.docs ?? []), ...personal.docs].map((document) => [document.id, document]));
  return [...documents.values()].flatMap((document) => {
    const data = document.data();
    if (data.recipientUID ? data.recipientUID !== uid : !user.organizationId || data.orgId !== user.organizationId) return [];
    return [{
      id: document.id, orgId: typeof data.orgId === "string" ? data.orgId : null,
      recipientUID: typeof data.recipientUID === "string" ? data.recipientUID : null,
      title: typeof data.title === "string" ? data.title : "Notification", description: typeof data.description === "string" ? data.description : "",
      type: data.type, joinRequestId: data.joinRequestId, membershipEvent: data.membershipEvent,
      nudgeCategory: data.nudgeCategory, dueDate: data.dueDate,
      read: data.read === true, readBy: Array.isArray(data.readBy) ? data.readBy : [],
      createdAt: timestamp(data.createdAt), updatedAt: timestamp(data.updatedAt)
    }];
  }).sort((a, b) => (Date.parse(b.createdAt || "") || 0) - (Date.parse(a.createdAt || "") || 0));
}

export async function markNotificationsRead(uid: string, ids: string[]) {
  const user = await getCurrentUser(uid, true);
  await firestore.runTransaction(async (transaction) => {
    const documents = await Promise.all([...new Set(ids)].map((id) => transaction.get(firestore.collection("notifications").doc(id))));
    for (const document of documents) {
      if (!document.exists) continue;
      const data = document.data()!;
      if (data.recipientUID ? data.recipientUID !== uid : !user.organizationId || data.orgId !== user.organizationId) throw new AppError("You cannot update another user's notifications.", 403);
    }
    for (const document of documents) if (document.exists) transaction.update(document.ref, { readBy: firebaseAdmin.firestore.FieldValue.arrayUnion(uid) });
  });
}
