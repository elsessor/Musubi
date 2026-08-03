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
    organizationId: user.organizationId,
    profilePicture: user.profilePicture
    ,skills: user.skills
    ,onboardingCompleted: user.onboardingCompleted
  };
}

export async function completeUserOnboarding(
  uid: string,
  input: { role: Exclude<UserRole, "Admin">; organizationId: string | null; yearLevel: string; program: string; skills: string[] }
): Promise<LoginResponse> {
  if (!input.yearLevel || !input.program) {
    throw new AppError("Complete the required onboarding details.", 400);
  }

  const userRef = firestore.collection("users").doc(uid);
  await userRef.set({
    role: input.role,
    organizationId: input.organizationId,
    yearLevel: input.yearLevel,
    program: input.program,
    skills: input.skills,
    onboardingCompleted: true,
    lastLogin: firebaseAdmin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  const user = await getCurrentUser(uid);
  return { token: createAppJwt({ uid: user.uid, email: user.email, role: user.role, organizationId: user.organizationId }), role: user.role, user };
}
