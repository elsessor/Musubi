import type { Request } from "express";

export type UserRole = "Admin" | "Student Leader" | "Organization Member";

export type FirestoreUser = {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
  profilePicture: string | null;
  skills: string[];
  onboardingCompleted: boolean;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  lastLogin: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
};

export type JwtPayload = {
  uid: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
};

export type AuthenticatedRequest = Request & {
  authUser?: JwtPayload;
};

export type LoginResponse = {
  token: string;
  role: UserRole;
  user: Omit<FirestoreUser, "createdAt" | "lastLogin">;
};
