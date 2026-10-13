"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import {
  X,
  Check,
  ChevronDown,
  Calendar,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Unlink,
  Loader2
} from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { getFirebaseDb } from "@/firebase/config";
import { useLogout } from "@/hooks/useLogout";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { getDashboardNavItems } from "@/utils/routes";
import { subscribeNotificationsFirestore } from "@/services/notifications.service";
import { getOrganization, updateOrganizationDetails, updateUserProfile } from "@/services/auth.service";
import {
  getCalendarConnectUrl,
  getCalendarStatus,
  disconnectCalendar,
  syncAllEventsToGoogle,
  type CalendarStatusResponse
} from "@/services/calendar.service";

function greetingDate() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date());
}

const LEADER_POSITIONS = [
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Finance Officer",
  "Auditor",
  "Public Relations Officer",
  "Committee Chair",
  "Project Coordinator",
  "Team Lead"
];

function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select position"
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100"
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown className={`size-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg transition-all">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm font-semibold transition ${
                value === option
                  ? "bg-blue-50/80 text-[#2563eb]"
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span>{option}</span>
              {value === option && <Check className="size-4 text-[#2563eb]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type EditableField = "organizationName" | "fullName" | "email" | "position";

export default function DashboardSettingsPage() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const authLoading = useAuthStore((state) => state.loading);
  const setProfile = useAuthStore((state) => state.setProfile);
  const logout = useLogout();

  // Local state for live user fields
  const [organizationName, setOrganizationName] = useState(() => profile?.organizationName || "");
  const [fullName, setFullName] = useState(() => profile?.fullName || "");
  const [email, setEmail] = useState(() => profile?.email || firebaseUser?.email || "");
  const [position, setPosition] = useState(() => profile?.position || "");
  const [orgId, setOrgId] = useState<string | null>(() => profile?.organizationId || null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [academicYear] = useState("AY 2025–2026");

  // Preferences toggles
  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    aiDelegationSuggestions: true,
    weeklySummaryReport: true
  });

  // Google Calendar Integration State
  const showToast = useToastStore((state) => state.showToast);
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatusResponse>({ connected: false });
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [syncingEvents, setSyncingEvents] = useState(false);

  // Edit Modal State
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  // Check URL query parameters for Google Calendar OAuth callback status
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const calParam = params.get("calendar");
    if (calParam === "connected") {
      showToast({
        title: "Google Calendar Connected",
        description: "Your Google Calendar is connected! Campus events and deadlines will reflect automatically.",
        tone: "success"
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (calParam === "error") {
      const msg = params.get("message") || "Authorization failed.";
      showToast({
        title: "Connection Failed",
        description: msg,
        tone: "error"
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (calParam === "access_denied") {
      showToast({
        title: "Authorization Cancelled",
        description: "Google Calendar permissions were not granted.",
        tone: "info"
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [showToast]);

  // Initial fetch of Google Calendar connection status
  useEffect(() => {
    const user = firebaseUser || useAuthStore.getState().firebaseUser;
    if (!user) return;
    getCalendarStatus(user).then((res) => {
      setCalendarStatus(res);
    });
  }, [firebaseUser]);

  useEffect(() => {
    if (!authLoading && !profile) {
      router.replace("/sign-in");
    }
  }, [authLoading, profile, router]);

  // Auth can finish after this page mounts. Keep membership in sync with
  // the authenticated profile even when direct Firestore reads are denied.
  useEffect(() => {
    setOrgId(profile?.organizationId?.trim() || null);
    setOrganizationName(profile?.organizationId ? profile.organizationName?.trim() || "" : "");
  }, [profile?.uid, profile?.organizationId, profile?.organizationName]);

  // Hydrate preferences from localStorage on mount
  useEffect(() => {
    const uid = profile?.uid ?? firebaseUser?.uid;
    if (!uid) return;
    try {
      const saved = localStorage.getItem(`musubi_user_prefs_${uid}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPrefs((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, [firebaseUser, profile]);

  // Real-time listener for user document in Firestore
  useEffect(() => {
    const targetUid = profile?.uid ?? firebaseUser?.uid;
    if (!targetUid) return;

    const unsubscribe = onSnapshot(
      doc(getFirebaseDb(), "users", targetUid),
      (snapshot) => {
        const data = snapshot.data();
        if (!data) return;

        if (typeof data.fullName === "string" && data.fullName.trim()) {
          setFullName(data.fullName);
        }
        if (typeof data.email === "string" && data.email.trim()) {
          setEmail(data.email);
        }
        const membershipId = typeof data.organizationId === "string" ? data.organizationId.trim() : "";
        setOrgId(membershipId || null);
        if (!membershipId) {
          setOrganizationName("");
        } else if (typeof data.organizationName === "string" && data.organizationName.trim()) {
          setOrganizationName(data.organizationName.trim());
        }
        if (typeof data.position === "string" && data.position.trim()) {
          setPosition(data.position);
        }

        if (data.preferences && typeof data.preferences === "object") {
          setPrefs((prev) => ({
            ...prev,
            ...data.preferences
          }));
        }

        if (data.googleCalendar && typeof data.googleCalendar === "object") {
          setCalendarStatus({
            connected: Boolean(data.googleCalendar.connected && data.googleCalendar.refreshToken),
            email: data.googleCalendar.email || undefined,
            connectedAt: data.googleCalendar.connectedAt || undefined
          });
        }
      },
      () => {
        // Silent fallback when client-side rules restrict direct listener
      }
    );

    return () => unsubscribe();
  }, [firebaseUser, profile]);

  // Real-time listener for organization document in Firestore
  useEffect(() => {
    const targetOrgId = orgId;
    if (!targetOrgId) {
      setOrganizationName("");
      return;
    }

    let cancelled = false;
    async function loadOrganizationFallback() {
      if (!firebaseUser) return;
      try {
        const organization = await getOrganization(firebaseUser, targetOrgId!);
        if (!cancelled) setOrganizationName(organization.name);
      } catch {
        // Keep the authenticated profile's name when the API is unavailable.
      }
    }

    void loadOrganizationFallback();

    return () => {
      cancelled = true;
    };
  }, [orgId, firebaseUser]);

  // Subscribe to real-time notifications for badge
  useEffect(() => {
    const authUser = firebaseUser ?? useAuthStore.getState().firebaseUser;
    if (!authUser) return;
    const unsubscribe = subscribeNotificationsFirestore(
      authUser,
      orgId || profile?.organizationId || null,
      (notifs) => {
        setUnreadCount(notifs.filter((n) => n.unread).length);
      }
    );
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [firebaseUser, orgId, profile]);

  if (authLoading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef1f5] text-sm text-slate-500">
        Loading settings...
      </div>
    );
  }

  const canManageOrganization = Boolean(orgId) && (profile.role === "Student Leader" || profile.role === "Admin");
  const effectiveOrgName = orgId ? organizationName.trim() : "";
  const effectiveFullName = fullName || profile.fullName || firebaseUser?.displayName || "User";
  const effectiveEmail = email || profile.email || firebaseUser?.email || "";
  const effectivePosition = position || profile.position || (profile.role === "Student Leader" ? "Student Leader" : profile.role);

  const user = {
    id: profile.uid,
    name: effectiveFullName,
    role: profile.role,
    roleLabel: effectivePosition,
    organizationName: effectiveOrgName,
    academicYear,
    greetingDate: greetingDate()
  };

  const handleOpenEdit = (field: EditableField) => {
    if ((field === "organizationName" || field === "position") && !canManageOrganization) return;
    setEditingField(field);
    if (field === "organizationName") setEditValue(effectiveOrgName);
    if (field === "fullName") setEditValue(effectiveFullName);
    if (field === "email") setEditValue(effectiveEmail);
    if (field === "position") setEditValue(effectivePosition);
  };

  const handleSaveEdit = async () => {
    if (!editingField || !firebaseUser?.uid) return;
    if ((editingField === "organizationName" || editingField === "position") && !canManageOrganization) return;
    setSaving(true);

    try {
      const uid = firebaseUser.uid;
      const userRef = doc(getFirebaseDb(), "users", uid);

      if (editingField === "organizationName") {
        if (!orgId) return;
        await updateOrganizationDetails(firebaseUser, orgId, { name: editValue.trim() });
        setOrganizationName(editValue.trim());
        if (profile) setProfile({ ...profile, organizationName: editValue });
      } else if (editingField === "fullName") {
        setFullName(editValue);
        if (firebaseUser) {
          try {
            await updateUserProfile(firebaseUser, { fullName: editValue });
          } catch (err) {
            console.warn("[Settings] API profile update fallback:", err);
            try { await updateProfile(firebaseUser, { displayName: editValue }); } catch { }
            try { await updateDoc(userRef, { fullName: editValue }); } catch { }
          }
        }
        if (profile) setProfile({ ...profile, fullName: editValue });
      } else if (editingField === "email") {
        setEmail(editValue);
        try {
          await updateDoc(userRef, { email: editValue });
        } catch { }
        if (profile) setProfile({ ...profile, email: editValue });
      } else if (editingField === "position") {
        setPosition(editValue);
        if (firebaseUser) {
          try {
            await updateUserProfile(firebaseUser, { position: editValue });
          } catch {
            try { await updateDoc(userRef, { position: editValue }); } catch { }
          }
        }
        if (profile) setProfile({ ...profile, position: editValue });
      }

      setEditingField(null);
    } catch (err) {
      console.error("[Settings] Save edit error:", err);
    } finally {
      setSaving(false);
    }
  };

  const togglePref = async (key: keyof typeof prefs) => {
    if (key !== "emailNotifications" && !canManageOrganization) return;
    const nextVal = !prefs[key];
    const newPrefs = { ...prefs, [key]: nextVal };
    setPrefs(newPrefs);

    const uid = profile?.uid ?? firebaseUser?.uid;
    if (uid) {
      try {
        localStorage.setItem(`musubi_user_prefs_${uid}`, JSON.stringify(newPrefs));
      } catch {}

      try {
        await updateDoc(doc(getFirebaseDb(), "users", uid), {
          preferences: newPrefs
        });
      } catch (err) {
        console.warn("[Settings] Save preferences error:", err);
      }
    }
  };

  const handleConnectCalendar = async () => {
    const user = firebaseUser || useAuthStore.getState().firebaseUser;
    if (!user) {
      showToast({
        title: "Sign in required",
        description: "Please sign in to connect your Google Calendar.",
        tone: "error"
      });
      return;
    }
    setCalendarLoading(true);
    try {
      const url = await getCalendarConnectUrl(user, window.location.origin);
      window.location.href = url;
    } catch (err: any) {
      showToast({
        title: "Connection Failed",
        description: err.message || "Failed to initiate Google Calendar link.",
        tone: "error"
      });
      setCalendarLoading(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    const user = firebaseUser || useAuthStore.getState().firebaseUser;
    if (!user) return;
    setCalendarLoading(true);
    try {
      await disconnectCalendar(user);
      setCalendarStatus({ connected: false });
      showToast({
        title: "Calendar Disconnected",
        description: "Your Google Calendar integration has been unlinked.",
        tone: "success"
      });
    } catch (err: any) {
      showToast({
        title: "Disconnection Failed",
        description: err.message || "Could not disconnect Google Calendar.",
        tone: "error"
      });
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleSyncAllEvents = async () => {
    const user = firebaseUser || useAuthStore.getState().firebaseUser;
    if (!user) return;
    setSyncingEvents(true);
    try {
      const res = await syncAllEventsToGoogle(user);
      showToast({
        title: "Sync Completed",
        description: `Successfully synchronized ${res.syncedCount} campus event(s) to your Google Calendar.`,
        tone: "success"
      });
    } catch (err: any) {
      showToast({
        title: "Sync Failed",
        description: err.message || "Failed to sync events to Google Calendar.",
        tone: "error"
      });
    } finally {
      setSyncingEvents(false);
    }
  };

  const getFieldLabel = (field: EditableField) => {
    switch (field) {
      case "organizationName":
        return "ORGANIZATION NAME";
      case "fullName":
        return "NAME";
      case "email":
        return "EMAIL";
      case "position":
        return "ROLE";
    }
  };

  return (
    <DashboardLayout
      activeNavId="settings"
      activities={[]}
      goals={[]}
      kpis={[]}
      navItems={getDashboardNavItems(profile.role)}
      notificationCount={unreadCount}
      onLogout={logout}
      user={user}
    >
      <section className="mx-auto w-full max-w-[1200px] space-y-6 text-[#12213a]">
        <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-[#12213a]">
          Settings
        </h1>

        {/* Card 1: User & Organization Details */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)] sm:p-8">
          {/* ORGANIZATION NAME */}
          <div className="flex items-center justify-between py-3">
            <div>
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                ORGANIZATION NAME
              </span>
              <span className="mt-1 block text-[15px] font-bold text-slate-900">
                {effectiveOrgName ? `${effectiveOrgName} – ${academicYear}` : orgId ? "Loading organization..." : "Not in an organization"}
              </span>
            </div>
            {canManageOrganization && <button
              type="button"
              onClick={() => handleOpenEdit("organizationName")}
              className="text-[13px] font-semibold text-[#2563eb] hover:text-blue-700 hover:underline"
            >
              Edit
            </button>}
          </div>

          <div className="my-1 border-b border-slate-100" />

          {/* LEADER NAME */}
          <div className="flex items-center justify-between py-3">
            <div>
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                NAME
              </span>
              <span className="mt-1 block text-[15px] font-bold text-slate-900">
                {effectiveFullName}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleOpenEdit("fullName")}
              className="text-[13px] font-semibold text-[#2563eb] hover:text-blue-700 hover:underline"
            >
              Edit
            </button>
          </div>

          <div className="my-1 border-b border-slate-100" />

          {/* EMAIL */}
          <div className="flex items-center justify-between py-3">
            <div>
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                EMAIL
              </span>
              <span className="mt-1 block text-[15px] font-bold text-slate-900">
                {effectiveEmail}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleOpenEdit("email")}
              className="text-[13px] font-semibold text-[#2563eb] hover:text-blue-700 hover:underline"
            >
              Edit
            </button>
          </div>

          <div className="my-1 border-b border-slate-100" />

          {/* ROLE */}
          <div className="flex items-center justify-between py-3">
            <div>
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                ROLE
              </span>
              <span className="mt-1 block text-[15px] font-bold text-slate-900">
                {effectivePosition}
              </span>
            </div>
            {canManageOrganization && <button
              type="button"
              onClick={() => handleOpenEdit("position")}
              className="text-[13px] font-semibold text-[#2563eb] hover:text-blue-700 hover:underline"
            >
              Edit
            </button>}
          </div>
        </div>

        {/* Card 2: Preferences */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)] sm:p-8 space-y-6">
          <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            PREFERENCES
          </h2>

          <div className="space-y-6">
            {/* Email Notifications */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[15px] font-bold text-slate-900">Email Notifications</p>
                <p className="mt-0.5 text-[13px] font-medium text-slate-400">
                  Receive deadline and nudge alerts via email
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.emailNotifications}
                onClick={() => togglePref("emailNotifications")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  prefs.emailNotifications ? "bg-[#2563eb]" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    prefs.emailNotifications ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* AI Delegation Suggestions */}
            {canManageOrganization && <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[15px] font-bold text-slate-900">AI Delegation Suggestions</p>
                <p className="mt-0.5 text-[13px] font-medium text-slate-400">
                  Let AI auto-suggest task assignments based on member scores
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.aiDelegationSuggestions}
                onClick={() => togglePref("aiDelegationSuggestions")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  prefs.aiDelegationSuggestions ? "bg-[#2563eb]" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    prefs.aiDelegationSuggestions ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>}

            {/* Weekly Summary Report */}
            {canManageOrganization && <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[15px] font-bold text-slate-900">Weekly Summary Report</p>
                <p className="mt-0.5 text-[13px] font-medium text-slate-400">
                  Receive a weekly digest of organizational progress
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.weeklySummaryReport}
                onClick={() => togglePref("weeklySummaryReport")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  prefs.weeklySummaryReport ? "bg-[#2563eb]" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    prefs.weeklySummaryReport ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>}
          </div>
        </div>

        {/* Card 3: Google Calendar Integration */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)] sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  INTEGRATIONS
                </span>
                {calendarStatus.connected && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Connected
                  </span>
                )}
              </div>
              <h2 className="text-[17px] font-bold text-slate-900 flex items-center gap-2 pt-0.5">
                <Calendar className="size-5 text-[#2563eb]" />
                Google Calendar Sync
              </h2>
              <p className="text-[13px] font-medium text-slate-500 max-w-xl leading-relaxed">
                Connect your personal Google Calendar to automatically synchronize campus event schedules and deadlines directly to your calendar app on web and mobile.
              </p>
            </div>

            {/* Action buttons */}
            <div className="shrink-0 flex items-center gap-2 pt-1 sm:pt-0">
              {calendarStatus.connected ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={syncingEvents}
                    onClick={handleSyncAllEvents}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`size-3.5 ${syncingEvents ? "animate-spin text-[#2563eb]" : "text-slate-400"}`} />
                    {syncingEvents ? "Syncing..." : "Sync All Events"}
                  </button>

                  <a
                    href="https://calendar.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                  >
                    <ExternalLink className="size-3.5 text-slate-400" />
                    Open Calendar
                  </a>

                  <button
                    type="button"
                    disabled={calendarLoading}
                    onClick={handleDisconnectCalendar}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 px-3.5 py-2 text-[13px] font-semibold text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition disabled:opacity-50 cursor-pointer"
                  >
                    <Unlink className="size-3.5" />
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={calendarLoading}
                  onClick={handleConnectCalendar}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-[13px] font-bold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
                >
                  {calendarLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Calendar className="size-4" />
                  )}
                  {calendarLoading ? "Connecting..." : "Connect Google Calendar"}
                </button>
              )}
            </div>
          </div>

          {/* Details Bar when connected */}
          {calendarStatus.connected && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>
                  Synchronizing with Google account:{" "}
                  <strong className="text-slate-900 font-semibold">{calendarStatus.email || effectiveEmail}</strong>
                </span>
              </div>
              {calendarStatus.connectedAt && (
                <span className="text-slate-400">
                  Linked on {new Date(calendarStatus.connectedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Edit Modal */}
      {editingField ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Edit {getFieldLabel(editingField)}
              </h3>
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  {getFieldLabel(editingField)}
                </label>
                {editingField === "position" ? (
                  <div className="mt-1.5">
                    <CustomSelect
                      value={editValue}
                      onChange={(val) => setEditValue(val)}
                      options={LEADER_POSITIONS}
                      placeholder="Select position"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100"
                    placeholder={`Enter new ${getFieldLabel(editingField).toLowerCase()}`}
                    autoFocus
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingField(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={saving || !editValue.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-[#2563eb] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  <Check className="size-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
