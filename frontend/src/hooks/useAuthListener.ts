"use client";

import { onAuthStateChanged, type Auth } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect } from "react";

import { getFirebaseAuth, getFirebaseConfigStatus, getFirebaseDb } from "@/firebase/config";
import { exchangeFirebaseSession } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { UserRole } from "@/types/auth";

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

    let userDocUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      if (userDocUnsubscribe) {
        userDocUnsubscribe();
        userDocUnsubscribe = null;
      }

      if (!firebaseUser) {
        logout();
        setLoading(false);
        return;
      }

      setFirebaseUser(firebaseUser);

      try {
        const session = await exchangeFirebaseSession(firebaseUser, firebaseUser.displayName || undefined);
        setProfile(session.user);
      } catch {
        showToast({
          title: "Session sync failed",
          description: "You are signed in with Firebase, but the backend session could not start.",
          tone: "error"
        });
      }

      // Realtime listener for Firestore user doc changes (e.g. accepted join requests, role updates)
      try {
        const db = getFirebaseDb();
        userDocUnsubscribe = onSnapshot(
          doc(db, "users", firebaseUser.uid),
          (snapshot) => {
            const data = snapshot.data();
            if (!data) return;
            const current = useAuthStore.getState().profile;
            if (current) {
              const liveOrgId = typeof data.organizationId === "string" ? data.organizationId : null;
              const liveOrgName =
                typeof data.organizationName === "string" && data.organizationName.trim()
                  ? data.organizationName.trim()
                  : null;
              const liveRole: UserRole =
                data.role === "Admin" || data.role === "Student Leader" || data.role === "Organization Member"
                  ? data.role
                  : current.role;
              const livePosition = typeof data.position === "string" ? data.position : current.position;

              if (
                current.organizationId !== liveOrgId ||
                current.organizationName !== liveOrgName ||
                current.role !== liveRole ||
                current.position !== livePosition
              ) {
                setProfile({
                  ...current,
                  organizationId: liveOrgId,
                  organizationName: liveOrgName,
                  role: liveRole,
                  position: livePosition
                });
              }
            }
          },
          () => {
            // Ignore snapshot permission errors if rules restrict
          }
        );
      } catch {
        // Ignore db init errors
      }

      setLoading(false);
    });

    return () => {
      if (userDocUnsubscribe) userDocUnsubscribe();
      unsubscribe();
    };
  }, [logout, setFirebaseUser, setLoading, setProfile, showToast]);
}
