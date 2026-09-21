"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { X, Check, ChevronDown } from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { getFirebaseDb } from "@/firebase/config";
import { useLogout } from "@/hooks/useLogout";
import { useAuthStore } from "@/store/authStore";
import { getDashboardNavItems } from "@/utils/routes";
import { subscribeNotificationsFirestore } from "@/services/notifications.service";
import { updateOrganizationDetails } from "@/services/auth.service";

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

  // Edit Modal State
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !profile) {
      router.replace("/sign-in");
    }
  }, [authLoading, profile, router]);

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
        if (typeof data.organizationName === "string" && data.organizationName.trim()) {
          setOrganizationName(data.organizationName);
        }
        if (typeof data.position === "string" && data.position.trim()) {
          setPosition(data.position);
        }
        if (typeof data.organizationId === "string" && data.organizationId.trim()) {
          setOrgId(data.organizationId);
        }

        if (data.preferences && typeof data.preferences === "object") {
          setPrefs((prev) => ({
            ...prev,
            ...data.preferences
          }));
        }
      },
      (error) => {
        console.warn("[Settings] Error listening to user snapshot:", error);
      }
    );

    return () => unsubscribe();
  }, [firebaseUser, profile]);

  // Real-time listener for organization document in Firestore
  useEffect(() => {
    const targetOrgId = orgId || profile?.organizationId;
    if (!targetOrgId) return;

    const unsubscribe = onSnapshot(
      doc(getFirebaseDb(), "organizations", targetOrgId),
      (snapshot) => {
        const data = snapshot.data();
        if (data?.name && typeof data.name === "string" && data.name.trim()) {
          setOrganizationName(data.name);
        }
      },
      (error) => {
        console.warn("[Settings] Error listening to organization snapshot:", error);
      }
    );

    return () => unsubscribe();
  }, [orgId, profile]);

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

  const effectiveOrgName = organizationName || profile.organizationName || "Campus Organization";
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
    setEditingField(field);
    if (field === "organizationName") setEditValue(effectiveOrgName);
    if (field === "fullName") setEditValue(effectiveFullName);
    if (field === "email") setEditValue(effectiveEmail);
    if (field === "position") setEditValue(effectivePosition);
  };

  const handleSaveEdit = async () => {
    if (!editingField || !firebaseUser?.uid) return;
    setSaving(true);

    try {
      const uid = firebaseUser.uid;
      const userRef = doc(getFirebaseDb(), "users", uid);

      if (editingField === "organizationName") {
        setOrganizationName(editValue);
        const targetOrgId = orgId || profile.organizationId;
        if (targetOrgId && firebaseUser) {
          try {
            await updateOrganizationDetails(firebaseUser, targetOrgId, { name: editValue });
          } catch (err) {
            console.warn("[Settings] API org update warning:", err);
          }
        }
        try {
          await updateDoc(userRef, { organizationName: editValue });
        } catch (err) {
          console.warn("[Settings] User org update warning:", err);
        }
        if (profile) setProfile({ ...profile, organizationName: editValue });
      } else if (editingField === "fullName") {
        setFullName(editValue);
        if (firebaseUser) {
          try {
            await updateProfile(firebaseUser, { displayName: editValue });
          } catch (err) {
            console.warn("[Settings] Auth updateProfile warning:", err);
          }
        }
        try {
          await updateDoc(userRef, { fullName: editValue });
        } catch (err) {
          console.warn("[Settings] User fullName update warning:", err);
        }
        if (profile) setProfile({ ...profile, fullName: editValue });
      } else if (editingField === "email") {
        setEmail(editValue);
        try {
          await updateDoc(userRef, { email: editValue });
        } catch (err) {
          console.warn("[Settings] User email update warning:", err);
        }
        if (profile) setProfile({ ...profile, email: editValue });
      } else if (editingField === "position") {
        setPosition(editValue);
        try {
          await updateDoc(userRef, { position: editValue });
        } catch (err) {
          console.warn("[Settings] User position update warning:", err);
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

  const getFieldLabel = (field: EditableField) => {
    switch (field) {
      case "organizationName":
        return "ORGANIZATION NAME";
      case "fullName":
        return "LEADER NAME";
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
                {effectiveOrgName} – {academicYear}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleOpenEdit("organizationName")}
              className="text-[13px] font-semibold text-[#2563eb] hover:text-blue-700 hover:underline"
            >
              Edit
            </button>
          </div>

          <div className="my-1 border-b border-slate-100" />

          {/* LEADER NAME */}
          <div className="flex items-center justify-between py-3">
            <div>
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                LEADER NAME
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
            <button
              type="button"
              onClick={() => handleOpenEdit("position")}
              className="text-[13px] font-semibold text-[#2563eb] hover:text-blue-700 hover:underline"
            >
              Edit
            </button>
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
            <div className="flex items-center justify-between gap-4">
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
            </div>

            {/* Weekly Summary Report */}
            <div className="flex items-center justify-between gap-4">
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
            </div>
          </div>
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
