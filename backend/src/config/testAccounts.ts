export const TEST_ACCOUNT_SUITE = "musubi-training-v1";
export const TEST_ORGANIZATION_ID = "musubi-test-organization";
export const TEST_ORGANIZATION_NAME = "Musubi Test Organization";
export const TEST_ORGANIZATION_STATUSES = { status: "active", setupStatus: "active" } as const;

export const TEST_ACCOUNTS = Array.from({ length: 20 }, (_, offset) => {
    const number = offset + 1;
    const legacyNumber = offset < 10 ? number : number - 10;
    const legacyPrefix = offset < 10 ? "studentleader" : "orgmember";
    return {
      uid: `musubi-test-${legacyPrefix}${legacyNumber}`,
      legacyEmail: `${legacyPrefix}${legacyNumber}@university.edu.ph`,
      email: `test${number}@university.edu.ph`,
      fullName: `Test Account ${number}`,
      role: "Organization Member" as const,
      position: null,
      committeeId: legacyNumber <= 5 ? "musubi-test-events" : "musubi-test-documentation",
      committeeName: legacyNumber <= 5 ? "Test Events Committee" : "Test Documentation Committee",
      skills: [] as string[]
    };
});

// Email alone never grants test privileges. The login utility also requires
// the Admin-provisioned suite marker and UID binding on the stored profile.
export function getTestAccount(email: string | undefined) {
  return TEST_ACCOUNTS.find((account) => account.email === email?.trim().toLowerCase());
}

export function provisionedTestAccount(uid: string, data: Record<string, any>) {
  const account = getTestAccount(typeof data.email === "string" ? data.email : undefined);
  return account && data.testAccountSuite === TEST_ACCOUNT_SUITE && data.testAccountUid === uid ? account : null;
}
