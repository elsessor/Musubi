import type { User } from "firebase/auth";

import type { BackendLoginResponse, OnboardingPayload, UserRole } from "@/types/auth";

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
    !(typeof backendUser.position === "string" || backendUser.position === null || backendUser.position === undefined) ||
    !(typeof backendUser.organizationId === "string" || backendUser.organizationId === null) ||
    !(typeof backendUser.profilePicture === "string" || backendUser.profilePicture === null) ||
    !Array.isArray(backendUser.skills) ||
    !backendUser.skills.every((skill) => typeof skill === "string") ||
    typeof backendUser.onboardingCompleted !== "boolean"
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
      position: typeof backendUser.position === "string" ? backendUser.position : null,
      organizationId: backendUser.organizationId,
      profilePicture: backendUser.profilePicture,
      skills: backendUser.skills,
      onboardingCompleted: backendUser.onboardingCompleted
    }
  };
}

export async function completeOnboarding(user: User, payload: OnboardingPayload): Promise<BackendLoginResponse> {
  const idToken = await user.getIdToken();
  const response = await fetch(`${API_BASE_URL}/auth/onboarding`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ idToken, ...payload })
  });

  if (!response.ok) throw new Error("Unable to save your onboarding details. Please try again.");
  return response.json() as Promise<BackendLoginResponse>;
}

export type OrganizationRequestRecord = {
  id: string;
  orgName: string;
  orgType: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
  submittedAt: string | null;
  requestedBy: { uid: string; name: string; email: string };
};

export async function getOrganizationRequests(user: User): Promise<OrganizationRequestRecord[]> {
  const response = await fetch(`${API_BASE_URL}/auth/org-requests`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
  if (!response.ok) throw new Error("Unable to load organization requests.");
  const data = await response.json() as { requests?: OrganizationRequestRecord[] };
  return Array.isArray(data.requests) ? data.requests : [];
}

export async function reviewOrganizationRequest(user: User, requestId: string, status: "approved" | "rejected", rejectionReason: string | null): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/org-requests/${requestId}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ status, rejectionReason }) });
  if (!response.ok) throw new Error("Unable to update this request.");
}

export type OrganizationRecord = {
  id: string;
  name: string;
  type: string;
  description: string;
  status: string;
  requestedByUID: string | null;
  organizationConfig: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
};

