import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const requiredFirebaseEnvKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID"
] as const;

type FirebaseEnvKey = (typeof requiredFirebaseEnvKeys)[number];

type FirebaseConfigStatus = {
  isConfigured: boolean;
  missingKeys: FirebaseEnvKey[];
};

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

function readEnvValue(key: FirebaseEnvKey): string | undefined {
  const value = process.env[key]?.trim();

  if (!value || value.startsWith("your-")) {
    return undefined;
  }

  return value;
}

export function getFirebaseConfigStatus(): FirebaseConfigStatus {
  const missingKeys = requiredFirebaseEnvKeys.filter((key) => !readEnvValue(key));

  return {
    isConfigured: missingKeys.length === 0,
    missingKeys
  };
}

function getFirebaseOptions(): FirebaseOptions {
  const status = getFirebaseConfigStatus();

  if (!status.isConfigured) {
    throw new Error(
      `Firebase is not configured. Missing or placeholder values: ${status.missingKeys.join(", ")}`
    );
  }

  return {
    apiKey: readEnvValue("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: readEnvValue("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: readEnvValue("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: readEnvValue("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: readEnvValue("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: readEnvValue("NEXT_PUBLIC_FIREBASE_APP_ID")
  };
}

export function getFirebaseApp(): FirebaseApp {
  if (cachedApp) {
    return cachedApp;
  }

  cachedApp = getApps().length ? getApp() : initializeApp(getFirebaseOptions());
  return cachedApp;
}

export function getFirebaseAuth(): Auth {
  if (cachedAuth) {
    return cachedAuth;
  }

  cachedAuth = getAuth(getFirebaseApp());
  return cachedAuth;
}

export function getFirebaseDb(): Firestore {
  if (cachedDb) {
    return cachedDb;
  }

  cachedDb = getFirestore(getFirebaseApp());
  return cachedDb;
}
