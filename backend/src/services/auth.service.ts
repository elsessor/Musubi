import jwt, { type SignOptions } from "jsonwebtoken";

import { env } from "../config/env.js";
import { firebaseAdmin, firebaseAuth, firestore } from "../config/firebase.js";
import type { FirestoreUser, JwtPayload, LoginResponse, UserRole } from "../types/auth.types.js";
import { AppError } from "../utils/AppError.js";
import { writeAuditLog } from "../utils/auditLog.js";

const DEFAULT_ROLE: UserRole = "Organization Member";
const validRoles: UserRole[] = ["Admin", "Student Leader", "Organization Member"];

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && validRoles.includes(value as UserRole);
}

function createAppJwt(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"]
  };

  return jwt.sign(payload, env.jwtSecret, options);
}

function normalizeUserDocument(uid: string, data: FirebaseFirestore.DocumentData): FirestoreUser {
  const role = isUserRole(data.role) ? data.role : DEFAULT_ROLE;

  return {
    uid,
    fullName: typeof data.fullName === "string" ? data.fullName : "Campus Member",
    email: typeof data.email === "string" ? data.email : "",
    role,
    position: typeof data.position === "string" ? data.position : null,
    organizationId: typeof data.organizationId === "string" ? data.organizationId : null,
    organizationName: typeof data.organizationName === "string" ? data.organizationName : null,
    profilePicture: typeof data.profilePicture === "string" ? data.profilePicture : null,
    skills: Array.isArray(data.skills) ? data.skills.filter((skill): skill is string => typeof skill === "string") : [],
    onboardingCompleted: data.onboardingCompleted === true,
    createdAt: data.createdAt ?? firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    lastLogin: data.lastLogin ?? firebaseAdmin.firestore.FieldValue.serverTimestamp()
  };
}

async function getOrCreateUserDocument(uid: string): Promise<FirestoreUser> {
  const userRef = firestore.collection("users").doc(uid);
  const snapshot = await userRef.get();

  if (snapshot.exists) {
    const data = snapshot.data() ?? {};
    let orgName = typeof data.organizationName === "string" && data.organizationName.trim() ? data.organizationName : null;
    if (!orgName && typeof data.organizationId === "string" && data.organizationId.trim()) {
      try {
        const orgDoc = await firestore.collection("organizations").doc(data.organizationId).get();
        if (orgDoc.exists && typeof orgDoc.data()?.name === "string") {
          orgName = orgDoc.data()?.name;
          await userRef.update({ organizationName: orgName });
        }
      } catch (err) {
        console.error("[getOrCreateUserDocument] Error syncing organizationName:", err);
      }
    }
    const user = normalizeUserDocument(uid, { ...data, organizationName: orgName });
    await userRef.update({
      lastLogin: firebaseAdmin.firestore.FieldValue.serverTimestamp()
    });
    return user;
  }

  const firebaseUser = await firebaseAuth.getUser(uid);
  const user: FirestoreUser = {
    uid,
    fullName: firebaseUser.displayName ?? "Campus Member",
    email: firebaseUser.email ?? "",
    role: DEFAULT_ROLE,
    position: null,
    organizationId: null,
    organizationName: null,
    profilePicture: firebaseUser.photoURL ?? null,
    skills: [],
    onboardingCompleted: false,
    createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    lastLogin: firebaseAdmin.firestore.FieldValue.serverTimestamp()
  };

  await userRef.set(user);
  return user;
}

export async function loginWithFirebaseToken(idToken: string): Promise<LoginResponse> {
  if (!idToken) {
    throw new AppError("Firebase ID token is required.", 400);
  }

  const decodedToken = await firebaseAuth.verifyIdToken(idToken);
  const user = await getOrCreateUserDocument(decodedToken.uid);

  const payload: JwtPayload = {
    uid: user.uid,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId
  };

  writeAuditLog({
    actorUID: user.uid,
    actorName: user.fullName,
    actorRole: user.role,
    action: "User signed in",
    actionCategory: "Security & Access",
    targetType: "User",
    targetName: user.email,
    orgId: user.organizationId
  });

  return {
    token: createAppJwt(payload),
    role: user.role,
    user: {
      uid: user.uid,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      position: user.position,
      organizationId: user.organizationId,
      organizationName: user.organizationName,
      profilePicture: user.profilePicture,
      skills: user.skills,
      onboardingCompleted: user.onboardingCompleted
    }
  };
}

export function verifyAppJwt(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.jwtSecret) as JwtPayload;
  } catch {
    throw new AppError("Invalid or expired authorization token.", 401);
  }
}

export async function verifyAppJwtAsync(token: string): Promise<JwtPayload> {
  try {
    return jwt.verify(token, env.jwtSecret) as JwtPayload;
  } catch {
    try {
      const decoded = await firebaseAuth.verifyIdToken(token);
      const user = await getOrCreateUserDocument(decoded.uid);
      return {
        uid: user.uid,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      };
    } catch {
      throw new AppError("Invalid or expired authorization token.", 401);
    }
  }
}

