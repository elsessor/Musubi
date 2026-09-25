"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, LogOut, Menu, Settings, User } from "lucide-react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";

import { getFirebaseDb } from "@/firebase/config";
import { getOrganization } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";
import type { UserRole } from "@/types/auth";

type TopHeaderProps = {
  name: string;
  organizationName: string;
  academicYear: string;
  greetingDate: string;
  notificationCount: number;
  role: UserRole;
  userId?: string | null;
  onLogout: () => void;
  onMenuToggle: () => void;
};

function Avatar({ name, role, availability }: { name: string; role: UserRole; availability?: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  const statusDotColor =
    availability === "Busy"
      ? "bg-amber-400"
      : availability === "On Leave"
      ? "bg-slate-400"
      : "bg-emerald-500";

  return (
    <div
      className={`relative flex size-12 items-center justify-center rounded-full text-base font-extrabold text-white ${
        role === "Admin" ? "bg-[#ef2360]" : "bg-[#213f68]"
      }`}
    >
      {initials}
      {role !== "Admin" ? (
        <span
          className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-[#f1f4f8] ${statusDotColor} transition-colors duration-200`}
        />
      ) : null}
    </div>
  );
}

export function TopHeader({
  name,
  organizationName,
  academicYear,
  greetingDate,
  notificationCount,
  role,
  userId,
  onLogout,
  onMenuToggle
}: TopHeaderProps) {
  const router = useRouter();
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const profile = useAuthStore((state) => state.profile);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [liveUser, setLiveUser] = useState({
    name,
    role,
    position: profile?.position || "",
    organizationId: profile?.organizationId || (null as string | null),
    email: profile?.email || firebaseUser?.email || "",
    availability: profile?.availability || profile?.status || "Available",
    status: profile?.status || profile?.availability || "Available"
  });
  const [liveOrganizationName, setLiveOrganizationName] = useState(organizationName);

  const fallbackNameRef = useRef(name);
  const fallbackRoleRef = useRef(role);
  useEffect(() => {
    fallbackNameRef.current = name;
  }, [name]);
  useEffect(() => {
    fallbackRoleRef.current = role;
  }, [role]);

  // Sync state when incoming props update
  useEffect(() => {
    if (name && name !== "User") {
      setLiveUser((prev) => ({ ...prev, name }));
    }
  }, [name]);

  useEffect(() => {
    if (role) {
      setLiveUser((prev) => ({ ...prev, role }));
    }
  }, [role]);

  useEffect(() => {
    if (organizationName && organizationName.trim()) {
      setLiveOrganizationName(organizationName);
    }
  }, [organizationName]);

  // Real-time listener for user document in Firestore
  useEffect(() => {
    const targetUid = userId || firebaseUser?.uid;
    if (!targetUid) return;

    const unsubscribe = onSnapshot(
      doc(getFirebaseDb(), "users", targetUid),
      (snapshot) => {
        const data = snapshot.data();
        if (!data) return;
        const liveRole =
          data.role === "Admin" || data.role === "Student Leader" || data.role === "Organization Member"
            ? data.role
            : fallbackRoleRef.current;
        const liveName =
          typeof data.fullName === "string" && data.fullName.trim()
            ? data.fullName
            : fallbackNameRef.current;
        const liveOrgId = typeof data.organizationId === "string" ? data.organizationId : null;
        const liveOrgName =
          typeof data.organizationName === "string" && data.organizationName.trim()
            ? data.organizationName
            : null;

        const liveAvailability =
          typeof data.availability === "string" && data.availability.trim()
            ? data.availability
            : typeof data.status === "string" && data.status.trim()
            ? data.status
            : "Available";

        const liveEmail =
          typeof data.email === "string" && data.email.trim()
            ? data.email
            : firebaseUser?.email || "";

        setLiveUser({
          name: liveName,
          role: liveRole,
          position: typeof data.position === "string" ? data.position : "",
          organizationId: liveOrgId,
          email: liveEmail,
          availability: liveAvailability,
          status: liveAvailability
        });

        if (liveOrgName) {
          setLiveOrganizationName(liveOrgName);
        }
      },
      (error) => {
        console.warn("[TopHeader] Error reading user snapshot:", error);
      }
    );

    return () => unsubscribe();
  }, [userId, firebaseUser?.uid, firebaseUser?.email]);

  useEffect(() => {
    if (profile?.organizationId) {
      setLiveUser((prev) => ({ ...prev, organizationId: profile.organizationId }));
    }
    if (profile?.organizationName && profile.organizationName.trim()) {
      setLiveOrganizationName(profile.organizationName);
    }
    if (profile?.email) {
      setLiveUser((prev) => ({ ...prev, email: profile.email }));
    }
    if (profile?.availability || profile?.status) {
      const avail = profile.availability || profile.status || "Available";
      setLiveUser((prev) => ({ ...prev, availability: avail, status: avail }));
    }
  }, [profile]);

  // Fallback: If organizationId is present but organizationName is not yet set, fetch via API
  useEffect(() => {
    if (!liveUser.organizationId || liveOrganizationName) return;

    let cancelled = false;
    const authUser = firebaseUser ?? useAuthStore.getState().firebaseUser;
    if (authUser && liveUser.organizationId) {
      void getOrganization(authUser, liveUser.organizationId)
        .then((org) => {
          if (!cancelled && org?.name) {
            setLiveOrganizationName(org.name);
          }
        })
        .catch(() => { });
    }

    return () => {
      cancelled = true;
    };
  }, [firebaseUser, liveOrganizationName, liveUser.organizationId]);

  // Close profile dropdown on outside click or Escape
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  const handleAvailabilityChange = async (newStatus: "Available" | "Busy" | "On Leave") => {
    setLiveUser((prev) => ({ ...prev, availability: newStatus, status: newStatus }));

    const targetUid = userId || firebaseUser?.uid;
    if (targetUid) {
      try {
        const userRef = doc(getFirebaseDb(), "users", targetUid);
        await updateDoc(userRef, {
          availability: newStatus,
          status: newStatus
        });
      } catch (err) {
        console.warn("[TopHeader] Error updating Firestore user availability:", err);
      }
    }

    const currentProfile = useAuthStore.getState().profile;
    if (currentProfile) {
      useAuthStore.getState().setProfile({
        ...currentProfile,
        availability: newStatus,
        status: newStatus
      });
    }
  };

  const effectiveOrgId = liveUser.organizationId || profile?.organizationId || null;
  const effectiveOrgName =
    liveOrganizationName?.trim() ||
    organizationName?.trim() ||
    profile?.organizationName?.trim() ||
    "";

  const hasJoinedOrg = Boolean(
    liveUser.role !== "Admin" &&
    (effectiveOrgId || effectiveOrgName) &&
    effectiveOrgName
  );

  const displayOrg = hasJoinedOrg
    ? effectiveOrgName
    : liveUser.role === "Admin"
      ? "University Campus"
      : "";

  const subtitle =
    liveUser.role === "Admin"
      ? `University Campus · ${greetingDate}`
      : [
        displayOrg ? `${displayOrg}${academicYear ? ` · ${academicYear}` : ""}` : academicYear,
        greetingDate
      ]
        .filter(Boolean)
        .join(" · ");

  const currentAvailability =
    liveUser.availability || profile?.availability || profile?.status || "Available";

  const displayEmail =
    liveUser.email ||
    profile?.email ||
    firebaseUser?.email ||
    `${(liveUser.name || "user").toLowerCase().replace(/\s+/g, "")}@university.edu.ph`;

  return (
    <header className="sticky top-0 z-20 flex min-h-[76px] items-center justify-between gap-3 border-b border-slate-200/80 bg-[#f1f4f8]/95 px-4 py-4 backdrop-blur sm:px-6 lg:min-h-[108px] lg:px-9 lg:py-5">
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-label="Open navigation"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-200 md:hidden"
          onClick={onMenuToggle}
          type="button"
        >
          <Menu className="size-6" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold tracking-[-0.02em] text-slate-900 sm:text-[25px]">
            {liveUser.role === "Admin"
              ? "Admin Dashboard"
              : `Welcome, ${liveUser.name}${liveUser.role === "Student Leader" ? " 👋" : ""}`}
          </h1>
          <p className="mt-1 truncate text-sm font-semibold text-slate-500 sm:text-[17px]">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 sm:gap-5">
        {liveUser.role !== "Admin" ? (
          <button
            aria-label={`Notifications ${notificationCount}`}
            className="relative flex size-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:bg-slate-50 sm:size-14 sm:rounded-[18px]"
            type="button"
          >
            <Bell className="size-5 sm:size-6" strokeWidth={1.75} />
            <span className="absolute -right-1 -top-1 inline-flex min-w-6 items-center justify-center rounded-full bg-[#ff2c62] px-1.5 py-0.5 text-xs font-extrabold leading-none text-white">
              {notificationCount}
            </span>
          </button>
        ) : null}
        <div ref={menuRef} className="relative">
          <button
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Open profile menu"
            className="relative flex size-12 items-center justify-center rounded-full outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-slate-400"
            onClick={() => setMenuOpen((current) => !current)}
            type="button"
          >
            <Avatar availability={currentAvailability} name={liveUser.name} role={liveUser.role} />
          </button>

          {menuOpen ? (
            <div
              className="absolute right-0 z-30 mt-3 w-72 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xl animate-in fade-in zoom-in-95 duration-150"
              role="menu"
            >
              {/* User Header Info */}
              <div className="px-1 pb-3">
                <p className="text-sm font-bold text-slate-900 leading-snug">{liveUser.name}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-slate-400">{displayEmail}</p>
              </div>

              {/* Section Header */}
              <div className="px-1 pb-2 pt-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  MY AVAILABILITY
                </p>
              </div>

              {/* Availability Options */}
              <div className="space-y-1.5">
                {/* Available Option */}
                <button
                  className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition ${
                    currentAvailability === "Available"
                      ? "border-emerald-300/90 bg-emerald-50/70"
                      : "border-transparent hover:bg-slate-50"
                  }`}
                  onClick={() => handleAvailabilityChange("Available")}
                  type="button"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1 size-2.5 shrink-0 rounded-full bg-emerald-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">Available</p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                        Ready for new tasks
                      </p>
                    </div>
                  </div>
                  {currentAvailability === "Available" ? (
                    <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Check className="size-3.5 stroke-[3]" />
                    </div>
                  ) : null}
                </button>

                {/* Busy Option */}
                <button
                  className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition ${
                    currentAvailability === "Busy"
                      ? "border-amber-300/90 bg-amber-50/70"
                      : "border-transparent hover:bg-slate-50"
                  }`}
                  onClick={() => handleAvailabilityChange("Busy")}
                  type="button"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1 size-2.5 shrink-0 rounded-full bg-amber-400" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">Busy</p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                        Working, limited capacity
                      </p>
                    </div>
                  </div>
                  {currentAvailability === "Busy" ? (
                    <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                      <Check className="size-3.5 stroke-[3]" />
                    </div>
                  ) : null}
                </button>

                {/* On Leave Option */}
                <button
                  className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition ${
                    currentAvailability === "On Leave"
                      ? "border-slate-300/90 bg-slate-100/90"
                      : "border-transparent hover:bg-slate-50"
                  }`}
                  onClick={() => handleAvailabilityChange("On Leave")}
                  type="button"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1 size-2.5 shrink-0 rounded-full bg-slate-400" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">On Leave</p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                        Unavailable right now
                      </p>
                    </div>
                  </div>
                  {currentAvailability === "On Leave" ? (
                    <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                      <Check className="size-3.5 stroke-[3]" />
                    </div>
                  ) : null}
                </button>
              </div>

              {/* Divider */}
              <div className="my-2.5 h-px bg-slate-100" />

              {/* Navigation Menu */}
              <div className="space-y-0.5">
                <button
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/dashboard/profile");
                  }}
                  type="button"
                >
                  <User className="size-4 text-slate-500" />
                  My Profile
                </button>

                <button
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/dashboard/settings");
                  }}
                  type="button"
                >
                  <Settings className="size-4 text-slate-500" />
                  Settings
                </button>

                <button
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  type="button"
                >
                  <LogOut className="size-4 text-rose-600" />
                  Log Out
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}