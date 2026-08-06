import type { User } from "firebase/auth";

import type { BackendLoginResponse, UserRole } from "@/types/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";
const roles: UserRole[] = ["Admin", "Student Leader", "Organization Member"];

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && roles.includes(value as UserRole);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getAuthHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`
  };
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export type AuthUserProfile = BackendLoginResponse["user"];

export type OrganizationDirectoryOption = {
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

export type OrganizationDirectoryRecord = OrganizationDirectoryOption & {
  memberCount: number;
  committeeCount: number;
};

export type OrganizationMember = {
  id: string;
  name: string;
  role: string;
  position: string;
  skills: string[];
};

export type OrganizationJoinRequest = {
  id: string;
  name: string;
  email: string;
  position: string;
  skills: string[];
};

export type MyOrganizationJoinRequest = {
  id: string;
  organizationId: string;
  organizationName: string;
};

export type OrganizationRecord = OrganizationDirectoryOption;

export type OrganizationCommitteeRecord = {
  id: string;
  name: string;
  headMemberId: string | null;
  description: string;
};

export type OrganizationManagementDetail = {
  organization: OrganizationRecord;
  members: OrganizationMember[];
  committees: OrganizationCommitteeRecord[];
  goalSummary: Record<string, number>;
};

export type AdminMemberRecord = {
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

export type AdminMemberDirectory = {
  members: AdminMemberRecord[];
  organizations: { id: string; name: string }[];
  committees: { id: string; name: string; organizationId: string | null }[];
};

function normalizeAdminInviteStatus(value: unknown): AdminMemberRecord["inviteStatus"] {
  return value === "Active" || value === "Pending Invite" || value === "Inactive" ? value : "Active";
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
  const payload = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : null;

  if (!payload || !("token" in payload) || !("role" in payload) || !("user" in payload) || typeof payload.token !== "string" || !isUserRole(payload.role) || typeof payload.user !== "object" || payload.user === null) {
    throw new Error("The authentication server returned an invalid session.");
  }

  const backendUser = payload.user as Record<string, unknown>;
  const skills = normalizeStringArray(backendUser.skills);
  const onboardingCompleted = asBoolean(backendUser.onboardingCompleted);

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
    token: payload.token,
    role: payload.role,
    user: {
      uid: backendUser.uid,
      fullName: backendUser.fullName,
      email: backendUser.email,
      role: backendUser.role,
      position: typeof backendUser.position === "string" ? backendUser.position : null,
      organizationId: backendUser.organizationId,
      profilePicture: backendUser.profilePicture,
      skills,
      onboardingCompleted
    }
  };
}

function normalizeOrganization(value: unknown): OrganizationDirectoryOption | null {
  if (!isRecord(value) || typeof value.id !== "string") {
    return null;
  }

  return {
    id: value.id,
    name: typeof value.name === "string" ? value.name : "Untitled organization",
    type: typeof value.type === "string" ? value.type : "Unspecified",
    description: typeof value.description === "string" ? value.description : "",
    status: typeof value.status === "string" ? value.status : "pending",
    requestedByUID: typeof value.requestedByUID === "string" ? value.requestedByUID : null,
    organizationConfig: isRecord(value.organizationConfig) ? value.organizationConfig : {},
    createdAt: typeof value.createdAt === "string" ? value.createdAt : null,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null
  };
}

async function organizationRequest<T>(user: User, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(await user.getIdToken()),
      ...init?.headers
    }
  });

  if (!response.ok) {
    throw new Error("Unable to load organization data.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function getOrganizationDirectory(user: User): Promise<OrganizationDirectoryOption[]> {
  const response = await fetch(`${API_BASE_URL}/auth/organizations/directory`, {
    headers: getAuthHeaders(await user.getIdToken())
  });

  if (!response.ok) {
    throw new Error("Unable to load organizations.");
  }

  const data = (await response.json()) as { organizations?: unknown[] };
  return Array.isArray(data.organizations)
    ? data.organizations.map(normalizeOrganization).filter((organization): organization is OrganizationDirectoryOption => organization !== null)
    : [];
}

export async function completeOnboarding(user: User, payload: {
  role: "Student Leader" | "Organization Member";
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
}): Promise<BackendLoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/onboarding`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(await user.getIdToken())
    },
    body: JSON.stringify({ idToken: await user.getIdToken(), ...payload })
  });

  if (!response.ok) {
    throw new Error("Unable to save your onboarding details. Please try again.");
  }

  return response.json() as Promise<BackendLoginResponse>;
}