export async function getCurrentUser(uid: string): Promise<LoginResponse["user"]> {
  const snapshot = await firestore.collection("users").doc(uid).get();

  if (!snapshot.exists) {
    throw new AppError("User profile was not found.", 404);
  }

  const user = normalizeUserDocument(uid, snapshot.data() ?? {});

  return {
    uid: user.uid,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    position: user.position,
    organizationId: user.organizationId,
    organizationName: user.organizationName,
    profilePicture: user.profilePicture,
    skills: user.skills,
    onboardingCompleted: user.onboardingCompleted
  };
}

export async function getOrganizationRequests(uid: string) {
  const user = await getCurrentUser(uid);
  if (user.role !== "Admin") throw new AppError("Administrator access is required.", 403);
  const snapshot = await firestore.collection("org_requests").orderBy("submittedAt", "desc").get();
  return snapshot.docs.map((request) => {
    const data = request.data();
    const submittedAt = data.submittedAt && typeof data.submittedAt.toDate === "function" ? data.submittedAt.toDate().toISOString() : null;
    return { id: request.id, ...data, submittedAt };
  });
}

export async function reviewOrganizationRequest(uid: string, requestId: string, status: "approved" | "rejected", rejectionReason: string | null) {
  const user = await getCurrentUser(uid);
  if (user.role !== "Admin") throw new AppError("Administrator access is required.", 403);
  const requestRef = firestore.collection("org_requests").doc(requestId);
  const requestSnapshot = await requestRef.get();
  if (!requestSnapshot.exists) throw new AppError("Organization request was not found.", 404);
  const request = requestSnapshot.data() ?? {};
  const cleanedRejectionReason = status === "rejected" ? (rejectionReason ?? null) : null;
  await requestRef.update({ status, rejectionReason: cleanedRejectionReason, reviewedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp() });
  if (status === "approved" && typeof request.organizationId === "string") {
    await firestore.collection("organizations").doc(request.organizationId).set({
      name: typeof request.orgName === "string" ? request.orgName : "Untitled organization",
      type: typeof request.orgType === "string" ? request.orgType : "Unspecified",
      description: typeof request.description === "string" ? request.description : "",
      status: "active", requestedByUID: typeof request.requestedBy?.uid === "string" ? request.requestedBy.uid : null,
      organizationConfig: {}, createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(), updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
  writeAuditLog({
    actorUID: uid,
    actorName: user.fullName,
    actorRole: user.role,
    action: status === "approved" ? "Organization request approved" : "Organization request rejected",
    actionCategory: "Organization",
    targetType: "Organization Request",
    targetName: typeof request.orgName === "string" ? request.orgName : requestId,
    reason: cleanedRejectionReason,
    changes: { field: "status", from: "pending", to: status }
  });
}

export async function getOrganizationForUser(uid: string, organizationId: string) {
  const user = await getCurrentUser(uid);
  if (user.role !== "Admin" && user.organizationId !== organizationId) throw new AppError("You do not have access to this organization.", 403);
  const snapshot = await firestore.collection("organizations").doc(organizationId).get();
  if (!snapshot.exists) throw new AppError("Organization profile is not available yet.", 404);

  const data = snapshot.data() ?? {};
  const asIsoString = (value: unknown): string | null =>
    value && typeof (value as { toDate?: unknown }).toDate === "function"
      ? ((value as { toDate: () => Date }).toDate()).toISOString()
      : null;

  return {
    id: snapshot.id,
    name: typeof data.name === "string" ? data.name : "Untitled organization",
    type: typeof data.type === "string" ? data.type : "Unspecified",
    description: typeof data.description === "string" ? data.description : "",
    status: typeof data.status === "string" ? data.status : "active",
    requestedByUID: typeof data.requestedByUID === "string" ? data.requestedByUID : null,
    organizationConfig:
      data.organizationConfig && typeof data.organizationConfig === "object" && !Array.isArray(data.organizationConfig)
        ? data.organizationConfig as Record<string, unknown>
        : {},
    createdAt: asIsoString(data.createdAt),
    updatedAt: asIsoString(data.updatedAt)
  };
}

export async function getOrganizationDirectory(uid: string) {
  await getCurrentUser(uid);
  const snapshot = await firestore.collection("organizations").orderBy("createdAt", "desc").get();
  return snapshot.docs
    .map((document) => normalizeOrganization(document.id, document.data()))
    .filter((organization) => organization.status === "active");
}

export async function joinOrganization(uid: string, organizationId: string) {
  const organization = await firestore.collection("organizations").doc(organizationId).get();
  if (!organization.exists || normalizeOrganization(organization.id, organization.data() ?? {}).status !== "active") {
    throw new AppError("This organization is not available to join.", 404);
  }
  const orgName = typeof organization.data()?.name === "string" ? organization.data()!.name : "Unknown Organization";
  const user = await getCurrentUser(uid);
  if (user.organizationId === organizationId) throw new AppError("You already belong to this organization.", 409);
  const existing = await firestore.collection("organization_join_requests").where("organizationId", "==", organizationId).where("requestedByUID", "==", uid).where("status", "==", "pending").limit(1).get();
  if (!existing.empty) throw new AppError("You already have a pending request for this organization.", 409);
  const request = await firestore.collection("organization_join_requests").add({ organizationId, requestedByUID: uid, name: user.fullName, email: user.email, position: user.position, skills: user.skills, status: "pending", submittedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp() });
  writeAuditLog({
    actorUID: uid,
    actorName: user.fullName,
    actorRole: user.role,
    action: "Submitted join request to organization",
    actionCategory: "Organization",
    targetType: "Organization",
    targetName: orgName,
    orgId: organizationId
  });
  return { id: request.id, status: "pending" as const };
}

export async function getOrganizationJoinRequests(uid: string, organizationId: string) {
  const user = await getCurrentUser(uid);
  if (user.role !== "Student Leader" || user.organizationId !== organizationId) throw new AppError("Only organization leaders can view join requests.", 403);
  const snapshot = await firestore.collection("organization_join_requests").where("organizationId", "==", organizationId).where("status", "==", "pending").get();
  return snapshot.docs.map((document) => { const data = document.data(); return { id: document.id, name: typeof data.name === "string" ? data.name : "Unnamed member", email: typeof data.email === "string" ? data.email : "", position: typeof data.position === "string" ? data.position : "Organization Member", skills: Array.isArray(data.skills) ? data.skills.filter((skill): skill is string => typeof skill === "string") : [] }; });
}

export async function getMyOrganizationJoinRequest(uid: string) {
  const snapshot = await firestore.collection("organization_join_requests").where("requestedByUID", "==", uid).where("status", "==", "pending").limit(1).get();
  if (snapshot.empty) return null;
  const request = snapshot.docs[0];
  const organization = await firestore.collection("organizations").doc(request.data().organizationId).get();
  return { id: request.id, organizationId: request.data().organizationId, organizationName: organization.exists && typeof organization.data()?.name === "string" ? organization.data()?.name : "this organization" };
}

export async function reviewOrganizationJoinRequest(uid: string, organizationId: string, requestId: string, status: "accepted" | "rejected") {
  const leader = await getCurrentUser(uid);
  if (leader.role !== "Student Leader" || leader.organizationId !== organizationId) throw new AppError("Only organization leaders can review join requests.", 403);
  const ref = firestore.collection("organization_join_requests").doc(requestId);
  const snapshot = await ref.get();
  const request = snapshot.data();
  if (!snapshot.exists || request?.organizationId !== organizationId || request.status !== "pending" || typeof request.requestedByUID !== "string") throw new AppError("Join request was not found.", 404);
  await ref.update({ status, reviewedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(), reviewedByUID: uid });
  if (status === "accepted") {
    const orgDoc = await firestore.collection("organizations").doc(organizationId).get();
    const orgName = orgDoc.exists && typeof orgDoc.data()?.name === "string" ? orgDoc.data()?.name : null;
    await firestore.collection("users").doc(request.requestedByUID).set({ organizationId, ...(orgName ? { organizationName: orgName } : {}) }, { merge: true });
  }
  writeAuditLog({
    actorUID: uid,
    actorName: leader.fullName,
    actorRole: leader.role,
    action: status === "accepted" ? "Member join request accepted" : "Member join request rejected",
    actionCategory: "Organization",
    targetType: "User",
    targetName: typeof request?.name === "string" ? request.name : request?.requestedByUID,
    orgId: organizationId,
    changes: { field: "status", from: "pending", to: status }
  });
}

export async function createOrganization(uid: string, input: { name: string; type: string; description: string }) {
  const user = await getCurrentUser(uid);
  if (user.role !== "Student Leader") throw new AppError("Only student leaders can create organizations.", 403);
  const ref = firestore.collection("organizations").doc();
  await ref.set({
    name: input.name.trim(), type: input.type.trim(), description: input.description.trim(), status: "pending", requestedByUID: uid,
    organizationConfig: {}, createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(), updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
  });
  await firestore.collection("users").doc(uid).set({ organizationId: ref.id, organizationName: input.name.trim() }, { merge: true });
  await firestore.collection("org_requests").add({
    organizationId: ref.id, orgName: input.name.trim(), orgType: input.type.trim(), description: input.description.trim(), status: "pending", rejectionReason: null,
    submittedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(), requestedBy: { uid, name: user.fullName, email: user.email }
  });
  writeAuditLog({
    actorUID: uid,
    actorName: user.fullName,
    actorRole: user.role,
    action: "Organization created and submitted for approval",
    actionCategory: "Organization",
    targetType: "Organization",
    targetName: input.name.trim(),
    orgId: ref.id
  });
  return { organization: normalizeOrganization(ref.id, (await ref.get()).data() ?? {}), user: await getCurrentUser(uid) };
}

export async function getOrganizationMembers(uid: string, organizationId: string) {
  const user = await getCurrentUser(uid);
  if (user.role !== "Admin" && user.organizationId !== organizationId) throw new AppError("You do not have access to these members.", 403);
  const snapshot = await firestore.collection("users").where("organizationId", "==", organizationId).get();
  return snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      name: typeof data.fullName === "string" ? data.fullName : "Unnamed member",
      role: typeof data.role === "string" ? data.role : "Organization Member",
      position: typeof data.position === "string" ? data.position : "Organization Member",
      skills: Array.isArray(data.skills) ? data.skills.filter((skill): skill is string => typeof skill === "string") : [],
      committeeId: typeof data.committeeId === "string" ? data.committeeId : null,
      committeeName: typeof data.committeeName === "string" ? data.committeeName : null
    };
  });
}

