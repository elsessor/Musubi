import fs from "node:fs";
import path from "node:path";
import { firebaseAdmin, firestore } from "../src/config/firebase.js";
import { getInvitationApplicantUID, invitationAsJoinRequest } from "../src/utils/invitationMigration.js";

function fieldTypes(data: FirebaseFirestore.DocumentData): Record<string, string> {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key,
    value === null ? "null" : Array.isArray(value) ? "array" : value instanceof firebaseAdmin.firestore.Timestamp ? "timestamp" : typeof value
  ]));
}

function serialize(value: unknown): unknown {
  if (value instanceof firebaseAdmin.firestore.Timestamp) return { firestoreType: "timestamp", seconds: value.seconds, nanoseconds: value.nanoseconds };
  if (value instanceof firebaseAdmin.firestore.DocumentReference) return { firestoreType: "reference", path: value.path };
  if (value instanceof firebaseAdmin.firestore.GeoPoint) return { firestoreType: "geopoint", latitude: value.latitude, longitude: value.longitude };
  if (Buffer.isBuffer(value)) return { firestoreType: "bytes", base64: value.toString("base64") };
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serialize(entry)]));
  return value;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const [invitations, joinRequests] = await Promise.all([
    firestore.collection("organization_invitations").get(),
    firestore.collection("organization_join_requests").get()
  ]);
  console.log(JSON.stringify({ mode: apply ? "apply" : "preview", projectId: firestore.projectId, invitations: invitations.size, joinRequests: joinRequests.size }));
  if (!apply) {
    for (const invitation of invitations.docs) {
      const data = invitation.data();
      const applicantUID = getInvitationApplicantUID(data);
      const applicant = typeof applicantUID === "string" && !applicantUID.includes("/")
        ? (await firestore.collection("users").doc(applicantUID).get()).data() : undefined;
      const matches = joinRequests.docs.filter((request) => {
        const existing = request.data();
        return existing.organizationId === data.organizationId && existing.requestedByUID === applicantUID;
      });
      console.log(JSON.stringify({ id: invitation.id, fields: fieldTypes(data), status: data.status, applicantUID,
        applicant: applicant ? { name: applicant.fullName, emailMatches: String(applicant.email || "").toLowerCase() === String(data.email || "").toLowerCase(), onboardingCompleted: applicant.onboardingCompleted, organizationId: applicant.organizationId } : null,
        matchingJoinRequests: matches.map(request => ({ id: request.id, status: request.data().status })) }));
    }
    return;
  }

  const backupDirectory = path.resolve(process.cwd(), ".local-backups");
  fs.mkdirSync(backupDirectory, { recursive: true });
  const backupPath = path.join(backupDirectory, `organization-invitations-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(backupPath, JSON.stringify({ projectId: firestore.projectId, capturedAt: new Date().toISOString(),
    documents: [...invitations.docs, ...joinRequests.docs].map(doc => ({ path: doc.ref.path, data: serialize(doc.data()), updateTime: serialize(doc.updateTime) }))
  }, null, 2), { flag: "wx" });
  console.log(JSON.stringify({ backupPath }));

  let moved = 0, deduplicated = 0, skipped = 0;
  for (const invitation of invitations.docs) {
    const result = await firestore.runTransaction(async transaction => {
      const source = await transaction.get(invitation.ref);
      if (!source.exists) return "skipped";
      const data = source.data()!;
      if (!source.updateTime?.isEqual(invitation.updateTime!)) return "skipped";
      const applicantUID = getInvitationApplicantUID(data);
      if (!applicantUID) return "skipped";
      const user = await transaction.get(firestore.collection("users").doc(applicantUID));
      if (!user.exists) return "skipped";
      let joinRequest: FirebaseFirestore.DocumentData;
      try { joinRequest = invitationAsJoinRequest(data, user.data()!); } catch { return "skipped"; }
      const organization = await transaction.get(firestore.collection("organizations").doc(joinRequest.organizationId));
      if (!organization.exists) return "skipped";
      const matches = await transaction.get(firestore.collection("organization_join_requests").where("requestedByUID", "==", applicantUID));
      const duplicate = matches.docs.find(request => request.data().organizationId === joinRequest.organizationId && request.data().status === joinRequest.status);
      if (duplicate) {
        transaction.delete(invitation.ref);
        return "deduplicated";
      }
      // A processed request must not be reopened by an old pending record.
      if (joinRequest.status === "pending" && matches.docs.some(request => request.data().organizationId === joinRequest.organizationId && ["accepted", "rejected"].includes(request.data().status))) return "skipped";
      const destination = firestore.collection("organization_join_requests").doc(invitation.id);
      const existing = await transaction.get(destination);
      if (existing.exists) return "skipped";
      transaction.create(destination, joinRequest);
      transaction.delete(invitation.ref);
      return "moved";
    });
    if (result === "moved") moved++;
    else if (result === "deduplicated") deduplicated++;
    else skipped++;
    console.log(JSON.stringify({ source: invitation.ref.path, result }));
  }
  const remaining = await firestore.collection("organization_invitations").get();
  console.log(JSON.stringify({ moved, deduplicated, skipped, remainingInvitations: remaining.size }));
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Migration failed"); process.exitCode = 1; });
