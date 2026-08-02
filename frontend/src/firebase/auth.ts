"use client";

import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

import { getFirebaseAuth, getFirebaseDb } from "@/firebase/config";
import type { LoginCredentials, RegisterCredentials, UserRole } from "@/types/auth";

const DEFAULT_ROLE: UserRole = "Organization Member";

async function createUserDocument(user: User, fullName: string): Promise<void> {
  const db = getFirebaseDb();

  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    fullName,
    email: user.email ?? "",
    role: DEFAULT_ROLE,
    organizationId: null,
    profilePicture: user.photoURL,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp()
  });
}

async function createUserDocumentIfMissing(user: User): Promise<void> {
  const db = getFirebaseDb();
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await createUserDocument(user, user.displayName ?? "Campus Member");
    return;
  }

  await updateDoc(userRef, {
    lastLogin: serverTimestamp(),
    profilePicture: user.photoURL
  });
}

export async function registerWithEmail(credentials: RegisterCredentials): Promise<User> {
  const auth = getFirebaseAuth();

  await setPersistence(auth, browserLocalPersistence);

  const result = await createUserWithEmailAndPassword(
    auth,
    credentials.email,
    credentials.password
  );

  await updateProfile(result.user, {
    displayName: credentials.fullName
  });

  await createUserDocument(result.user, credentials.fullName);
  return result.user;
}

export async function loginWithEmail(credentials: LoginCredentials): Promise<User> {
  const auth = getFirebaseAuth();

  await setPersistence(
    auth,
    credentials.rememberMe ? browserLocalPersistence : browserSessionPersistence
  );

  const result = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);

  await createUserDocumentIfMissing(result.user);

  return result.user;
}

export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();

  await setPersistence(auth, browserLocalPersistence);

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const result = await signInWithPopup(auth, provider);
  await createUserDocumentIfMissing(result.user);

  return result.user;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const auth = getFirebaseAuth();

  await sendPasswordResetEmail(auth, email);
}

export async function logoutFirebase(): Promise<void> {
  const auth = getFirebaseAuth();

  await signOut(auth);
}