export async function getOrganizationCommittees(uid: string, organizationId: string) {
  const user = await getCurrentUser(uid);
  if (user.role !== "Admin" && user.organizationId !== organizationId) throw new AppError("You do not have access to these committees.", 403);
  const organizationRef = firestore.collection("organizations").doc(organizationId);
  const snapshot = await firestore.collection("committees").where("orgId", "==", organizationRef).get();
  return snapshot.docs.map((document) => {
    const data = document.data();
    const createdAt = data.createdAt && typeof data.createdAt.toMillis === "function" ? data.createdAt.toMillis() : 0;
    return { id: document.id, name: typeof data.name === "string" ? data.name : "Untitled committee", description: typeof data.description === "string" ? data.description : "", headMemberUID: typeof data.headMemberUID === "string" ? data.headMemberUID : null, createdAt };
  }).sort((left, right) => left.createdAt - right.createdAt).map(({ createdAt: _createdAt, ...committee }) => committee);
}

export async function createOrganizationCommittee(
  uid: string,
  organizationId: string,
  input: { name: string; description: string; headMemberId: string | null; memberIds: string[] }
) {
  const user = await getCurrentUser(uid);
  if (user.role !== "Student Leader" || user.organizationId !== organizationId) {
    throw new AppError("Only this organization's student leader can create committees.", 403);
  }

  const organizationRef = firestore.collection("organizations").doc(organizationId);
  if (!(await organizationRef.get()).exists) throw new AppError("Organization was not found.", 404);

  const memberIds = Array.from(new Set(input.memberIds));
  if (input.headMemberId && !memberIds.includes(input.headMemberId)) memberIds.unshift(input.headMemberId);
  const memberSnapshots = await Promise.all(memberIds.map((memberId) => firestore.collection("users").doc(memberId).get()));
  if (memberSnapshots.some((snapshot) => !snapshot.exists || snapshot.data()?.organizationId !== organizationId)) {
    throw new AppError("Every committee member must belong to this organization.", 400);
  }

  const committeeRef = firestore.collection("committees").doc();
  const batch = firestore.batch();
  batch.set(committeeRef, {
    orgId: organizationRef,
    name: input.name.trim(),
    description: input.description.trim(),
    headMemberUID: input.headMemberId,
    createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
  });
  for (const snapshot of memberSnapshots) {
    batch.set(snapshot.ref, { committeeId: committeeRef.id, committeeName: input.name.trim() }, { merge: true });
  }
  await batch.commit();
  writeAuditLog({ actorUID: uid, actorName: user.fullName, actorRole: user.role, action: "Committee created", actionCategory: "Organization", targetType: "Committee", targetName: input.name.trim(), orgId: organizationId });
  return { id: committeeRef.id, name: input.name.trim(), description: input.description.trim(), headMemberUID: input.headMemberId };
}

