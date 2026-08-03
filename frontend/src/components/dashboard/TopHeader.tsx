"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

type TopHeaderProps = {
  name: string;
  organizationName: string;
  academicYear: string;
  greetingDate: string;
  notificationCount: number;
  onLogout: () => void;
};

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  return (
    <div className="relative flex size-10 items-center justify-center rounded-full bg-[#1e3a5f] text-sm font-semibold text-white shadow-sm">
      {initials}
      <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-white bg-emerald-500" />
    </div>
  );
}

export function TopHeader({
  name,
  organizationName,
  academicYear,
  greetingDate,
  notificationCount,
  onLogout
}: TopHeaderProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 flex items-start justify-between gap-6 border-b border-slate-200/80 bg-[#eef1f5]/95 px-6 py-5 backdrop-blur lg:px-8">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">
          Welcome, {name} 👋
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-500">
          {organizationName} · {academicYear} · {greetingDate}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          aria-label={`Notifications ${notificationCount}`}
          className="relative flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:bg-slate-50"
          type="button"
        >
          <Bell className="size-5" />
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
            {notificationCount}
          </span>
        </button>

        <div ref={menuRef} className="relative">
          <button
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Open profile menu"
            className="focus-visible:ring-ring relative flex size-11 items-center justify-center rounded-full outline-none ring-offset-2 transition focus-visible:ring-2"
            onClick={() => setMenuOpen((current) => !current)}
            type="button"
          >
            <Avatar name={name} />
          </button>

          {menuOpen ? (
            <div
              className="absolute right-0 z-30 mt-3 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
              role="menu"
            >
              <div className="px-3 py-2">
                <p className="text-sm font-semibold text-slate-900">{name}</p>
              </div>
              <div className="my-1 h-px bg-slate-200" />
            <button
              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              onClick={() => {
                setMenuOpen(false);
                router.push("/dashboard/profile");
              }}
              type="button"
            >
              Profile
            </button>
            <button
              className="mt-1 flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
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
              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
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