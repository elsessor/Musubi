import type { NextFunction, Request, Response } from "express";

import { AppError } from "../utils/AppError.js";

export function notFoundMiddleware(request: Request, _response: Response, next: NextFunction) {
  next(new AppError(`Route not found: ${request.method} ${request.originalUrl}`, 404));
}

export function errorMiddleware(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
) {
  console.error("[ServerError]:", error);

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      message: error.message
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Internal server error.";

  response.status(500).json({
    message
  });
}
