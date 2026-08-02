"use client";

import type { User } from "firebase/auth";
import { create } from "zustand";

import type { AuthUserProfile } from "@/types/auth";

type AuthState = {
  firebaseUser: User | null;
  profile: AuthUserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  setFirebaseUser: (user: User | null) => void;
  setProfile: (profile: AuthUserProfile | null) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
};

export const useAuthStore = create<AuthState>()((set) => ({
  firebaseUser: null,
  profile: null,
  loading: true,
  isAuthenticated: false,
  setFirebaseUser: (firebaseUser) =>
    set({
      firebaseUser,
      isAuthenticated: Boolean(firebaseUser)
    }),
  setProfile: (profile) =>
    set({
      profile
    }),
  logout: () =>
    set({
      firebaseUser: null,
      profile: null,
      isAuthenticated: false,
      loading: false
    }),
  setLoading: (loading) => set({ loading })
}));
