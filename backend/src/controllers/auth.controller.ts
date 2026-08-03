import type { NextFunction, Request, Response } from "express";

import { firebaseAuth } from "../config/firebase.js";
import { completeUserOnboarding, getCurrentUser, loginWithFirebaseToken } from "../services/auth.service.js";
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
    const { role, organizationId, yearLevel, program, skills } = request.body as Record<string, unknown>;
    if ((role !== "Student Leader" && role !== "Organization Member") || !(typeof organizationId === "string" || organizationId === null) || typeof yearLevel !== "string" || typeof program !== "string" || !Array.isArray(skills) || !skills.every((skill) => typeof skill === "string")) {
      throw new AppError("Invalid onboarding details.", 400);
    }
    response.status(200).json(await completeUserOnboarding(decodedToken.uid, { role, organizationId, yearLevel, program, skills }));
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
