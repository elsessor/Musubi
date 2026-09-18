import jwt, { type SignOptions } from "jsonwebtoken";

import { env } from "../config/env.js";
import { firebaseAdmin, firebaseAuth, firestore } from "../config/firebase.js";
import type { FirestoreUser, JwtPayload, LoginResponse, UserRole } from "../types/auth.types.js";
import { AppError } from "../utils/AppError.js";

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
    const user = normalizeUserDocument(uid, snapshot.data() ?? {});
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
      profilePicture: user.profilePicture
      ,skills: user.skills
      ,onboardingCompleted: user.onboardingCompleted
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
    profilePicture: user.profilePicture
    ,skills: user.skills
    ,onboardingCompleted: user.onboardingCompleted
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
  await requestRef.update({ status, rejectionReason, reviewedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp() });
  if (status === "approved" && typeof request.organizationId === "string") {
    await firestore.collection("organizations").doc(request.organizationId).set({
      name: typeof request.orgName === "string" ? request.orgName : "Untitled organization",
      type: typeof request.orgType === "string" ? request.orgType : "Unspecified",
      description: typeof request.description === "string" ? request.description : "",
      status: "active", requestedByUID: typeof request.requestedBy?.uid === "string" ? request.requestedBy.uid : null,
      organizationConfig: {}, createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(), updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
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
  const user = await getCurrentUser(uid);
  if (user.organizationId === organizationId) throw new AppError("You already belong to this organization.", 409);
  const existing = await firestore.collection("organization_join_requests").where("organizationId", "==", organizationId).where("requestedByUID", "==", uid).where("status", "==", "pending").limit(1).get();
  if (!existing.empty) throw new AppError("You already have a pending request for this organization.", 409);
  const request = await firestore.collection("organization_join_requests").add({ organizationId, requestedByUID: uid, name: user.fullName, email: user.email, position: user.position, skills: user.skills, status: "pending", submittedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp() });
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
  if (status === "accepted") await firestore.collection("users").doc(request.requestedByUID).set({ organizationId }, { merge: true });
}

export async function createOrganization(uid: string, input: { name: string; type: string; description: string }) {
  const user = await getCurrentUser(uid);
  if (user.role !== "Student Leader") throw new AppError("Only student leaders can create organizations.", 403);
  const ref = firestore.collection("organizations").doc();
  await ref.set({
    name: input.name.trim(), type: input.type.trim(), description: input.description.trim(), status: "pending", requestedByUID: uid,
    organizationConfig: {}, createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(), updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
  });
  await firestore.collection("users").doc(uid).set({ organizationId: ref.id }, { merge: true });
  await firestore.collection("org_requests").add({
    organizationId: ref.id, orgName: input.name.trim(), orgType: input.type.trim(), description: input.description.trim(), status: "pending", rejectionReason: null,
    submittedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(), requestedBy: { uid, name: user.fullName, email: user.email }
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
      skills: Array.isArray(data.skills) ? data.skills.filter((skill): skill is string => typeof skill === "string") : []
    };
  });
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
  await requireAdmin(uid);
  const ref = firestore.collection("organizations").doc(organizationId);
  if (!(await ref.get()).exists) throw new AppError("Organization was not found.", 404);
  const update: Record<string, unknown> = { updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp() };
  if (input.name !== undefined) update.name = input.name.trim();
  if (input.type !== undefined) update.type = input.type.trim();
  if (input.description !== undefined) update.description = input.description.trim();
  if (input.setupStatus !== undefined) update.setupStatus = input.setupStatus;
  await ref.update(update);
  const updated = await ref.get();
  return normalizeOrganization(updated.id, updated.data() ?? {});
}

export async function completeUserOnboarding(
  uid: string,
  input: { role: Exclude<UserRole, "Admin">; position: string; organizationId: string | null; yearLevel: string; program: string; skills: string[]; organizationRequest?: { organizationId: string; orgName: string; orgType: string; description: string } }
): Promise<LoginResponse> {
  if (!input.position.trim() || !input.yearLevel || !input.program) {
    throw new AppError("Complete the required onboarding details.", 400);
  }

  const userRef = firestore.collection("users").doc(uid);
  await userRef.set({
    role: input.role,
    position: input.position.trim(),
    organizationId: input.organizationId,
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
  return { token: createAppJwt({ uid: user.uid, email: user.email, role: user.role, organizationId: user.organizationId }), role: user.role, user };
}

export async function recordAuditLog(input: {
  actorUID?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  actionCategory?: string | null;
  targetType?: string | null;
  targetName?: string | null;
  orgId?: string | null;
  reason?: string | null;
  changes?: Record<string, unknown> | null;
  context?: Record<string, unknown> | null;
}) {
  try {
    await firestore.collection("audit_logs").add({
      actorUID: input.actorUID ?? null,
      actorName: input.actorName ?? "System Administrator",
      actorRole: input.actorRole ?? "Admin",
      action: input.action,
      actionCategory: input.actionCategory ?? "General",
      targetType: input.targetType ?? "System",
      targetName: input.targetName ?? "Record",
      orgId: input.orgId ?? null,
      reason: input.reason ?? null,
      changes: input.changes ?? null,
      context: input.context ?? null,
      createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.warn("Failed to write audit log:", err);
  }
}

export async function getAuditLogs(uid: string, category?: string | null, page = 1, pageSize = 50) {
  await getCurrentUser(uid);
  let queryRef: FirebaseFirestore.Query = firestore.collection("audit_logs");
  if (category) {
    queryRef = queryRef.where("actionCategory", "==", category);
  }

  const snapshot = await queryRef.orderBy("createdAt", "desc").limit(pageSize).get();

  const logs = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    const createdAtIso = data.createdAt && typeof (data.createdAt as { toDate?: () => Date }).toDate === "function"
      ? (data.createdAt as { toDate: () => Date }).toDate().toISOString()
      : (typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString());

    return {
      id: docSnap.id,
      actorUID: data.actorUID ?? null,
      actorName: typeof data.actorName === "string" ? data.actorName : "System Administrator",
      actorRole: typeof data.actorRole === "string" ? data.actorRole : "Admin",
      action: typeof data.action === "string" ? data.action : "UPDATE",
      actionCategory: typeof data.actionCategory === "string" ? data.actionCategory : "General",
      targetType: typeof data.targetType === "string" ? data.targetType : "System",
      targetName: typeof data.targetName === "string" ? data.targetName : "Record",
      orgId: data.orgId ?? null,
      reason: data.reason ?? null,
      changes: data.changes ?? null,
      context: data.context ?? null,
      createdAt: createdAtIso
    };
  });

  return { logs, total: logs.length, page };
}

export async function getEventsForUser(uid: string, orgId?: string | null) {
  await getCurrentUser(uid);
  let queryRef: FirebaseFirestore.Query = firestore.collection("events");
  if (orgId) {
    queryRef = queryRef.where("orgId", "==", orgId);
  }
  const snapshot = await queryRef.get();
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      title: typeof data.title === "string" ? data.title : "Untitled Event",
      description: typeof data.description === "string" ? data.description : "",
      status: typeof data.status === "string" ? data.status : "Active",
      startDate: typeof data.startDate === "string" ? data.startDate : "",
      endDate: typeof data.endDate === "string" ? data.endDate : "",
      memberCount: typeof data.memberCount === "number" ? data.memberCount : 1,
      progress: typeof data.progress === "number" ? data.progress : 0,
      committee: typeof data.committee === "string" ? data.committee : "General",
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      orgId: typeof data.orgId === "string" ? data.orgId : orgId ?? null
    };
  });
}

