import { getTestAccount, TEST_ACCOUNT_SUITE } from "../config/testAccounts.js";

export function testAccountSessionUpdate(uid: string, email: string | undefined, authTime: number, data: Record<string, any>, now = Date.now()) {
  const account = getTestAccount(email);
  if (!account || data.testAccountSuite !== TEST_ACCOUNT_SUITE || data.testAccountUid !== uid) return null;
  if (!Number.isSafeInteger(authTime) || authTime <= 0) throw new Error("A valid Firebase sign-in time is required for a test account.");
  const previousAuthTime = Number.isSafeInteger(data.testAccountAuthTime) ? data.testAccountAuthTime : 0;
  const reset = authTime > previousAuthTime;
  if (!reset) return null;
  const update: Record<string, unknown> = {
    role: "Organization Member",
    organizationId: null,
    organizationName: null,
    onboardingCompleted: false,
    position: null, skills: [], yearLevel: null, program: null, birthdate: null,
    committeeId: null, committeeName: null,
    testAccountAuthTime: Math.max(authTime, previousAuthTime)
  };
  if (reset) {
    const previousRuns = Object.values(data.tutorials ?? {}).map((tutorial: any) => Date.parse(tutorial?.onboarding?.restartedAt ?? ""));
    const restartedAt = new Date(Math.max(now, ...previousRuns.filter(Number.isFinite).map((time) => time + 1))).toISOString();
    update.tutorials = Object.fromEntries(["Student Leader", "Organization Member"].map((role) => [
      `${role}:v1`, {
        version: 1, status: "in_progress", step: 0, tour: "quick", acknowledged: false,
        seenPages: [], updatedAt: restartedAt, onboarding: { version: 1, restartedAt }
      }
    ]));
  }
  return update;
}
