import { firebaseAdmin, firestore } from "../config/firebase.js";
import { getTestAccount, provisionedTestAccount, TEST_ACCOUNT_SUITE, TEST_ORGANIZATION_ID } from "../config/testAccounts.js";
import { AppError } from "../utils/AppError.js";
import { testAccountSessionUpdate } from "../utils/testAccountSession.js";

export async function prepareTestAccountLogin(uid: string, email: string | undefined, authTime: number) {
  if (!getTestAccount(email)) return;
  const ref = firestore.collection("users").doc(uid);
  const orgRef = firestore.collection("organizations").doc(TEST_ORGANIZATION_ID);
  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data() ?? {};
    const update = testAccountSessionUpdate(uid, email, authTime, data);
    if (!update) return;
    const organization = await transaction.get(orgRef);
    if (organization.data()?.testAccountSuite !== TEST_ACCOUNT_SUITE || organization.data()?.status !== "active") {
      throw new AppError("The test organization is unavailable. Run the test-account setup again.", 503);
    }
    // Replacing tutorials as one map also removes completed modules from old runs.
    // auth_time makes duplicate login exchanges and page refreshes idempotent.
    transaction.update(ref, update);
  });
}

export async function acceptTestOrganizationJoin(uid: string, organizationId: string) {
  if (organizationId !== TEST_ORGANIZATION_ID) return null;
  const userRef = firestore.collection("users").doc(uid);
  const orgRef = firestore.collection("organizations").doc(organizationId);
  const requestRef = firestore.collection("organization_join_requests").doc(uid);
  return firestore.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const data = userSnapshot.data() ?? {};
    const account = provisionedTestAccount(uid, data);
    if (!account) return null;
    const organization = await transaction.get(orgRef);
    const org = organization.data() ?? {};
    const status = org.setupStatus ?? org.status;
    if (org.testAccountSuite !== TEST_ACCOUNT_SUITE || status !== "active") {
      throw new AppError("The test organization is not available to join.", 404);
    }
    const previousRequest = await transaction.get(requestRef);
    const pending = await transaction.get(firestore.collection("organization_join_requests")
      .where("organizationId", "==", organizationId).where("requestedByUID", "==", uid).where("status", "==", "pending"));
    const reviewedAt = firebaseAdmin.firestore.FieldValue.serverTimestamp();
    transaction.update(userRef, {
      organizationId, organizationName: org.name || "Musubi Test Organization",
      committeeId: account.committeeId, committeeName: account.committeeName
    });
    transaction.set(requestRef, {
      organizationId, requestedByUID: uid, name: data.fullName || account.fullName,
      email: data.email, position: data.position ?? null, skills: Array.isArray(data.skills) ? data.skills : [],
      status: "accepted", testAccountSuite: TEST_ACCOUNT_SUITE,
      submittedAt: previousRequest.data()?.submittedAt ?? reviewedAt,
      reviewedAt, reviewedByUID: "test-account-auto-accept"
    }, { merge: true });
    for (const request of pending.docs) {
      if (request.ref.path !== requestRef.path) transaction.update(request.ref, {
        status: "accepted", reviewedAt, reviewedByUID: "test-account-auto-accept"
      });
    }
    return { id: requestRef.id };
  });
}
