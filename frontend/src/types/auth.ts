import type { User } from "firebase/auth";
import type { Timestamp } from "firebase/firestore";

export type UserRole = "Admin" | "Student Leader" | "Organization Member";

export type FirebaseUser = User;

export type AuthUserProfile = {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  position: string | null;
  organizationId: string | null;
  profilePicture: string | null;
  skills: string[];
  onboardingCompleted: boolean;
};

export type OnboardingPayload = {
  role: Extract<UserRole, "Student Leader" | "Organization Member">;
  position: string;
  organizationId: string | null;
  organizationRequest?: {
    organizationId: string;
    orgName: string;
    orgType: string;
    description: string;
  };
  yearLevel: string;
  program: string;
  skills: string[];
};

export type AuthUserDocument = AuthUserProfile & {
  createdAt: Timestamp;
  lastLogin: Timestamp;
};

export type BackendLoginResponse = {
  token: string;
  role: UserRole;
  user: AuthUserProfile;
};

export type LoginCredentials = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export type RegisterCredentials = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
};
