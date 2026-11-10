import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/auth.types.js";
import { firestore } from "../config/firebase.js";
import { AppError } from "../utils/AppError.js";
import { tutorialStatusSchema } from "../utils/tutorialStatus.js";
import { mergeOnboarding, normalizeLegacyOnboarding, onboardingSchema, onboardingRunTime } from "../utils/onboardingProgress.js";

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
    const tutorial = await firestore.runTransaction(async (transaction) => {
      const current = await transaction.get(ref);
      if (current.data()?.role !== role) throw new AppError("Account role has changed. Reload your workspace.", 409);
      const previous = current.data()?.tutorials?.[key];
      const oldOnboarding = onboardingSchema.safeParse(previous?.onboarding);
      const oldProgress = normalizeLegacyOnboarding(oldOnboarding.success ? oldOnboarding.data : undefined, previous?.tour);
      const runDifference = onboardingRunTime(progress.onboarding) - onboardingRunTime(oldProgress);
      const currentProgress = runDifference < 0 ? previous : progress;
      const seenPages = runDifference === 0
        ? [...new Set([...(Array.isArray(previous?.seenPages) ? previous.seenPages : []), ...(progress.seenPages ?? [])])]
        : currentProgress.seenPages ?? [];
      const onboarding = mergeOnboarding(oldProgress, progress.onboarding);
      const nextProgress = { ...currentProgress, seenPages, ...(onboarding ? { onboarding } : {}), updatedAt: new Date().toISOString() };
      // Concurrent devices must retain each other's first-visit acknowledgements.
      // Replace this role's map so a restart removes old nested completion fields.
      transaction.update(ref, { [`tutorials.${key}`]: nextProgress });
      return nextProgress;
    });
    response.json({ role, tutorial });
  } catch (error) { next(error); }
}