export async function createEventForUser(uid: string, input: { orgId: string; [key: string]: unknown }) {
  const user = await getCurrentUser(uid);
  const docRef = await firestore.collection("events").add({
    ...input,
    createdBy: uid,
    createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
  });
  void recordAuditLog({
    actorUID: uid,
    actorName: user.fullName,
    actorRole: user.role,
    action: "CREATE",
    actionCategory: "Events",
    targetType: "Goal",
    targetName: typeof input.title === "string" ? input.title : "New Event Goal",
    orgId: input.orgId
  });
  return { id: docRef.id };
}

export async function updateEventForUser(uid: string, eventId: string, updates: Record<string, unknown>) {
  const user = await getCurrentUser(uid);
  const ref = firestore.collection("events").doc(eventId);
  await ref.set({
    ...updates,
    updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  void recordAuditLog({
    actorUID: uid,
    actorName: user.fullName,
    actorRole: user.role,
    action: "UPDATE",
    actionCategory: "Events",
    targetType: "Task",
    targetName: typeof updates.title === "string" ? updates.title : "Event Task Update"
  });
}

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

  void recordAuditLog({
    actorUID: uid,
    actorName: adminUser.fullName,
    actorRole: "Admin",
    action: "UPDATE_ROLE",
    actionCategory: "Member Management",
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

  void recordAuditLog({
    actorUID: uid,
    actorName: adminUser.fullName,
    actorRole: "Admin",
    action: "REASSIGN_MEMBER",
    actionCategory: "Member Management",
    targetType: "UserAssignment",
    targetName: typeof targetData.fullName === "string" ? targetData.fullName : targetUid,
    reason: `Reassigned to ${input.organization} (${input.committee})`
  });
}
