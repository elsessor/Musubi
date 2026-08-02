"use client";

import { onAuthStateChanged, type Auth } from "firebase/auth";
import { useEffect } from "react";

import { getFirebaseAuth, getFirebaseConfigStatus } from "@/firebase/config";
import { exchangeFirebaseSession } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";

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

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      if (!firebaseUser) {
        logout();
        setLoading(false);
        return;
      }

      setFirebaseUser(firebaseUser);

      try {
        const session = await exchangeFirebaseSession(firebaseUser);
        setProfile(session.user);
      } catch {
        showToast({
          title: "Session sync failed",
          description: "You are signed in with Firebase, but the backend session could not start.",
          tone: "error"
        });
      }

      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [logout, setFirebaseUser, setLoading, setProfile, showToast]);
}