export async function addMembersToOrganizationCommittee(uid: string, organizationId: string, committeeId: string, memberIds: string[]) {
  const user = await getCurrentUser(uid);
  if (user.role !== "Student Leader" || user.organizationId !== organizationId) throw new AppError("Only this organization's student leader can manage committee members.", 403);
  const organizationRef = firestore.collection("organizations").doc(organizationId);
  const committeeSnapshot = await firestore.collection("committees").doc(committeeId).get();
  if (!committeeSnapshot.exists || committeeSnapshot.data()?.orgId?.path !== organizationRef.path) throw new AppError("Committee was not found.", 404);
  const committeeName = typeof committeeSnapshot.data()?.name === "string" ? committeeSnapshot.data()!.name : "Committee";
  const uniqueMemberIds = Array.from(new Set(memberIds));
  const members = await Promise.all(uniqueMemberIds.map((memberId) => firestore.collection("users").doc(memberId).get()));
  if (members.some((member) => !member.exists || member.data()?.organizationId !== organizationId)) throw new AppError("Every selected user must belong to this organization.", 400);
  const batch = firestore.batch();
  members.forEach((member) => batch.set(member.ref, { committeeId, committeeName }, { merge: true }));
  await batch.commit();
  return { memberIds: uniqueMemberIds };
}

function normalizeOrganization(id: string, data: FirebaseFirestore.DocumentData) {
  const asIsoString = (value: unknown): string | null => value && typeof (value as { toDate?: unknown }).toDate === "function" ? ((value as { toDate: () => Date }).toDate()).toISOString() : null;
  return {
    id,
    name: typeof data.name === "string" ? data.name : "Untitled organization",
    type: typeof data.type === "string" ? data.type : "Unspecified",
    description: typeof data.description === "string" ? data.description : "",
    status: typeof data.setupStatus === "string" ? data.setupStatus : typeof data.status === "string" ? data.status : "pending",
    requestedByUID: typeof data.requestedByUID === "string" ? data.requestedByUID : null,
    organizationConfig: data.orchestrationConfig && typeof data.orchestrationConfig === "object" ? data.orchestrationConfig : data.organizationConfig && typeof data.organizationConfig === "object" ? data.organizationConfig : {},
    createdAt: asIsoString(data.createdAt),
    updatedAt: asIsoString(data.updatedAt)
  };
}

async function requireAdmin(uid: string) {
  const user = await getCurrentUser(uid);
  if (user.role !== "Admin") throw new AppError("Administrator access is required.", 403);
  return user;
}

