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
