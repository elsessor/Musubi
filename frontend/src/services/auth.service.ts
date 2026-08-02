import type { User } from "firebase/auth";

import type { BackendLoginResponse, UserRole } from "@/types/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";
const roles: UserRole[] = ["Admin", "Student Leader", "Organization Member"];

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && roles.includes(value as UserRole);
}

export async function exchangeFirebaseSession(user: User): Promise<BackendLoginResponse> {
  const idToken = await user.getIdToken();

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({ idToken })
  });

  if (!response.ok) {
    throw new Error("Unable to start a secure app session. Please try again.");
  }

  const data: unknown = await response.json();

  if (
    typeof data !== "object" ||
    data === null ||
    !("token" in data) ||
    !("role" in data) ||
    !("user" in data) ||
    typeof data.token !== "string" ||
    !isUserRole(data.role) ||
    typeof data.user !== "object" ||
    data.user === null
  ) {
    throw new Error("The authentication server returned an invalid session.");
  }

  const backendUser = data.user as Record<string, unknown>;

  if (
    typeof backendUser.uid !== "string" ||
    typeof backendUser.fullName !== "string" ||
    typeof backendUser.email !== "string" ||
    !isUserRole(backendUser.role) ||
    !(typeof backendUser.organizationId === "string" || backendUser.organizationId === null) ||
    !(typeof backendUser.profilePicture === "string" || backendUser.profilePicture === null)
  ) {
    throw new Error("The authentication server returned an invalid session.");
  }

  return {
    token: data.token,
    role: data.role,
    user: {
      uid: backendUser.uid,
      fullName: backendUser.fullName,
      email: backendUser.email,
      role: backendUser.role,
      organizationId: backendUser.organizationId,
      profilePicture: backendUser.profilePicture
    }
  };
}
