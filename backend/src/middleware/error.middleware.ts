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
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
  const isQuotaError = code === 8 || code === "RESOURCE_EXHAUSTED"
    || /quota exceeded|resource[_ ]exhausted|429|too many requests/i.test(message);
  const isAiError = /genkit|gemini|generativelanguage|googleai/i.test(message);

  if (isQuotaError) {
    response.status(isAiError ? 429 : 503).json({
      code: isAiError ? "AI_QUOTA_EXCEEDED" : "DATABASE_QUOTA_EXCEEDED",
      message: isAiError
        ? "AI generation has reached a service usage limit. Please try again later. If it persists, check the AI project's quota."
        : "The database has reached a usage or capacity limit. Please try again later. The project administrator should check Cloud Firestore usage and quotas."
    });
    return;
  }

  response.status(500).json({ message });

}
