"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";

import { getFirebaseDb } from "@/firebase/config";
import { getOrganization } from "@/services/auth.service";
import { subscribeNotificationsFirestore } from "@/services/notifications.service";
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

function Avatar({ name, role }: { name: string; role: UserRole }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  return (
    <div
      className={`relative flex size-12 items-center justify-center rounded-full text-base font-extrabold text-white ${
        role === "Admin" ? "bg-[#ef2360]" : "bg-[#213f68]"
      }`}
    >
      {initials}
      {role !== "Admin" ? (
        <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#f1f4f8] bg-emerald-500" />
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [liveOrganizationName, setLiveOrganizationName] = useState(organizationName);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const fallbackNameRef = useRef(name);
  const fallbackRoleRef = useRef(role);
  const [liveUser, setLiveUser] = useState<{
    name: string;
    role: UserRole;
    position: string;
    organizationId: string | null;
  }>({
    name,
    role,
    position: "",
    organizationId: null
  });

  useEffect(() => {
    fallbackNameRef.current = name;
    setLiveUser((prev) => ({ ...prev, name }));
  }, [name]);

  useEffect(() => {
    fallbackRoleRef.current = role;
    setLiveUser((prev) => ({ ...prev, role }));
  }, [role]);

  useEffect(() => {
    if (organizationName && organizationName.trim()) {
      setLiveOrganizationName(organizationName);
    }
  }, [organizationName]);

  // Real-time listener for user document in Firestore
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(
      doc(getFirebaseDb(), "users", userId),
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

        setLiveUser({
          name: liveName,
          role: liveRole,
          position: typeof data.position === "string" ? data.position : "",
          organizationId: liveOrgId
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
  }, [userId]);

  // Subscribe to live notifications for unread count badge
  useEffect(() => {
    const authUser = firebaseUser ?? useAuthStore.getState().firebaseUser;
    const unsubscribe = subscribeNotificationsFirestore(authUser, liveUser.organizationId, (notifs) => {
      const count = notifs.filter((n) => n.unread).length;
      setUnreadCount(count);
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [firebaseUser, liveUser.organizationId]);

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
        .catch(() => {});
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

  const displayOrg =
    liveOrganizationName || organizationName || (liveUser.role === "Admin" ? "University Campus" : "University Student Council");
  const subtitle = liveUser.role === "Admin" ? "Administrative Console" : `${displayOrg} · ${academicYear} · ${greetingDate}`;
  const effectiveNotificationCount = unreadCount !== null ? unreadCount : (notificationCount || 0);

  return (
    <header className="sticky top-0 z-20 flex h-24 shrink-0 items-center justify-between border-b border-slate-200/70 bg-slate-100/80 px-4 backdrop-blur sm:px-8">
      <div className="flex items-center gap-3">
        <button
          aria-label="Open menu"
          className="flex size-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 md:hidden"
          onClick={onMenuToggle}
          type="button"
        >
          <Menu className="size-6" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold tracking-[-0.02em] text-[#12213a] sm:text-[25px]">
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
            aria-label={`Notifications ${effectiveNotificationCount}`}
            onClick={() => router.push("/dashboard/notifications")}
            className="relative flex size-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:bg-slate-50 sm:size-14 sm:rounded-[18px]"
            type="button"
          >
            <Bell className="size-5 sm:size-6" strokeWidth={1.75} />
            {effectiveNotificationCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-w-6 items-center justify-center rounded-full bg-[#ff2c62] px-1.5 py-0.5 text-xs font-extrabold leading-none text-white">
                {effectiveNotificationCount}
              </span>
            ) : null}
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
            <Avatar name={liveUser.name} role={liveUser.role} />
          </button>
          {menuOpen ? (
            <div
              className="absolute right-0 z-30 mt-3 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
              role="menu"
            >
              <div className="px-3 py-2">
                <p className="text-sm font-semibold text-slate-900">{liveUser.name}</p>
                <p className="text-xs text-slate-500">{liveUser.position || liveUser.role}</p>
              </div>
              <div className="my-1 h-px bg-slate-200" />
              <button
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/dashboard/profile");
                }}
                type="button"
              >
                Profile
              </button>
              <button
                className="mt-1 flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/dashboard/settings");
                }}
                type="button"
              >
                Settings
              </button>
              <div className="my-2 h-px bg-slate-200" />
              <button
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
                type="button"
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}