export async function getOrganization(user: User, organizationId: string): Promise<OrganizationRecord> {
  const response = await fetch(`${API_BASE_URL}/auth/organizations/${organizationId}`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
  if (!response.ok) throw new Error("Unable to load this organization.");
  const data = await response.json() as { organization?: OrganizationRecord };
  if (!data.organization || typeof data.organization.id !== "string" || typeof data.organization.name !== "string") {
    throw new Error("Organization profile is unavailable.");
  }
  return data.organization;
}

export type OrganizationDirectoryRecord = OrganizationRecord & { memberCount: number; committeeCount: number };
export type OrganizationMemberRecord = { id: string; name: string; role: string; position: string; committeeId: string | null };
export type OrganizationCommitteeRecord = { id: string; name: string; headMemberId: string | null; description: string };
export type OrganizationManagementDetail = { organization: OrganizationRecord; members: OrganizationMemberRecord[]; committees: OrganizationCommitteeRecord[]; goalSummary: Record<string, number> };
export type AdminMemberRecord = { id: string; name: string; email: string; organizationId: string | null; organizationName: string; membershipRole: "leader" | "committee_head" | "member"; committeeId: string | null; committeeName: string; inviteStatus: string };

async function organizationRequest<T>(user: User, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}`, ...init?.headers } });
  if (!response.ok) throw new Error("Unable to load organization data.");
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export async function getOrganizations(user: User): Promise<OrganizationDirectoryRecord[]> {
  const data = await organizationRequest<{ organizations?: OrganizationDirectoryRecord[] }>(user, "/auth/organizations");
  return Array.isArray(data.organizations) ? data.organizations : [];
}

export async function getAllMembers(user: User): Promise<AdminMemberRecord[]> {
  const data = await organizationRequest<{ members?: AdminMemberRecord[] }>(user, "/auth/members");
  return Array.isArray(data.members) ? data.members : [];
}

export function updateMemberAssignment(user: User, memberId: string, input: Partial<Pick<AdminMemberRecord, "organizationId" | "committeeId" | "membershipRole">>) {
  return organizationRequest<void>(user, `/auth/members/${memberId}`, { method: "PATCH", body: JSON.stringify(input) });
}

export type OrganizationDirectoryOption = OrganizationRecord;
export type OrganizationMember = { id: string; name: string; role: string; position: string; skills: string[]; membershipRole: "leader" | "committee_head" | "member"; committeeId: string | null };
export type OrganizationJoinRequest = { id: string; name: string; email: string; position: string; skills: string[] };
export type MyOrganizationJoinRequest = { id: string; organizationId: string; organizationName: string };

export async function getOrganizationDirectory(user: User): Promise<OrganizationDirectoryOption[]> {
  const data = await organizationRequest<{ organizations?: OrganizationDirectoryOption[] }>(user, "/auth/organizations/directory");
  return Array.isArray(data.organizations) ? data.organizations : [];
}

export function joinOrganization(user: User, organizationId: string) {
  return organizationRequest<{ request: { id: string; status: "pending" } }>(user, "/auth/organizations/join", { method: "POST", body: JSON.stringify({ organizationId }) });
}

export function createOrganization(user: User, input: { name: string; type: string; description: string }) {
  return organizationRequest<{ organization: OrganizationRecord; user: BackendLoginResponse["user"] }>(user, "/auth/organizations", { method: "POST", body: JSON.stringify(input) });
}

export async function getOrganizationMembers(user: User, organizationId: string): Promise<OrganizationMember[]> {
  const data = await organizationRequest<{ members?: OrganizationMember[] }>(user, `/auth/organizations/${organizationId}/members`);
  return Array.isArray(data.members) ? data.members : [];
}

export async function getOrganizationJoinRequests(user: User, organizationId: string): Promise<OrganizationJoinRequest[]> {
  const data = await organizationRequest<{ requests?: OrganizationJoinRequest[] }>(user, `/auth/organizations/${organizationId}/join-requests`);
  return Array.isArray(data.requests) ? data.requests : [];
}

export async function getMyOrganizationJoinRequest(user: User): Promise<MyOrganizationJoinRequest | null> {
  const data = await organizationRequest<{ request?: MyOrganizationJoinRequest | null }>(user, "/auth/organizations/join-requests/me");
  return data.request ?? null;
}

export function reviewOrganizationJoinRequest(user: User, organizationId: string, requestId: string, status: "accepted" | "rejected") {
  return organizationRequest<void>(user, `/auth/organizations/${organizationId}/join-requests/${requestId}`, { method: "PATCH", body: JSON.stringify({ status }) });
}

export function updateOrganizationMember(user: User, organizationId: string, memberId: string, input: { membershipRole?: "leader" | "committee_head" | "member"; position?: string; committeeId?: string | null }) {
  return organizationRequest<void>(user, `/auth/organizations/${organizationId}/members/${memberId}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function inviteOrganizationMember(user: User, organizationId: string, email: string) {
  return organizationRequest<void>(user, `/auth/organizations/${organizationId}/invitations`, { method: "POST", body: JSON.stringify({ email }) });
}

export function getOrganizationManagementDetail(user: User, organizationId: string) {
  return organizationRequest<OrganizationManagementDetail>(user, `/auth/organizations/${organizationId}/management`);
}

export function updateOrganization(user: User, organizationId: string, input: Partial<Pick<OrganizationRecord, "name" | "type" | "description">> & { setupStatus?: "pending" | "active" | "inactive" }) {
  return organizationRequest<{ organization: OrganizationRecord }>(user, `/auth/organizations/${organizationId}`, { method: "PATCH", body: JSON.stringify(input) });
}
