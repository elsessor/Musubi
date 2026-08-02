import type { User } from "firebase/auth";
import type { Timestamp } from "firebase/firestore";

export type UserRole = "Admin" | "Student Leader" | "Organization Member";

export type FirebaseUser = User;

export type AuthUserDocument = {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
  profilePicture: string | null;
  createdAt: Timestamp;
  lastLogin: Timestamp;
};

export type BackendLoginResponse = {
  token: string;
  role: UserRole;
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