export async function getOrganizationsForAdmin(uid: string) {
  await requireAdmin(uid);
  const snapshot = await firestore.collection("organizations").orderBy("createdAt", "desc").get();
  return Promise.all(snapshot.docs.map(async (document) => {
    const [members, memberRecords, committees] = await Promise.all([
      firestore.collection("users").where("organizationId", "==", document.id).get(),
      document.ref.collection("members").get(),
      document.ref.collection("committees").get()
    ]);
    return { ...normalizeOrganization(document.id, document.data()), memberCount: memberRecords.size || members.size, committeeCount: committees.size };
  }));
}

export async function getOrganizationManagementDetail(uid: string, organizationId: string) {
  await requireAdmin(uid);
  const ref = firestore.collection("organizations").doc(organizationId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new AppError("Organization was not found.", 404);
  const [usersSnapshot, membersSnapshot, committeesSnapshot, goalsSnapshot] = await Promise.all([
    firestore.collection("users").where("organizationId", "==", organizationId).get(),
    ref.collection("members").get(),
    ref.collection("committees").get(),
    ref.collection("goals").get()
  ]);
  const memberSource = membersSnapshot.size ? membersSnapshot : usersSnapshot;
  const members = memberSource.docs.map((document) => { const data = document.data(); return { id: document.id, name: typeof data.fullName === "string" ? data.fullName : typeof data.name === "string" ? data.name : "Unnamed member", role: typeof data.role === "string" ? data.role : "Organization Member", position: typeof data.position === "string" ? data.position : "—", committeeId: typeof data.committeeId === "string" ? data.committeeId : null }; });
  const committees = committeesSnapshot.docs.map((document) => { const data = document.data(); return { id: document.id, name: typeof data.name === "string" ? data.name : "Untitled committee", headMemberId: typeof data.headMemberId === "string" ? data.headMemberId : null, description: typeof data.description === "string" ? data.description : "" }; });
  const goalSummary = goalsSnapshot.docs.reduce<Record<string, number>>((summary, document) => { const status = typeof document.data().status === "string" ? document.data().status : "pending"; summary[status] = (summary[status] ?? 0) + 1; return summary; }, {});
  return { organization: normalizeOrganization(snapshot.id, snapshot.data() ?? {}), members, committees, goalSummary };
}

export async function updateOrganizationForAdmin(uid: string, organizationId: string, input: { name?: string; type?: string; description?: string; setupStatus?: string }) {
  const currentUser = await getCurrentUser(uid);
  if (currentUser.role !== "Admin" && currentUser.organizationId !== organizationId) {
    throw new AppError("Organization leader or administrator access is required.", 403);
  }
  const ref = firestore.collection("organizations").doc(organizationId);
  const before = await ref.get();
  if (!before.exists) throw new AppError("Organization was not found.", 404);
  const update: Record<string, unknown> = { updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp() };
  if (input.name !== undefined) update.name = input.name.trim();
  if (input.type !== undefined) update.type = input.type.trim();
  if (input.description !== undefined) update.description = input.description.trim();
  if (input.setupStatus !== undefined) update.setupStatus = input.setupStatus;
  await ref.update(update);
  const updated = await ref.get();
  const orgName = typeof before.data()?.name === "string" ? before.data()!.name : organizationId;
  if (input.setupStatus !== undefined) {
    writeAuditLog({
      actorUID: uid,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: "Organization status updated",
      actionCategory: "Organization",
      targetType: "Organization",
      targetName: orgName,
      orgId: organizationId,
      changes: { field: "setupStatus", from: before.data()?.setupStatus ?? before.data()?.status, to: input.setupStatus }
    });
  } else {
    writeAuditLog({
      actorUID: uid,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: currentUser.role === "Admin" ? "Organization details updated by administrator" : "Organization details updated",
      actionCategory: "Organization",
      targetType: "Organization",
      targetName: orgName,
      orgId: organizationId
    });
  }
  return normalizeOrganization(updated.id, updated.data() ?? {});
}

export async function completeUserOnboarding(
  uid: string,
  input: { role: Exclude<UserRole, "Admin">; position: string; organizationId: string | null; yearLevel: string; program: string; skills: string[]; organizationRequest?: { organizationId: string; orgName: string; orgType: string; description: string } }
): Promise<LoginResponse> {
  if (!input.position.trim() || !input.yearLevel || !input.program) {
    throw new AppError("Complete the required onboarding details.", 400);
  }

  let orgName: string | null = null;
  if (input.organizationRequest?.orgName) {
    orgName = input.organizationRequest.orgName.trim();
  } else if (input.organizationId) {
    try {
      const orgDoc = await firestore.collection("organizations").doc(input.organizationId).get();
      if (orgDoc.exists && typeof orgDoc.data()?.name === "string") {
        orgName = orgDoc.data()?.name;
      }
    } catch (err) {
      console.error("[completeOnboarding] Error resolving org name:", err);
    }
  }

  const userRef = firestore.collection("users").doc(uid);
  await userRef.set({
    role: input.role,
    position: input.position.trim(),
    organizationId: input.organizationId,
    ...(orgName ? { organizationName: orgName } : {}),
    yearLevel: input.yearLevel,
    program: input.program,
    skills: input.skills,
    onboardingCompleted: true,
    lastLogin: firebaseAdmin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  if (input.organizationRequest) {
    const currentUser = await getCurrentUser(uid);
    await firestore.collection("org_requests").add({
      organizationId: input.organizationRequest.organizationId,
      orgName: input.organizationRequest.orgName,
      orgType: input.organizationRequest.orgType,
      description: input.organizationRequest.description,
      status: "pending",
      rejectionReason: null,
      submittedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      requestedBy: { uid, name: currentUser.fullName, email: currentUser.email }
    });
  }

  const user = await getCurrentUser(uid);
  writeAuditLog({
    actorUID: uid,
    actorName: user.fullName,
    actorRole: user.role,
    action: "User completed onboarding",
    actionCategory: "User Management",
    targetType: "User",
    targetName: user.email,
    orgId: user.organizationId,
    changes: { field: "role", from: "new user", to: input.role }
  });
  return { token: createAppJwt({ uid: user.uid, email: user.email, role: user.role, organizationId: user.organizationId }), role: user.role, user };
}

export const recordAuditLog = writeAuditLog;

export async function getMembersForAdmin(uid: string) {
  await requireAdmin(uid);
  const usersSnapshot = await firestore.collection("users").get();
  const orgsSnapshot = await firestore.collection("organizations").get();

  const orgMap = new Map<string, string>();
  orgsSnapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    if (typeof data.name === "string") {
      orgMap.set(docSnap.id, data.name);
    }
  });

  return usersSnapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    const role = isUserRole(data.role) ? data.role : "Organization Member";
    const fullName = typeof data.fullName === "string" ? data.fullName : (typeof data.name === "string" ? data.name : "Campus Member");
    const email = typeof data.email === "string" ? data.email : "";
    const position = typeof data.position === "string" && data.position.trim() ? data.position : (role === "Admin" ? "System Administrator" : role);
    const orgId = typeof data.organizationId === "string" ? data.organizationId : null;
    const organizationName = (orgId && orgMap.get(orgId)) || (typeof data.organizationName === "string" ? data.organizationName : "University Campus");
    const committee = typeof data.committee === "string" && data.committee.trim() ? data.committee : "Executive Committee";
    const inviteStatus = typeof data.inviteStatus === "string" ? data.inviteStatus : (data.onboardingCompleted ? "Active" : "Pending Invite");
    const joinedDate = data.createdAt && typeof (data.createdAt as { toDate?: () => Date }).toDate === "function"
      ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format((data.createdAt as { toDate: () => Date }).toDate())
      : "Jan 15, 2025";

    return {
      id: docSnap.id,
      name: fullName,
      email,
      role,
      position,
      organization: organizationName,
      committee,
      inviteStatus,
      joinedDate
    };
  });
}

