"use client";

import { onAuthStateChanged, type Auth } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect } from "react";

import { getFirebaseAuth, getFirebaseConfigStatus, getFirebaseDb } from "@/firebase/config";
import { exchangeFirebaseSession } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { AuthUserDocument, AuthUserProfile, UserRole } from "@/types/auth";

const validRoles: UserRole[] = ["Admin", "Student Leader", "Organization Member"];

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && validRoles.includes(value as UserRole);
}

function toUserProfile(
  userId: string,
  fallbackName: string,
  fallbackEmail: string,
  fallbackPhotoUrl: string | null,
  data: Partial<AuthUserDocument> | null,
  fallbackRole: UserRole | null
): AuthUserProfile {
  return {
    uid: userId,
    fullName: typeof data?.fullName === "string" ? data.fullName : fallbackName,
    email: typeof data?.email === "string" ? data.email : fallbackEmail,
    role: isUserRole(data?.role) ? data.role : fallbackRole ?? "Organization Member",
    organizationId: typeof data?.organizationId === "string" ? data.organizationId : null,
    profilePicture: typeof data?.profilePicture === "string" ? data.profilePicture : fallbackPhotoUrl
  };
}

export function useAuthListener() {
  const logout = useAuthStore((state) => state.logout);
  const setFirebaseUser = useAuthStore((state) => state.setFirebaseUser);
  const setProfile = useAuthStore((state) => state.setProfile);
  const setLoading = useAuthStore((state) => state.setLoading);
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    const configStatus = getFirebaseConfigStatus();

    if (!configStatus.isConfigured) {
      setLoading(false);
      return;
    }

    let auth: Auth;
    let unsubscribeProfile = () => {};

    try {
      auth = getFirebaseAuth();
    } catch {
      setLoading(false);
      showToast({
        title: "Firebase is not configured",
        description: "Add your Firebase web app values to .env.local, then restart Next.js.",
        tone: "error"
      });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribeProfile();
      unsubscribeProfile = () => {};

      setLoading(true);

      if (!firebaseUser) {
        logout();
        setLoading(false);
        return;
      }

      setFirebaseUser(firebaseUser);

      let fallbackRole: UserRole | null = null;

      try {
        const session = await exchangeFirebaseSession(firebaseUser);
        fallbackRole = session.role;
        setProfile(session.user);
      } catch {
        showToast({
          title: "Session sync failed",
          description: "You are signed in with Firebase, but the backend session could not start.",
          tone: "error"
        });
      }

      const db = getFirebaseDb();
      const userRef = doc(db, "users", firebaseUser.uid);

      unsubscribeProfile = onSnapshot(
        userRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            return;
          }

          const data = snapshot.data() as Partial<AuthUserDocument>;
          setProfile(
            toUserProfile(
              firebaseUser.uid,
              firebaseUser.displayName ?? "Campus Member",
              firebaseUser.email ?? "",
              firebaseUser.photoURL ?? null,
              data,
              fallbackRole
            )
          );
        },
        () => {
          showToast({
            title: "Profile sync failed",
            description: "Live Firestore updates are temporarily unavailable.",
            tone: "error"
          });
        }
      );

      setLoading(false);
    });

    return () => {
      unsubscribeProfile();
      unsubscribe();
    };
  }, [logout, setFirebaseUser, setLoading, setProfile, showToast]);
}
