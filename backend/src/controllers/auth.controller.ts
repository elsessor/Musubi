import type { NextFunction, Request, Response } from "express";

import { firebaseAuth } from "../config/firebase.js";
import { completeUserOnboarding, createOrganization, getAllMembersForAdmin, getCurrentUser, getMyOrganizationJoinRequest, getOrganizationDirectory, getOrganizationForUser, getOrganizationJoinRequests, getOrganizationManagementDetail, getOrganizationMembers, getOrganizationRequests, getOrganizationsForAdmin, joinOrganization, loginWithFirebaseToken, reviewOrganizationJoinRequest, reviewOrganizationRequest, updateMemberAssignmentForAdmin, updateOrganizationForAdmin } from "../services/auth.service.js";
import type { AuthenticatedRequest } from "../types/auth.types.js";
import { AppError } from "../utils/AppError.js";

function getBearerToken(request: Request): string | null {
  const header = request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length);
}

export async function onboardingController(request: Request, response: Response, next: NextFunction) {
  try {
    const idToken = typeof request.body.idToken === "string" ? request.body.idToken : getBearerToken(request);
    if (!idToken) throw new AppError("Firebase ID token is required.", 400);
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    const { role, position, organizationId, yearLevel, program, skills, organizationRequest } = request.body as Record<string, unknown>;
    const validOrganizationRequest = organizationRequest === undefined || (typeof organizationRequest === "object" && organizationRequest !== null && typeof (organizationRequest as Record<string, unknown>).organizationId === "string" && typeof (organizationRequest as Record<string, unknown>).orgName === "string" && typeof (organizationRequest as Record<string, unknown>).orgType === "string" && typeof (organizationRequest as Record<string, unknown>).description === "string");
    if ((role !== "Student Leader" && role !== "Organization Member") || typeof position !== "string" || !position.trim() || !(typeof organizationId === "string" || organizationId === null) || typeof yearLevel !== "string" || typeof program !== "string" || !Array.isArray(skills) || !skills.every((skill) => typeof skill === "string") || !validOrganizationRequest) {
      throw new AppError("Invalid onboarding details.", 400);
    }
    response.status(200).json(await completeUserOnboarding(decodedToken.uid, { role, position, organizationId, yearLevel, program, skills, organizationRequest: organizationRequest as { organizationId: string; orgName: string; orgType: string; description: string } | undefined }));
  } catch (error) { next(error); }
}

export async function loginController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const idToken =
      typeof request.body.idToken === "string" ? request.body.idToken : getBearerToken(request);

    if (!idToken) {
      throw new AppError("Firebase ID token is required.", 400);
    }

    const session = await loginWithFirebaseToken(idToken);
    response.status(200).json(session);
  } catch (error) {
    next(error);
  }
}