export async function updateMemberRoleForAdmin(uid: string, targetUid: string, input: { role: string; position: string }) {
  const adminUser = await requireAdmin(uid);
  const userRef = firestore.collection("users").doc(targetUid);
  const snap = await userRef.get();
  if (!snap.exists) throw new AppError("Member record was not found.", 404);
  const targetData = snap.data() ?? {};

  await userRef.update({
    role: input.role,
    position: input.position,
    updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
  });

  writeAuditLog({
    actorUID: uid,
    actorName: adminUser.fullName,
    actorRole: "Admin",
    action: "UPDATE_ROLE",
    actionCategory: "User Management",
    targetType: "UserRole",
    targetName: typeof targetData.fullName === "string" ? targetData.fullName : targetUid,
    reason: `Changed role to ${input.role} (${input.position})`
  });
}

export async function reassignMemberForAdmin(uid: string, targetUid: string, input: { organization: string; committee: string }) {
  const adminUser = await requireAdmin(uid);
  const userRef = firestore.collection("users").doc(targetUid);
  const snap = await userRef.get();
  if (!snap.exists) throw new AppError("Member record was not found.", 404);
  const targetData = snap.data() ?? {};

  await userRef.update({
    organizationName: input.organization,
    committee: input.committee,
    updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
  });

  writeAuditLog({
    actorUID: uid,
    actorName: adminUser.fullName,
    actorRole: "Admin",
    action: "REASSIGN_MEMBER",
    actionCategory: "User Management",
    targetType: "UserAssignment",
    targetName: typeof targetData.fullName === "string" ? targetData.fullName : targetUid,
    reason: `Reassigned to ${input.organization} (${input.committee})`
  });
}

// ─── Admin member directory helpers ────────────────────────────────────────

type AdminMemberEntry = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  position: string;
  organizationId: string | null;
  organization: string;
  committeeId: string | null;
  committee: string;
  inviteStatus: "Active" | "Pending Invite" | "Inactive";
  joinedDate: string | null;
};

type AdminMemberDirectory = {
  members: AdminMemberEntry[];
  organizations: { id: string; name: string }[];
  committees: { id: string; name: string; organizationId: string | null }[];
};

function asIsoString(value: unknown): string | null {
  return value && typeof (value as { toDate?: unknown }).toDate === "function"
    ? ((value as { toDate: () => Date }).toDate()).toISOString()
    : null;
}

