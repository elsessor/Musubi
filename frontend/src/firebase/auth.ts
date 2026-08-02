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
  type User
} from "firebase/auth";

import { getFirebaseAuth } from "@/firebase/config";
import type { LoginCredentials, RegisterCredentials } from "@/types/auth";

export async function registerWithEmail(credentials: RegisterCredentials): Promise<User> {
  const auth = getFirebaseAuth();

  await setPersistence(auth, browserLocalPersistence);

  const result = await createUserWithEmailAndPassword(
    auth,
    credentials.email,
    credentials.password
  );

  return result.user;
}

export async function loginWithEmail(credentials: LoginCredentials): Promise<User> {
  const auth = getFirebaseAuth();

  await setPersistence(
    auth,
    credentials.rememberMe ? browserLocalPersistence : browserSessionPersistence
  );

  const result = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);

  return result.user;
}

export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();

  await setPersistence(auth, browserLocalPersistence);

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const result = await signInWithPopup(auth, provider);

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