export async function meController(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction
) {
  try {
    if (!request.authUser) {
      throw new AppError("Authentication is required.", 401);
    }

    const user = await getCurrentUser(request.authUser.uid);
    response.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}

export async function organizationRequestsController(request: Request, response: Response, next: NextFunction) {
  try {
    const token = getBearerToken(request);
    if (!token) throw new AppError("Firebase ID token is required.", 400);
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    response.status(200).json({ requests: await getOrganizationRequests(decodedToken.uid) });
  } catch (error) { next(error); }
}

export async function reviewOrganizationRequestController(request: Request, response: Response, next: NextFunction) {
  try {
    const token = getBearerToken(request);
    if (!token) throw new AppError("Firebase ID token is required.", 400);
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    const { status, rejectionReason } = request.body as Record<string, unknown>;
    if ((status !== "approved" && status !== "rejected") || !(typeof rejectionReason === "string" || rejectionReason === null)) throw new AppError("Invalid review details.", 400);
    if (status === "rejected" && (!rejectionReason || !rejectionReason.trim())) throw new AppError("A rejection reason is required.", 400);
    await reviewOrganizationRequest(decodedToken.uid, request.params.requestId, status, rejectionReason);
    response.status(204).send();
  } catch (error) { next(error); }
}

export async function organizationController(request: Request, response: Response, next: NextFunction) {
  try {
    const token = getBearerToken(request);
    if (!token) throw new AppError("Firebase ID token is required.", 400);
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    response.status(200).json({ organization: await getOrganizationForUser(decodedToken.uid, request.params.organizationId) });
  } catch (error) { next(error); }
}

export async function organizationDirectoryController(request: Request, response: Response, next: NextFunction) { try { const token = getBearerToken(request); if (!token) throw new AppError("Firebase ID token is required.", 400); const decoded = await firebaseAuth.verifyIdToken(token); response.status(200).json({ organizations: await getOrganizationDirectory(decoded.uid) }); } catch (error) { next(error); } }
export async function joinOrganizationController(request: Request, response: Response, next: NextFunction) { try { const token = getBearerToken(request); const organizationId = (request.body as Record<string, unknown>).organizationId; if (!token) throw new AppError("Firebase ID token is required.", 400); if (typeof organizationId !== "string" || !organizationId) throw new AppError("An organization is required.", 400); const decoded = await firebaseAuth.verifyIdToken(token); response.status(201).json({ request: await joinOrganization(decoded.uid, organizationId) }); } catch (error) { next(error); } }
export async function createOrganizationController(request: Request, response: Response, next: NextFunction) { try { const token = getBearerToken(request); const body = request.body as Record<string, unknown>; if (!token) throw new AppError("Firebase ID token is required.", 400); if (typeof body.name !== "string" || !body.name.trim() || typeof body.type !== "string" || !body.type.trim() || typeof body.description !== "string" || !body.description.trim()) throw new AppError("Name, type, and description are required.", 400); const decoded = await firebaseAuth.verifyIdToken(token); response.status(201).json(await createOrganization(decoded.uid, { name: body.name, type: body.type, description: body.description })); } catch (error) { next(error); } }
export async function organizationMembersController(request: Request, response: Response, next: NextFunction) { try { const token = getBearerToken(request); if (!token) throw new AppError("Firebase ID token is required.", 400); const decoded = await firebaseAuth.verifyIdToken(token); response.status(200).json({ members: await getOrganizationMembers(decoded.uid, request.params.organizationId) }); } catch (error) { next(error); } }
export async function organizationJoinRequestsController(request: Request, response: Response, next: NextFunction) { try { const token = getBearerToken(request); if (!token) throw new AppError("Firebase ID token is required.", 400); const decoded = await firebaseAuth.verifyIdToken(token); response.status(200).json({ requests: await getOrganizationJoinRequests(decoded.uid, request.params.organizationId) }); } catch (error) { next(error); } }
export async function myOrganizationJoinRequestController(request: Request, response: Response, next: NextFunction) { try { const token = getBearerToken(request); if (!token) throw new AppError("Firebase ID token is required.", 400); const decoded = await firebaseAuth.verifyIdToken(token); response.status(200).json({ request: await getMyOrganizationJoinRequest(decoded.uid) }); } catch (error) { next(error); } }
export async function allMembersController(request: Request, response: Response, next: NextFunction) { try { const token = getBearerToken(request); if (!token) throw new AppError("Firebase ID token is required.", 400); const decoded = await firebaseAuth.verifyIdToken(token); response.status(200).json({ members: await getAllMembersForAdmin(decoded.uid) }); } catch (error) { next(error); } }
export async function updateMemberAssignmentController(request: Request, response: Response, next: NextFunction) { try { const token = getBearerToken(request); const body = request.body as Record<string, unknown>; if (!token) throw new AppError("Firebase ID token is required.", 400); const validRole = body.membershipRole === undefined || body.membershipRole === "leader" || body.membershipRole === "committee_head" || body.membershipRole === "member"; const validId = (value: unknown) => value === undefined || value === null || typeof value === "string"; if (!validRole || !validId(body.organizationId) || !validId(body.committeeId)) throw new AppError("Invalid member assignment.", 400); const decoded = await firebaseAuth.verifyIdToken(token); await updateMemberAssignmentForAdmin(decoded.uid, request.params.memberId, { membershipRole: body.membershipRole as "leader" | "committee_head" | "member" | undefined, organizationId: body.organizationId as string | null | undefined, committeeId: body.committeeId as string | null | undefined }); response.status(204).send(); } catch (error) { next(error); } }
export async function reviewOrganizationJoinRequestController(request: Request, response: Response, next: NextFunction) { try { const token = getBearerToken(request); const status = (request.body as Record<string, unknown>).status; if (!token) throw new AppError("Firebase ID token is required.", 400); if (status !== "accepted" && status !== "rejected") throw new AppError("Invalid join request status.", 400); const decoded = await firebaseAuth.verifyIdToken(token); await reviewOrganizationJoinRequest(decoded.uid, request.params.organizationId, request.params.requestId, status); response.status(204).send(); } catch (error) { next(error); } }

export async function organizationsController(request: Request, response: Response, next: NextFunction) { try { const token = getBearerToken(request); if (!token) throw new AppError("Firebase ID token is required.", 400); const decoded = await firebaseAuth.verifyIdToken(token); response.status(200).json({ organizations: await getOrganizationsForAdmin(decoded.uid) }); } catch (error) { next(error); } }
export async function organizationManagementDetailController(request: Request, response: Response, next: NextFunction) { try { const token = getBearerToken(request); if (!token) throw new AppError("Firebase ID token is required.", 400); const decoded = await firebaseAuth.verifyIdToken(token); response.status(200).json(await getOrganizationManagementDetail(decoded.uid, request.params.organizationId)); } catch (error) { next(error); } }
export async function updateOrganizationController(request: Request, response: Response, next: NextFunction) { try { const token = getBearerToken(request); if (!token) throw new AppError("Firebase ID token is required.", 400); const decoded = await firebaseAuth.verifyIdToken(token); const body = request.body as Record<string, unknown>; const allowedStatus = body.setupStatus === undefined || body.setupStatus === "pending" || body.setupStatus === "active" || body.setupStatus === "inactive"; if (!allowedStatus || (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim())) || (body.type !== undefined && (typeof body.type !== "string" || !body.type.trim())) || (body.description !== undefined && typeof body.description !== "string")) throw new AppError("Invalid organization details.", 400); response.status(200).json({ organization: await updateOrganizationForAdmin(decoded.uid, request.params.organizationId, { name: body.name as string | undefined, type: body.type as string | undefined, description: body.description as string | undefined, setupStatus: body.setupStatus as string | undefined }) }); } catch (error) { next(error); } }