async function buildAdminMemberDirectory(): Promise<AdminMemberDirectory> {
  const [usersSnap, orgsSnap] = await Promise.all([
    firestore.collection("users").get(),
    firestore.collection("organizations").where("status", "==", "active").get()
  ]);

  const orgMap = new Map<string, string>();
  const organizations: { id: string; name: string }[] = [];
  for (const doc of orgsSnap.docs) {
    const name = typeof doc.data().name === "string" ? doc.data().name : "Untitled organization";
    orgMap.set(doc.id, name);
    organizations.push({ id: doc.id, name });
  }

  const committeeMap = new Map<string, { id: string; name: string; organizationId: string | null }>();
  await Promise.all(
    orgsSnap.docs.map(async (orgDoc) => {
      const committeeSnap = await orgDoc.ref.collection("committees").get();
      for (const cDoc of committeeSnap.docs) {
        const name = typeof cDoc.data().name === "string" ? cDoc.data().name : "Untitled committee";
        committeeMap.set(cDoc.id, { id: cDoc.id, name, organizationId: orgDoc.id });
      }
    })
  );

  const committees = Array.from(committeeMap.values());

  const members: AdminMemberEntry[] = usersSnap.docs.map((doc) => {
    const data = doc.data();
    const role = isUserRole(data.role) ? data.role : DEFAULT_ROLE;
    const orgId = typeof data.organizationId === "string" ? data.organizationId : null;
    const committeeId = typeof data.committeeId === "string" ? data.committeeId : null;
    return {
      id: doc.id,
      name: typeof data.fullName === "string" ? data.fullName : "Campus Member",
      email: typeof data.email === "string" ? data.email : "",
      role,
      position: typeof data.position === "string" ? data.position : role,
      organizationId: orgId,
      organization: orgId && orgMap.has(orgId) ? orgMap.get(orgId)! : "University Campus",
      committeeId,
      committee: committeeId && committeeMap.has(committeeId) ? committeeMap.get(committeeId)!.name : "Unassigned",
      inviteStatus: data.onboardingCompleted === true ? "Active" : "Pending Invite",
      joinedDate: asIsoString(data.createdAt)
    };
  });

  return { members, organizations, committees };
}

export async function getAdminMemberDirectory(uid: string): Promise<AdminMemberDirectory> {
  await requireAdmin(uid);
  return buildAdminMemberDirectory();
}

export async function watchAdminMemberDirectory(
  uid: string,
  onData: (directory: AdminMemberDirectory) => void,
  onError: (error: Error) => void
): Promise<() => void> {
  await requireAdmin(uid);

  const unsubscribe = firestore.collection("users").onSnapshot(
    async () => {
      try {
        const directory = await buildAdminMemberDirectory();
        onData(directory);
      } catch (error) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    },
    (error) => onError(error)
  );

  return unsubscribe;
}

// ─── Admin member update helpers ─────────────────────────────────────────────

export async function updateMemberForAdmin(
  uid: string,
  memberId: string,
  input: {
    role?: UserRole;
    position?: string;
    organizationId?: string | null;
    organizationName?: string;
    committeeId?: string | null;
    committeeName?: string;
  }
): Promise<void> {
  const adminUser = await getCurrentUser(uid);
  if (adminUser.role !== "Admin") throw new AppError("Administrator access is required.", 403);
  const ref = firestore.collection("users").doc(memberId);
  const before = await ref.get();
  if (!before.exists) throw new AppError("Member was not found.", 404);

  const update: Record<string, unknown> = {};
  if (input.role !== undefined) update.role = input.role;
  if (input.position !== undefined) update.position = input.position.trim();
  if ("organizationId" in input) update.organizationId = input.organizationId ?? null;
  if (input.organizationName !== undefined) update.organizationName = input.organizationName;
  if ("committeeId" in input) update.committeeId = input.committeeId ?? null;
  if (input.committeeName !== undefined) update.committeeName = input.committeeName;

  await ref.update(update);

  const memberName = typeof before.data()?.fullName === "string" ? before.data()!.fullName : memberId;
  const beforeData = before.data() ?? {};

  if (input.role !== undefined) {
    writeAuditLog({
      actorUID: uid,
      actorName: adminUser.fullName,
      actorRole: adminUser.role,
      action: "Member role changed by administrator",
      actionCategory: "User Management",
      targetType: "User",
      targetName: memberName,
      changes: { field: "role", from: beforeData.role ?? "Unknown", to: input.role }
    });
  }
  if ("organizationId" in input || "committeeId" in input) {
    writeAuditLog({
      actorUID: uid,
      actorName: adminUser.fullName,
      actorRole: adminUser.role,
      action: "Member organization or committee reassigned",
      actionCategory: "Organization",
      targetType: "User",
      targetName: memberName,
      orgId: typeof input.organizationId === "string" ? input.organizationId : null,
      changes: {
        organization: { from: beforeData.organizationId ?? null, to: input.organizationId ?? null },
        committee: { from: beforeData.committeeId ?? null, to: input.committeeId ?? null }
      }
    });
  }
}

export async function bulkUpdateMemberRolesForAdmin(
  uid: string,
  memberIds: string[],
  role: UserRole
): Promise<void> {
  const adminUser = await getCurrentUser(uid);
  if (adminUser.role !== "Admin") throw new AppError("Administrator access is required.", 403);
  if (memberIds.length === 0) return;

  const batch = firestore.batch();
  for (const memberId of memberIds) {
    batch.update(firestore.collection("users").doc(memberId), { role });
  }
  await batch.commit();

  writeAuditLog({
    actorUID: uid,
    actorName: adminUser.fullName,
    actorRole: adminUser.role,
    action: `Bulk role update: ${memberIds.length} member(s) set to "${role}"`,
    actionCategory: "User Management",
    targetType: "Users",
    targetName: `${memberIds.length} members`,
    changes: { field: "role", to: role, affectedCount: memberIds.length }
  });
}

