import { firebaseAuth, firestore } from "../config/firebase.js";
import { env } from "../config/env.js";

async function main() {
  const [,, email, password, fullName] = process.argv;
  if (!email || !password) {
    console.error("Usage: node ./dist/src/scripts/createAdmin.js <email> <password> [fullName]");
    process.exit(1);
  }

  try {
    const userRecord = await firebaseAuth.createUser({ email, password, displayName: fullName ?? "System Admin" });
    const uid = userRecord.uid;
    await firestore.collection("users").doc(uid).set({
      uid,
      fullName: fullName ?? "System Admin",
      email,
      role: "Admin",
      position: null,
      organizationId: null,
      profilePicture: null,
      skills: [],
      onboardingCompleted: true,
      createdAt: new Date(),
      lastLogin: new Date()
    }, { merge: true });

    console.log(`Created admin user: ${email} (uid: ${uid})`);
    process.exit(0);
  } catch (err) {
    console.error("Failed to create admin user:", err instanceof Error ? err.message : err);
    process.exit(2);
  }
}

main();
