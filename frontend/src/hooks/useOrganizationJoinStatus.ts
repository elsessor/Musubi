"use client";

import { useCallback, useEffect, useState } from "react";
import { getMyOrganizationJoinRequest, type MyOrganizationJoinRequest } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";

type JoinStatus = { uid: string; request: MyOrganizationJoinRequest | null; loading: boolean; error: string };

export function useOrganizationJoinStatus() {
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.firebaseUser);
  const authLoading = useAuthStore((state) => state.loading);
  const uid = !authLoading && profile && user?.uid === profile.uid && profile.role !== "Admin" && !profile.organizationId?.trim() ? user.uid : null;
  const [status, setStatus] = useState<JoinStatus>({ uid: "", request: null, loading: false, error: "" });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((current) => current + 1), []);

  useEffect(() => {
    if (!uid || !user) { setStatus({ uid: "", request: null, loading: false, error: "" }); return; }
    let active = true, inFlight = false;
    setStatus((current) => ({ uid, request: current.uid === uid ? current.request : null, loading: true, error: "" }));
    const load = async () => {
      if (inFlight || document.hidden) return;
      inFlight = true;
      try {
        const request = await getMyOrganizationJoinRequest(user);
        if (active) setStatus({ uid, request, loading: false, error: "" });
      } catch {
        if (active) setStatus((current) => ({ uid, request: current.uid === uid ? current.request : null, loading: false, error: "We couldn’t check your join request. Please try again." }));
      } finally { inFlight = false; }
    };
    void load();
    const interval = window.setInterval(() => void load(), 60000);
    const check = () => { void load(); };
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener("focus", check); document.removeEventListener("visibilitychange", check); };
  }, [uid, user, revision]);

  // Never display a previous account's request while authentication changes.
  return { request: uid && status.uid === uid ? status.request : null, loading: Boolean(uid && (status.uid !== uid || status.loading)), error: uid && status.uid === uid ? status.error : "", refresh };
}
