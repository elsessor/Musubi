import fs from "node:fs";
import path from "node:path";

import admin from "firebase-admin";

import { env } from "./env.js";

function loadServiceAccount(): admin.ServiceAccount {
  const configuredPath = env.firebaseServiceAccountPath;
  const candidatePaths = [
    path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(process.cwd(), configuredPath),
    path.resolve(process.cwd(), ".firebase-service-account.json"),
    path.resolve(process.cwd(), "firebase-service-account.json")
  ];

  const serviceAccountPath = candidatePaths.find((candidate) => fs.existsSync(candidate));

  if (!serviceAccountPath) {
    throw new Error(
      `Firebase service account file was not found. Checked: ${candidatePaths.join(", ")}`
    );
  }

  const rawServiceAccount = fs.readFileSync(serviceAccountPath, "utf8");

  return JSON.parse(rawServiceAccount) as admin.ServiceAccount;
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(loadServiceAccount())
  });
}

export const firebaseAdmin = admin;
export const firebaseAuth = admin.auth();
export const firestore = admin.firestore();
