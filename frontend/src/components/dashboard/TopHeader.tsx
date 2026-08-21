"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Menu } from "lucide-react";

import type { UserRole } from "@/types/auth";

type TopHeaderProps = {
  name: string;
  organizationName: string;
  academicYear: string;
  greetingDate: string;
  notificationCount: number;
  role: UserRole;
  onLogout: () => void;
  onMenuToggle: () => void;
};

function Avatar({ name, role }: { name: string; role: UserRole }) {
  const initials = name.split(" ").map((part) => part[0]).filter(Boolean).slice(0, 2).join("");

  return (
    <div className={`relative flex size-12 items-center justify-center rounded-full text-base font-extrabold text-white ${role === "Admin" ? "bg-[#ef2360]" : "bg-[#213f68]"}`}>
      {initials}
      {role !== "Admin" ? <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#f1f4f8] bg-emerald-500" /> : null}
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
  onLogout,
  onMenuToggle
}: TopHeaderProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const orgPart = organizationName || "University Student Council";
  const ayPart = role === "Student Leader" || role === "Organization Member" ? academicYear || "AY 2025–2026" : "";
  const orgAyCombined = [orgPart, ayPart].filter(Boolean).join(" - ");

  const subtitle = role === "Admin"
    ? `University Campus · ${greetingDate}`
    : [orgAyCombined, greetingDate].filter(Boolean).join(" · ");

  return (
    <header className="sticky top-0 z-20 flex min-h-[76px] items-center justify-between gap-3 border-b border-slate-200/80 bg-[#f1f4f8]/95 px-4 py-4 backdrop-blur sm:px-6 lg:min-h-[108px] lg:px-9 lg:py-5">
      <div className="flex min-w-0 items-center gap-3">
        <button aria-label="Open navigation" className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-200 md:hidden" onClick={onMenuToggle} type="button"><Menu className="size-6" /></button>
        <div className="min-w-0">
        <h1 className="truncate text-xl font-extrabold tracking-[-0.02em] text-slate-900 sm:text-[25px]">
          {role === "Admin" ? "Admin Dashboard" : `Welcome, ${name}${role === "Student Leader" ? " 👋" : ""}`}
        </h1>
        <p className="mt-1 truncate text-sm font-semibold text-slate-500 sm:text-[17px]">{subtitle}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-5">
        {role !== "Admin" ? (
          <button aria-label={`Notifications ${notificationCount}`} className="relative flex size-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:bg-slate-50 sm:size-14 sm:rounded-[18px]" type="button">
            <Bell className="size-5 sm:size-6" strokeWidth={1.75} />
            <span className="absolute -right-1 -top-1 inline-flex min-w-6 items-center justify-center rounded-full bg-[#ff2c62] px-1.5 py-0.5 text-xs font-extrabold leading-none text-white">{notificationCount}</span>
          </button>
        ) : null}

        <div ref={menuRef} className="relative">
          <button aria-expanded={menuOpen} aria-haspopup="menu" aria-label="Open profile menu" className="relative flex size-12 items-center justify-center rounded-full outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-slate-400" onClick={() => setMenuOpen((current) => !current)} type="button">
            <Avatar name={name} role={role} />
          </button>

          {menuOpen ? (
            <div className="absolute right-0 z-30 mt-3 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg" role="menu">
              <div className="px-3 py-2"><p className="text-sm font-semibold text-slate-900">{name}</p></div>
              <div className="my-1 h-px bg-slate-200" />
              <button className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100" onClick={() => { setMenuOpen(false); router.push("/dashboard/profile"); }} type="button">Profile</button>
              <button className="mt-1 flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100" onClick={() => { setMenuOpen(false); router.push("/dashboard/settings"); }} type="button">Settings</button>
              <div className="my-2 h-px bg-slate-200" />
              <button className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50" onClick={() => { setMenuOpen(false); onLogout(); }} type="button">Logout</button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
