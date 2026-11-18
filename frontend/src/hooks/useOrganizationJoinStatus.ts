"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cancelOrganizationJoinRequest, getMyOrganizationJoinRequest, ORGANIZATION_JOIN_STATUS_CHANGED, type MyOrganizationJoinRequest } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";

type JoinStatus = { uid: string; request: MyOrganizationJoinRequest | null; loading: boolean; error: string };

export function useOrganizationJoinStatus() {
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.firebaseUser);
  const authLoading = useAuthStore((state) => state.loading);
  const uid = !authLoading && profile && user?.uid === profile.uid && profile.role !== "Admin" && !profile.organizationId?.trim() ? user.uid : null;
  const [status, setStatus] = useState<JoinStatus>({ uid: "", request: null, loading: false, error: "" });
  const [revision, setRevision] = useState(0);
  const [cancellingUid, setCancellingUid] = useState("");
  const cancelInFlight = useRef(false);
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
    const changed = () => setRevision((current) => current + 1);
    window.addEventListener("focus", check);
    window.addEventListener(ORGANIZATION_JOIN_STATUS_CHANGED, changed);
    document.addEventListener("visibilitychange", check);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener("focus", check); window.removeEventListener(ORGANIZATION_JOIN_STATUS_CHANGED, changed); document.removeEventListener("visibilitychange", check); };
  }, [uid, user, revision]);

  const onCancel = async () => {
    if (!uid || !user || status.uid !== uid || !status.request || cancelInFlight.current) return;
    const requestId = status.request.id;
    cancelInFlight.current = true;
    setCancellingUid(uid);
    try {
      await cancelOrganizationJoinRequest(user, requestId);
      setStatus((current) => current.uid === uid && current.request?.id === requestId ? { ...current, request: null, error: "" } : current);
      refresh();
    } catch (error) {
      setStatus((current) => current.uid === uid ? { ...current, error: error instanceof Error ? error.message : "Unable to cancel your join request. Please try again." } : current);
    } finally {
      cancelInFlight.current = false;
      setCancellingUid("");
    }
  };

  // Never display a previous account's request while authentication changes.
  return { request: uid && status.uid === uid ? status.request : null, loading: Boolean(uid && (status.uid !== uid || status.loading)), error: uid && status.uid === uid ? status.error : "", cancelling: Boolean(uid && cancellingUid === uid), onCancel, refresh };
}
