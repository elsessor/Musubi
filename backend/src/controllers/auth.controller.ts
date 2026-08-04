import type { NextFunction, Request, Response } from "express";

import { firebaseAuth } from "../config/firebase.js";
import { completeUserOnboarding, getCurrentUser, getOrganizationForUser, getOrganizationRequests, loginWithFirebaseToken, reviewOrganizationRequest } from "../services/auth.service.js";
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
