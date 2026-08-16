"use client";

import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { getFirebaseDb } from "@/firebase/config";
import { useAuthStore } from "@/store/authStore";
import type { AuthUserProfile, UserRole } from "@/types/auth";
import type { DashboardUser } from "@/types/dashboard";

export function formatGreetingDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

export function getAcademicYear(date = new Date()): string {
  const month = date.getMonth();
  const year = date.getFullYear();
  const startYear = month >= 7 ? year : year - 1;
  return `AY ${startYear}–${startYear + 1}`;
}

export function buildFallbackUser(profile: AuthUserProfile | null): DashboardUser {
  const role: UserRole = profile?.role ?? "Student Leader";
  return {
    name: profile?.fullName ?? "User",
    role,
    roleLabel: profile?.position && profile.position.trim() ? profile.position : (role === "Admin" ? "System Administrator" : role),
    organizationName: profile?.organizationId ? "Ateneo Running Club" : "",
    academicYear: getAcademicYear(),
    greetingDate: formatGreetingDate()
  };
}

export function useDashboardUser() {
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const authLoading = useAuthStore((state) => state.loading);

  const [dashboardUser, setDashboardUser] = useState<DashboardUser>(() => buildFallbackUser(profile));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      const uid = profile?.uid ?? firebaseUser?.uid;

      if (!uid) {
        if (!cancelled) {
          setDashboardUser(buildFallbackUser(profile));
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        const userRef = doc(getFirebaseDb(), "users", uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : null;

        const role: UserRole =
          userData?.role === "Admin" || userData?.role === "Student Leader" || userData?.role === "Organization Member"
            ? userData.role
            : profile?.role ?? "Student Leader";

        const fullName = typeof userData?.fullName === "string" && userData.fullName.trim()
          ? userData.fullName
          : profile?.fullName ?? "User";

        const position = typeof userData?.position === "string" && userData.position.trim()
          ? userData.position
          : profile?.position ?? (role === "Admin" ? "System Administrator" : role);

        let organizationName = typeof userData?.organizationName === "string" ? userData.organizationName : "";

        const orgId = userData?.organizationId ?? profile?.organizationId;
        if (orgId) {
          try {
            const orgSnap = await getDoc(doc(getFirebaseDb(), "organizations", orgId));
            if (orgSnap.exists()) {
              const orgData = orgSnap.data();
              if (typeof orgData?.name === "string" && orgData.name.trim()) {
                organizationName = orgData.name.trim();
              }
            }
          } catch (orgErr) {
            console.warn("[useDashboardUser] Error fetching organization name:", orgErr);
          }
        }

        if (!cancelled) {
          setDashboardUser({
            name: fullName,
            role,
            roleLabel: position,
            organizationName,
            academicYear: getAcademicYear(),
            greetingDate: formatGreetingDate()
          });
        }
      } catch (err) {
        console.error("[useDashboardUser] Error loading user details:", err);
        if (!cancelled) {
          setDashboardUser(buildFallbackUser(profile));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (!authLoading) {
      void loadUser();
    }

    return () => {
      cancelled = true;
    };
  }, [authLoading, firebaseUser?.uid, profile]);

  return { dashboardUser, loading: authLoading || loading };
}
