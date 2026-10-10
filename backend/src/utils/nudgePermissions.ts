import type { JwtPayload } from "../types/auth.types.js";
import { AppError } from "./AppError.js";

export function assertCanSendManualNudge(actor: JwtPayload | undefined, recipientUID?: unknown, recipientEmail?: unknown): void {
  if (!actor) throw new AppError("Sign in to send a nudge.", 401);
  if (actor.role !== "Student Leader" && actor.role !== "Admin") {
    throw new AppError("Only leaders and admins can send manual nudges.", 403);
  }
  const email = typeof recipientEmail === "string" ? recipientEmail.trim().toLowerCase() : "";
  if (recipientUID === actor.uid || (email && email === actor.email.trim().toLowerCase())) {
    throw new AppError("You cannot send a manual nudge to yourself.", 403);
  }
}
