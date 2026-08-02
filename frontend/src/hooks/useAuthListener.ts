"use client";

import { onAuthStateChanged, type Auth } from "firebase/auth";
import { useEffect } from "react";

import { getFirebaseAuth, getFirebaseConfigStatus } from "@/firebase/config";
import { exchangeFirebaseSession } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";

export function useAuthListener() {
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setUser = useAuthStore((state) => state.setUser);
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

      setUser(firebaseUser);

      try {
        const session = await exchangeFirebaseSession(firebaseUser);
        login(session);
      } catch {
        showToast({
          title: "Session sync failed",
          description: "You are signed in with Firebase, but the backend session could not start.",
          tone: "error"
        });
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [login, logout, setLoading, setUser, showToast]);
}
