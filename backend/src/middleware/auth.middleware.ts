import type { NextFunction, Response } from "express";

import { verifyAppJwt } from "../services/auth.service.js";
import type { AuthenticatedRequest } from "../types/auth.types.js";
import { AppError } from "../utils/AppError.js";

export function requireAuth(
  request: AuthenticatedRequest,
  _response: Response,
  next: NextFunction
) {
  try {
    const header = request.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      throw new AppError("Authorization token is required.", 401);
    }

    const token = header.slice("Bearer ".length);
    request.authUser = verifyAppJwt(token);
    next();
  } catch (error) {
    next(error);
  }
}
