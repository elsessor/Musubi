import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/auth.types.js";
import { firestore } from "../config/firebase.js";
import { AppError } from "../utils/AppError.js";
import { tutorialStatusSchema } from "../utils/tutorialStatus.js";

// Only the authenticated account's tutorial field is read or updated. Roles
// come from the stored account, never a role supplied by the browser.
export async function tutorialController(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  try {
    if (!request.authUser) throw new AppError("Authentication required.", 401);
    const ref = firestore.collection("users").doc(request.authUser.uid);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new AppError("Account not found.", 404);
    const role = snapshot.data()?.role;
    if (!["Admin", "Student Leader", "Organization Member"].includes(role)) throw new AppError("Invalid account role.", 403);
    const key = `${role}:v1`;
    if (request.method === "GET") {
      response.json({ role, tutorial: snapshot.data()?.tutorials?.[key] ?? null });
      return;
    }
    const parsed = tutorialStatusSchema.safeParse(request.body);
    if (!parsed.success) throw new AppError("Invalid tutorial progress.", 400);
    const { role: expectedRole, ...progress } = parsed.data;
    if (expectedRole !== role) throw new AppError("Account role has changed. Reload your workspace.", 409);
    const tutorial = { ...progress, updatedAt: new Date().toISOString() };
    await ref.set({ tutorials: { [key]: tutorial } }, { merge: true });
    response.json({ role, tutorial });
  } catch (error) { next(error); }
}
