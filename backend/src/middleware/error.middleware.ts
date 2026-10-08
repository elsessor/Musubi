import type { NextFunction, Request, Response } from "express";

import { AppError } from "../utils/AppError.js";

export function notFoundMiddleware(request: Request, _response: Response, next: NextFunction) {
  next(new AppError(`Route not found: ${request.method} ${request.originalUrl}`, 404));
}

export function errorMiddleware(
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction
) {
  console.error("[ServerError]:", error);

  if (typeof error === "object" && error !== null && "status" in error && error.status === 413) {
    response.status(413).json({
      message: request.path.endsWith("/attachments/files")
        ? "Each attachment must be 5 MB or smaller."
        : "This request is too large."
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      message: error.message
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Internal server error.";
  const isRateLimit = message.includes("429 Too Many Requests") || message.includes("Quota exceeded");

  response.status(isRateLimit ? 429 : 500).json({
    message: isRateLimit
      ? "Gemini AI API rate limit exceeded (Free Tier limit is 5 requests/min). Please wait ~30 seconds before trying again, or upgrade your API key billing."
      : message
  });
}