export function joinOrganization(user: User, organizationId: string) {
  return organizationRequest<{ request: { id: string; status: "pending" } }>(user, "/auth/organizations/join", {
    method: "POST",
    body: JSON.stringify({ organizationId })
  });
}

export async function getOrganizations(user: User): Promise<OrganizationDirectoryRecord[]> {
  const data = await organizationRequest<{ organizations?: unknown[] }>(user, "/auth/organizations");
  return Array.isArray(data.organizations)
    ? data.organizations
        .map((organization) => {
          const normalized = normalizeOrganization(organization);
          if (!normalized) return null;

          const record = organization as Record<string, unknown>;
          return {
            ...normalized,
            memberCount: typeof record.memberCount === "number" ? record.memberCount : 0,
            committeeCount: typeof record.committeeCount === "number" ? record.committeeCount : 0
          };
        })
        .filter((organization): organization is OrganizationDirectoryRecord => organization !== null)
    : [];
}

export async function getOrganization(user: User, organizationId: string): Promise<OrganizationRecord> {
  const data = await organizationRequest<{ organization?: unknown }>(user, `/auth/organizations/${organizationId}`);
  const organization = normalizeOrganization(data.organization);

  if (!organization) {
    throw new Error("Organization profile is unavailable.");
  }

  return organization;
}

export async function getOrganizationMembers(user: User, organizationId: string): Promise<OrganizationMember[]> {
  const data = await organizationRequest<{ members?: unknown[] }>(user, `/auth/organizations/${organizationId}/members`);
  return Array.isArray(data.members)
    ? data.members.map((member) => {
        const record = isRecord(member) ? member : {};
        return {
          id: typeof record.id === "string" ? record.id : crypto.randomUUID(),
          name: typeof record.name === "string" ? record.name : "Unnamed member",
          role: typeof record.role === "string" ? record.role : "Organization Member",
          position: typeof record.position === "string" ? record.position : "Organization Member",
          skills: normalizeStringArray(record.skills)
        };
      })
    : [];
}

export async function getOrganizationJoinRequests(user: User, organizationId: string): Promise<OrganizationJoinRequest[]> {
  const data = await organizationRequest<{ requests?: unknown[] }>(user, `/auth/organizations/${organizationId}/join-requests`);
  return Array.isArray(data.requests)
    ? data.requests.map((request) => {
        const record = isRecord(request) ? request : {};
        return {
          id: typeof record.id === "string" ? record.id : crypto.randomUUID(),
          name: typeof record.name === "string" ? record.name : "Unnamed member",
          email: typeof record.email === "string" ? record.email : "",
          position: typeof record.position === "string" ? record.position : "Organization Member",
          skills: normalizeStringArray(record.skills)
        };
      })
    : [];
}

export async function getMyOrganizationJoinRequest(user: User): Promise<MyOrganizationJoinRequest | null> {
  const data = await organizationRequest<{ request?: unknown | null }>(user, "/auth/organizations/join-requests/me");
  const request = data.request;

  if (!isRecord(request)) {
    return null;
  }

  return {
    id: typeof request.id === "string" ? request.id : crypto.randomUUID(),
    organizationId: typeof request.organizationId === "string" ? request.organizationId : "",
    organizationName: typeof request.organizationName === "string" ? request.organizationName : "this organization"
  };
}

