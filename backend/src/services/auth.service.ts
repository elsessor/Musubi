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
  if (user.organizationId) throw new AppError("You already belong to an organization and cannot create another.", 409);
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
      skills: Array.isArray(data.skills) ? data.skills.filter((skill): skill is string => typeof skill === "string") : [],
      membershipRole: data.membershipRole === "leader" || data.membershipRole === "committee_head" || data.membershipRole === "member" ? data.membershipRole : data.role === "Student Leader" ? "leader" : "member",
      committeeId: typeof data.committeeId === "string" ? data.committeeId : null
    };
  });
}

async function requireOrganizationLeader(uid: string, organizationId: string) {
  const user = await getCurrentUser(uid);
  if (user.role !== "Student Leader" || user.organizationId !== organizationId) throw new AppError("Organization leader access is required.", 403);
}

export async function updateOrganizationMemberByLeader(uid: string, organizationId: string, memberId: string, input: { membershipRole?: "leader" | "committee_head" | "member"; position?: string; committeeId?: string | null }) {
  await requireOrganizationLeader(uid, organizationId);
  const memberRef = firestore.collection("users").doc(memberId);
  const member = await memberRef.get();
  if (!member.exists || member.data()?.organizationId !== organizationId) throw new AppError("Member was not found in this organization.", 404);
  if (input.committeeId !== undefined && input.committeeId !== null && !(await firestore.collection("organizations").doc(organizationId).collection("committees").doc(input.committeeId).get()).exists) throw new AppError("Committee was not found.", 404);
  const update: Record<string, unknown> = {};
  if (input.membershipRole !== undefined) update.membershipRole = input.membershipRole;
  if (input.position !== undefined) update.position = input.position.trim();
  if (input.committeeId !== undefined) update.committeeId = input.committeeId;
  await memberRef.update(update);
}

export async function inviteOrganizationMember(uid: string, organizationId: string, email: string) {
  await requireOrganizationLeader(uid, organizationId);
  const matches = await firestore.collection("users").where("email", "==", email.trim().toLowerCase()).limit(1).get();
  if (matches.empty) throw new AppError("No Musubi account exists for that email address.", 404);
  const member = matches.docs[0];
  if (member.data().organizationId === organizationId) throw new AppError("This person is already a member.", 409);
  await firestore.collection("organization_invitations").add({ organizationId, invitedUID: member.id, email: email.trim().toLowerCase(), status: "pending", sentAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(), invitedByUID: uid });
  await member.ref.update({ inviteStatus: "pending" });
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

export async function getAllMembersForAdmin(uid: string) {
  await requireAdmin(uid);
  const [usersSnapshot, organizationsSnapshot] = await Promise.all([firestore.collection("users").get(), firestore.collection("organizations").get()]);
  const organizations = new Map(organizationsSnapshot.docs.map((document) => [document.id, { name: typeof document.data().name === "string" ? document.data().name : "Unknown organization", ref: document.ref }]));
  const committeeNames = new Map<string, string>();
  await Promise.all(Array.from(organizations.entries()).map(async ([organizationId, organization]) => { const committees = await organization.ref.collection("committees").get(); committees.docs.forEach((committee) => committeeNames.set(`${organizationId}:${committee.id}`, typeof committee.data().name === "string" ? committee.data().name : "Unnamed committee")); }));
  return usersSnapshot.docs.map((document) => { const data = document.data(); const organizationId = typeof data.organizationId === "string" ? data.organizationId : null; const committeeId = typeof data.committeeId === "string" ? data.committeeId : null; const membershipRole = data.membershipRole === "leader" || data.membershipRole === "committee_head" || data.membershipRole === "member" ? data.membershipRole : data.role === "Student Leader" ? "leader" : "member"; return { id: document.id, name: typeof data.fullName === "string" ? data.fullName : "Unnamed member", email: typeof data.email === "string" ? data.email : "", organizationId, organizationName: organizationId ? organizations.get(organizationId)?.name ?? "Unknown organization" : "Unassigned", membershipRole, committeeId, committeeName: organizationId && committeeId ? committeeNames.get(`${organizationId}:${committeeId}`) ?? "Unassigned" : "Unassigned", inviteStatus: typeof data.inviteStatus === "string" ? data.inviteStatus : "active" }; });
}

export async function updateMemberAssignmentForAdmin(uid: string, memberId: string, input: { membershipRole?: "leader" | "committee_head" | "member"; organizationId?: string | null; committeeId?: string | null }) {
  await requireAdmin(uid);
  const ref = firestore.collection("users").doc(memberId);
  if (!(await ref.get()).exists) throw new AppError("Member was not found.", 404);
  if (input.organizationId !== undefined && input.organizationId !== null && !(await firestore.collection("organizations").doc(input.organizationId).get()).exists) throw new AppError("Organization was not found.", 404);
  if (input.committeeId !== undefined && input.committeeId !== null) { const organizationId = input.organizationId ?? (await ref.get()).data()?.organizationId; if (typeof organizationId !== "string" || !(await firestore.collection("organizations").doc(organizationId).collection("committees").doc(input.committeeId).get()).exists) throw new AppError("Committee was not found in the selected organization.", 404); }
  const update: Record<string, unknown> = {};
  if (input.membershipRole !== undefined) update.membershipRole = input.membershipRole;
  if (input.organizationId !== undefined) { update.organizationId = input.organizationId; if (input.organizationId === null) update.committeeId = null; }
  if (input.committeeId !== undefined) update.committeeId = input.committeeId;
  await ref.update(update);
}

export async function getOrganizationManagementDetail(uid: string, organizationId: string) {
  const requestingUser = await getCurrentUser(uid);
  if (requestingUser.role !== "Admin" && (requestingUser.role !== "Student Leader" || requestingUser.organizationId !== organizationId)) throw new AppError("You do not have access to this organization.", 403);
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
