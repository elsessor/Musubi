"use client";

import type { User } from "firebase/auth";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { UserRole } from "@/types/auth";

type AuthSession = {
  token: string;
  role: UserRole;
};

type AuthState = {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (session: AuthSession) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,
      loading: true,
      isAuthenticated: false,
      login: (session) =>
        set({
          token: session.token,
          role: session.role,
          isAuthenticated: true
        }),
      logout: () =>
        set({
          user: null,
          token: null,
          role: null,
          isAuthenticated: false,
          loading: false
        }),
      setUser: (user) =>
        set((state) => ({
          user,
          isAuthenticated: Boolean(user && state.token)
        })),
      setLoading: (loading) => set({ loading })
    }),
    {
      name: "campus-workflow-auth",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        token: state.token,
        role: state.role,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