export function reviewOrganizationJoinRequest(user: User, organizationId: string, requestId: string, status: "accepted" | "rejected") {
  return organizationRequest<void>(user, `/auth/organizations/${organizationId}/join-requests/${requestId}`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export async function getOrganizationManagementDetail(user: User, organizationId: string): Promise<OrganizationManagementDetail> {
  return organizationRequest<OrganizationManagementDetail>(user, `/auth/organizations/${organizationId}/management`);
}

export function createOrganization(
  user: User,
  input: { name: string; type: string; description: string }
) {
  return organizationRequest<{ organization: OrganizationRecord; user: AuthUserProfile }>(user, "/auth/organizations", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateOrganization(
  user: User,
  organizationId: string,
  input: Partial<Pick<OrganizationRecord, "name" | "type" | "description">> & { setupStatus?: "pending" | "active" | "inactive" }
) {
  return organizationRequest<{ organization: OrganizationRecord }>(user, `/auth/organizations/${organizationId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function getOrganizationRequests(user: User) {
  return organizationRequest<{ requests?: unknown[] }>(user, "/auth/org-requests");
}

export function reviewOrganizationRequest(
  user: User,
  requestId: string,
  status: "approved" | "rejected",
  rejectionReason: string | null
) {
  return organizationRequest<void>(user, `/auth/org-requests/${requestId}`, {
    method: "PATCH",
    body: JSON.stringify({ status, rejectionReason })
  });
}

function normalizeAdminMemberDirectory(value: unknown): AdminMemberDirectory {
  const record = isRecord(value) ? value : {};
  const members = Array.isArray(record.members)
    ? record.members.map((member) => {
        const item = isRecord(member) ? member : {};
        const role = isUserRole(item.role) ? item.role : "Organization Member";
        return {
          id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
          name: typeof item.name === "string" ? item.name : "Campus Member",
          email: typeof item.email === "string" ? item.email : "",
          role,
          position: typeof item.position === "string" ? item.position : role,
          organizationId: typeof item.organizationId === "string" ? item.organizationId : null,
          organization: typeof item.organization === "string" ? item.organization : "Unassigned",
          committeeId: typeof item.committeeId === "string" ? item.committeeId : null,
          committee: typeof item.committee === "string" ? item.committee : "Unassigned",
          inviteStatus: normalizeAdminInviteStatus(item.inviteStatus),
          joinedDate: typeof item.joinedDate === "string" ? item.joinedDate : null
        };
      })
    : [];

  const organizations = Array.isArray(record.organizations)
    ? record.organizations.map((organization) => {
        const item = isRecord(organization) ? organization : {};
        return {
          id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
          name: typeof item.name === "string" ? item.name : "Untitled organization"
        };
      })
    : [];

  const committees = Array.isArray(record.committees)
    ? record.committees.map((committee) => {
        const item = isRecord(committee) ? committee : {};
        return {
          id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
          name: typeof item.name === "string" ? item.name : "Untitled committee",
          organizationId: typeof item.organizationId === "string" ? item.organizationId : null
        };
      })
    : [];

  return { members, organizations, committees };
}

export async function getAdminMemberDirectory(user: User): Promise<AdminMemberDirectory> {
  const data = await organizationRequest<unknown>(user, "/auth/members");
  return normalizeAdminMemberDirectory(data);
}

export async function createAdminMembersStream(
  user: User,
  callbacks: {
    onData: (directory: AdminMemberDirectory) => void;
    onError: () => void;
  }
) {
  const token = await user.getIdToken();
  const stream = new EventSource(`${API_BASE_URL}/auth/members/stream?token=${encodeURIComponent(token)}`);

  stream.addEventListener("members", (event) => {
    callbacks.onData(normalizeAdminMemberDirectory(JSON.parse(event.data)));
  });

  // The native "error" event fires on both transient connection drops (which
  // EventSource auto-retries) and permanent failures. Only call onError when
  // the stream is permanently closed; ignore reconnect cycles.
  stream.addEventListener("error", () => {
    if (stream.readyState === EventSource.CLOSED) {
      callbacks.onError();
    }
  });

  return () => stream.close();
}

export function updateAdminMember(
  user: User,
  memberId: string,
  input: Partial<Pick<AdminMemberRecord, "role" | "position" | "organizationId" | "committeeId">> & {
    organizationName?: string;
    committeeName?: string;
  }
) {
  return organizationRequest<void>(user, `/auth/members/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function bulkUpdateAdminMembersRole(user: User, memberIds: string[], role: UserRole) {
  return organizationRequest<void>(user, "/auth/members/bulk-role", {
    method: "PATCH",
    body: JSON.stringify({ memberIds, role })
  });
}