// ─── Audit logs helpers ───────────────────────────────────────────────────────

type AuditLogEntry = Record<string, unknown>;

function normalizeAuditLog(id: string, data: FirebaseFirestore.DocumentData): AuditLogEntry {
  return {
    id,
    orgId: typeof data.orgId === "string" ? data.orgId : null,
    actorUID: typeof data.actorUID === "string" ? data.actorUID : null,
    actorName: typeof data.actorName === "string" ? data.actorName : "System",
    actorRole: typeof data.actorRole === "string" ? data.actorRole : "Automated",
    action: typeof data.action === "string" ? data.action : "System Event",
    actionCategory: typeof data.actionCategory === "string" ? data.actionCategory : "Organization",
    targetType: typeof data.targetType === "string" ? data.targetType : "Entity",
    targetName: typeof data.targetName === "string" ? data.targetName : null,
    changes: data.changes ?? null,
    reason: typeof data.reason === "string" ? data.reason : null,
    context: data.context ?? null,
    metadata: data.metadata ?? null,
    createdAt: asIsoString(data.createdAt)
  };
}

export async function getAuditLogs(uid: string): Promise<AuditLogEntry[]> {
  await requireAdmin(uid);
  const snapshot = await firestore.collection("audit_logs").orderBy("createdAt", "desc").limit(200).get();
  return snapshot.docs.map((doc) => normalizeAuditLog(doc.id, doc.data()));
}

export async function watchAuditLogs(
  uid: string,
  onData: (logs: AuditLogEntry[]) => void,
  onError: (error: Error) => void
): Promise<() => void> {
  await requireAdmin(uid);

  const unsubscribe = firestore
    .collection("audit_logs")
    .orderBy("createdAt", "desc")
    .limit(200)
    .onSnapshot(
      (snapshot) => {
        try {
          const logs = snapshot.docs.map((doc) => normalizeAuditLog(doc.id, doc.data()));
          onData(logs);
        } catch (error) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
      },
      (error) => onError(error)
    );

  return unsubscribe;
}

export async function createEventForUser(uid: string, input: { orgId?: string; title: string; description?: string; status?: string; startDate?: string; endDate?: string; memberCount?: number; progress?: number; committee?: string; tasks?: any[] }) {
  const user = await getCurrentUser(uid);
  const targetOrgId = input.orgId || user.organizationId || "default-org";

  const eventRef = await firestore.collection("events").add({
    title: input.title.trim(),
    description: (input.description || "").trim(),
    status: input.status || "Active",
    startDate: input.startDate || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    endDate: input.endDate || new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    memberCount: typeof input.memberCount === "number" ? input.memberCount : 1,
    progress: typeof input.progress === "number" ? input.progress : 0,
    committee: input.committee || "General",
    tasks: Array.isArray(input.tasks) ? input.tasks : [],
    orgId: targetOrgId,
    createdBy: uid,
    createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
  });

  writeAuditLog({
    actorUID: uid,
    actorName: user.fullName,
    actorRole: user.role,
    action: "Event created",
    actionCategory: "Events & Tasks",
    targetType: "Event",
    targetName: input.title,
    orgId: targetOrgId
  });

  return { id: eventRef.id };
}

export async function updateEventForUser(uid: string, eventId: string, input: Record<string, any>) {
  const user = await getCurrentUser(uid);
  const docRef = firestore.collection("events").doc(eventId);
  const snap = await docRef.get();
  if (!snap.exists) throw new AppError("Event not found.", 404);

  const updatePayload: Record<string, any> = { ...input, updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp() };
  delete updatePayload.id;

  await docRef.update(updatePayload);

  return { success: true };
}

export async function clearEventsForOrg(uid: string, organizationId: string) {
  const user = await getCurrentUser(uid);
  const targetOrgId = organizationId || user.organizationId || "default-org";
  const snapshot = await firestore.collection("events").where("orgId", "==", targetOrgId).get();
  const batch = firestore.batch();
  snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  await batch.commit();

  return { success: true };
}

export async function getEventsForUser(uid: string, orgId?: string) {
  const user = await getCurrentUser(uid);
  const targetOrgId = orgId || user.organizationId || "default-org";
  const snapshot = await firestore.collection("events").where("orgId", "==", targetOrgId).get();
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      title: typeof data.title === "string" ? data.title : "Untitled Event",
      description: typeof data.description === "string" ? data.description : "",
      status: ["Active", "Planning", "Completed", "Archived"].includes(data.status)
        ? data.status
        : "Planning",
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
      orgId: typeof data.orgId === "string" ? data.orgId : null,
      createdBy: typeof data.createdBy === "string" ? data.createdBy : null,
      customStatuses: Array.isArray(data.customStatuses) ? data.customStatuses : [],
      statusOrder: Array.isArray(data.statusOrder) ? data.statusOrder : []
    };
  });
}

