import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { firebaseAdmin, firebaseAuth, firestore } from "../src/config/firebase.js";
import { TEST_ACCOUNTS, TEST_ACCOUNT_SUITE, TEST_ORGANIZATION_ID, TEST_ORGANIZATION_NAME, TEST_ORGANIZATION_STATUSES } from "../src/config/testAccounts.js";
import { testAccountSessionUpdate } from "../src/utils/testAccountSession.js";

const backendDir = path.resolve(__dirname, "..");
const credentialsDir = path.join(backendDir, ".local-test-accounts");
const credentialsPath = path.join(credentialsDir, "credentials.json");
const apply = process.argv.includes("--apply");
const adoptExisting = process.argv.includes("--adopt-existing");
const password = process.env.TEST_ACCOUNT_PASSWORD || "testaccount123_";

async function main() {
  const organizationRef = firestore.collection("organizations").doc(TEST_ORGANIZATION_ID);
  const organization = await organizationRef.get();
  if (organization.exists && organization.data()?.testAccountSuite !== TEST_ACCOUNT_SUITE) {
    throw new Error("The reserved test organization ID belongs to another organization. No changes were made.");
  }
  // Preflight every identity before creating anything. Adoption is limited to
  // explicitly requested addresses with unfinished, unaffiliated profiles.
  const authRecords = await firebaseAuth.getUsers(TEST_ACCOUNTS.flatMap(({ uid, email, legacyEmail }) => [{ uid }, { email }, { email: legacyEmail }]));
  for (const record of authRecords.users) {
    if (!TEST_ACCOUNTS.some((account) => account.email === record.email || account.legacyEmail === record.email) ||
        TEST_ACCOUNTS.some((account) => account.uid === record.uid && account.email !== record.email && account.legacyEmail !== record.email)) {
      throw new Error(`An existing account conflicts with ${record.email}. No changes were made.`);
    }
  }
  const accounts = TEST_ACCOUNTS.map((account) => {
    const matches = authRecords.users.filter((user) => user.email === account.email || user.email === account.legacyEmail);
    if (new Set(matches.map(({ uid }) => uid)).size > 1) throw new Error(`Both the old and new addresses for ${account.email} already exist. No changes were made.`);
    return { ...account, uid: matches[0]?.uid ?? account.uid };
  });
  const userRefs = accounts.map(({ uid }) => firestore.collection("users").doc(uid));
  const userDocs = await firestore.getAll(...userRefs);
  for (const document of userDocs) {
    const unfinished = document.data()?.onboardingCompleted !== true && !document.data()?.organizationId && document.data()?.role !== "Admin";
    if (document.exists && document.data()?.testAccountSuite !== TEST_ACCOUNT_SUITE && !(adoptExisting && unfinished)) {
      throw new Error(`The reserved test profile ${document.id} is already in use. No changes were made.`);
    }
  }
  if (!adoptExisting && accounts.some((account, index) => account.uid !== TEST_ACCOUNTS[index].uid && userDocs[index].data()?.testAccountSuite !== TEST_ACCOUNT_SUITE)) {
    throw new Error("An existing requested account needs explicit --adopt-existing before it can receive test credentials.");
  }
  const committeeIds = ["musubi-test-events", "musubi-test-documentation"];
  const eventRef = firestore.collection("events").doc("musubi-test-training-event");
  const announcementRef = firestore.collection("announcements").doc("musubi-test-welcome");
  const sampleRefs = [...committeeIds.map((id) => firestore.collection("committees").doc(id)), eventRef, announcementRef];
  const sampleDocs = await firestore.getAll(...sampleRefs);
  for (const document of sampleDocs) {
    if (document.exists && document.data()?.testAccountSuite !== TEST_ACCOUNT_SUITE) {
      throw new Error(`The reserved sample ${document.id} is already in use. No changes were made.`);
    }
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "preview", organization: TEST_ORGANIZATION_NAME, accounts: TEST_ACCOUNTS.length,
    newAccounts: TEST_ACCOUNTS.length - new Set(authRecords.users.map(({ uid }) => uid)).size,
    renamedAccounts: accounts.filter((account) => authRecords.users.some((user) => user.uid === account.uid && user.email !== account.email)).length,
    roles: "Chosen by the user during setup", sampleCommittees: 2, sampleEvents: 1, assignedPracticeTasks: 20 }));
  if (!apply) return;

  const credentials = accounts.map(({ uid, email }) => ({ uid, email, role: "Choose during setup", password }));
  await mkdir(credentialsDir, { recursive: true });
  // Save before Auth mutations so an interrupted migration retains its UID map.
  await writeFile(credentialsPath, JSON.stringify({ suite: TEST_ACCOUNT_SUITE, accounts: credentials }, null, 2) + "\n", { mode: 0o600 });
  await writeFile(path.join(credentialsDir, "credentials.csv"), "Email,Role,Password\n" + credentials.map(({ email, role, password }) => `${email},${role},${password}`).join("\n") + "\n", { mode: 0o600 });

  for (const account of accounts) {
    const existing = authRecords.users.find(({ uid }) => uid === account.uid);
    if (!existing) {
      if (!password) throw new Error(`A password is required for the new account ${account.email}.`);
      await firebaseAuth.createUser({ uid: account.uid, email: account.email, displayName: account.fullName, password, emailVerified: true, disabled: true });
    } else {
      await firebaseAuth.updateUser(account.uid, { email: account.email, displayName: account.fullName, password, emailVerified: true });
    }
  }

  const timestamp = firebaseAdmin.firestore.FieldValue.serverTimestamp();
  const batch = firestore.batch();
  batch.set(organizationRef, {
    name: TEST_ORGANIZATION_NAME, type: "Academic", ...TEST_ORGANIZATION_STATUSES,
    description: "Shared test workspace for practicing Musubi features. These are test accounts and practice records.",
    testAccountSuite: TEST_ACCOUNT_SUITE, requestedByUID: accounts[0].uid,
    ...(organization.exists ? {} : { createdAt: timestamp, organizationConfig: { delegationMode: "Heuristic", aiTaskAtomization: true, nudgeMonitoring: true } }), updatedAt: timestamp
  }, { merge: true });
  for (let index = 0; index < accounts.length; index++) {
    const account = accounts[index];
    const previous = userDocs[index];
    const needsSetup = !previous.exists || previous.data()?.email !== account.email || previous.data()?.testAccountSuite !== TEST_ACCOUNT_SUITE;
    batch.set(userRefs[index], {
      uid: account.uid, email: account.email, testAccountSuite: TEST_ACCOUNT_SUITE, testAccountUid: account.uid,
      ...(needsSetup ? {
        ...testAccountSessionUpdate(account.uid, account.email, 1, { ...previous.data(), testAccountAuthTime: 0,
          testAccountSuite: TEST_ACCOUNT_SUITE, testAccountUid: account.uid }),
        fullName: account.fullName, availability: "Available", status: "Available",
        ...(!previous.exists ? { profilePicture: null, createdAt: timestamp } : {}),
        lastLogin: timestamp, testAccountAuthTime: 0
      } : {})
    }, { merge: true });
    batch.set(firestore.collection("organization_join_requests").doc(account.uid), {
      organizationId: TEST_ORGANIZATION_ID, requestedByUID: account.uid, name: account.fullName, email: account.email,
      position: account.position, skills: account.skills, status: "accepted", testAccountSuite: TEST_ACCOUNT_SUITE,
      submittedAt: timestamp, reviewedAt: timestamp, reviewedByUID: "test-account-provisioner"
    }, { merge: true });
  }
  committeeIds.forEach((id, index) => {
    if (sampleDocs[index].exists) return;
    batch.set(sampleRefs[index], { orgId: organizationRef, name: index === 0 ? "Test Events Committee" : "Test Documentation Committee",
      description: index === 0 ? "Practice planning, scheduling, and coordinating event activities." : "Practice preparing event materials and documenting activities.",
      headMemberUID: accounts[index === 0 ? 0 : 5].uid, testAccountSuite: TEST_ACCOUNT_SUITE, createdAt: timestamp });
  });
  const now = new Date();
  const date = (days: number) => new Date(now.getTime() + days * 86400000).toISOString().slice(0, 10);
  if (!sampleDocs[2].exists) {
    batch.set(eventRef, {
      orgId: TEST_ORGANIZATION_ID, title: "Musubi Practice Event", status: "Active",
      description: "Open your assigned practice task, update its progress, and submit it for leader review. Leaders can also create tasks, review submissions, and explore organization tools.",
      startDate: date(0), endDate: date(14), progress: 0, memberCount: 20, committee: "", customStatuses: [], statusOrder: [],
      createdBy: accounts[0].uid, createdAt: timestamp, testAccountSuite: TEST_ACCOUNT_SUITE,
      tasks: accounts.map((account, index) => ({
        id: `practice-task-${index + 1}`, subtaskUID: `practice-task-${index + 1}`,
        title: `Practice task ${index + 1}: ${account.fullName}`, description: "Review the task details, change the status to In Progress, and submit your practice output for review. This is a test task.",
        status: "To Do", priority: "Medium", startDate: date(0), dueDate: date(7), deadline: date(7),
        assignee: { initials: `T${index + 1}`, color: "bg-blue-600", name: account.fullName },
        assignedMemberUID: account.uid, assignedMemberName: account.fullName, committee: account.committeeName,
        requiredSkills: account.skills, isLeaderOnly: false, isAiGenerated: false, dependsOnTaskIds: [], attachments: [], nudges: []
      }))
    });
  } else {
    const tasks = sampleDocs[2].data()?.tasks;
    if (Array.isArray(tasks)) {
      batch.update(eventRef, { tasks: tasks.map((task) => {
        const account = accounts.find(({ uid }) => uid === task.assignedMemberUID);
        if (!account) return task;
        return { ...task, assignedMemberName: account.fullName, assignee: { ...task.assignee, name: account.fullName },
          ...(/^Practice task \d+: Test /.test(task.title || "") ? { title: task.title.replace(/: Test .*/, `: ${account.fullName}`) } : {}) };
      }) });
    }
  }
  if (!sampleDocs[3].exists) {
    const announcement = { organizationId: TEST_ORGANIZATION_ID, orgId: TEST_ORGANIZATION_ID,
      title: "Welcome to the test workspace", content: "Use these accounts to practice events, task updates, submissions, leader reviews, committees, announcements, and page guides. Walkthroughs restart when you sign in again. Practice records are shared and are not erased on sign-in.",
      targetAudience: "All Members", committeeId: null, committeeName: null, isPinned: true,
      authorName: accounts[0].fullName, authorUid: accounts[0].uid, authorRole: "Student Leader",
      createdAt: date(0), timestamp: now.getTime(), createdAtServer: timestamp, testAccountSuite: TEST_ACCOUNT_SUITE };
    batch.set(announcementRef, announcement);
    batch.set(organizationRef.collection("announcements").doc(announcementRef.id), announcement);
  } else if (sampleDocs[3].data()?.targetAudience === "Organization") {
    batch.update(announcementRef, { targetAudience: "All Members" });
    batch.set(organizationRef.collection("announcements").doc(announcementRef.id), { targetAudience: "All Members" }, { merge: true });
  }
  await batch.commit();
  for (const account of accounts) await firebaseAuth.updateUser(account.uid, { disabled: false, emailVerified: true });

  const verifiedUsers = await firebaseAuth.getUsers(accounts.map(({ uid }) => ({ uid })));
  const verifiedProfiles = await firestore.getAll(...userRefs);
  if (verifiedUsers.users.length !== 20 || verifiedUsers.users.some((user) => user.disabled || !user.emailVerified) ||
      verifiedProfiles.some((profile, index) => profile.data()?.email !== accounts[index].email || profile.data()?.testAccountUid !== accounts[index].uid)) {
    throw new Error("Setup verification failed. Re-run the setup to complete any interrupted steps.");
  }
  console.log(JSON.stringify({ verifiedAccounts: verifiedUsers.users.length, membership: "automatic after profile setup", credentialsFile: credentialsPath,
    onboarding: "role selection, profile details, skills, then walkthroughs; reset on a new sign-in", practiceData: "retained on re-run and sign-in" }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Test-account setup failed.");
  process.exitCode = 1;
}).finally(async () => { await firebaseAdmin.app().delete(); });
