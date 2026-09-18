import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import admin from "firebase-admin";
import { getOrganizationRequests } from "./src/services/auth.service.js";

dotenv.config({ path: path.resolve(".env") });

const serviceAccountPath = path.resolve(".firebase-service-account.json");
const rawServiceAccount = fs.readFileSync(serviceAccountPath, "utf8");
const serviceAccount = JSON.parse(rawServiceAccount);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function run() {
  console.log("Calling getOrganizationRequests for nyNiAwhonKWy5zfWpoyigYmKOPy2...");
  try {
    const res = await getOrganizationRequests("nyNiAwhonKWy5zfWpoyigYmKOPy2");
    console.log("Result:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("Error calling getOrganizationRequests:", err);
  }
}

run().catch(console.error);
