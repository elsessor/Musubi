import type { NextFunction, Request, Response } from "express";

import { getCurrentUser, loginWithFirebaseToken } from "../services/auth.service.js";
import type { AuthenticatedRequest } from "../types/auth.types.js";
import { AppError } from "../utils/AppError.js";

function getBearerToken(request: Request): string | null {
  const header = request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length);
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
