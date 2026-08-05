"use client";

import {
  BarChart2,
  Bell,
  Briefcase,
  ClipboardList,
  FileText,
  LayoutGrid,
  LogOut,
  Settings,
  ShieldCheck,
  Target,
  Users,
  Zap
} from "lucide-react";

import type { DashboardNavItem } from "@/types/dashboard";
import { cn } from "@/utils/cn";

type SidebarProps = {
  userName: string;
  role: "Admin" | "Student Leader" | "Organization Member";
  roleLabel: string;
  mobileOpen: boolean;
  navItems: DashboardNavItem[];
  activeNavId: string;
  onLogout: () => void;
  onNavigate: () => void;
};

const navIconMap = {
  dashboard: LayoutGrid,
  events: Target,
  organization: Briefcase,
  analytics: BarChart2,
  notifications: Bell,
  settings: Settings,
  organizations: ClipboardList,
  "org-requests": FileText,
  members: Users,
  "audit-logs": ShieldCheck
} as const;

function AvatarFallback({ name, role }: { name: string; role: SidebarProps["role"] }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  return (
    <div className={cn(
      "flex size-12 items-center justify-center rounded-full text-base font-extrabold text-white",
      role === "Admin" ? "bg-[#ef2360]" : "bg-[#385779]"
    )}>
      {initials}
    </div>
  );
}

export function Sidebar({
  userName,
  role,
  roleLabel,
  mobileOpen,
  navItems,
  activeNavId,
  onLogout,
  onNavigate
}: SidebarProps) {
  const uniqueNavItems = navItems.filter(
    (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index
  );

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] -translate-x-full flex-col bg-[#213f68] text-white shadow-xl transition-transform duration-300 md:z-30 md:w-[354px] md:max-w-none md:translate-x-0 md:shadow-none",
      mobileOpen && "translate-x-0"
    )}>
      <div className="flex min-h-[100px] items-center border-b border-white/10 px-5 py-5 md:min-h-[108px]">
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#2868ed] shadow-[0_10px_24px_rgba(20,80,192,0.3)]">
            <Zap className="size-6 text-white" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[18px] font-extrabold leading-tight tracking-[-0.02em]">Musubi</p>
            <p className="mt-1 text-[16px] font-semibold leading-tight text-[#aebdd0]">Powered by Gemini and Groq</p>
          </div>
        </div>
      </div>

      <div className="flex min-h-[104px] items-center border-b border-white/10 px-5 py-5 md:min-h-[115px]">
        <div className="flex items-center gap-4">
          <AvatarFallback name={userName} role={role} />
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold leading-tight">{userName}</p>
            <p className="mt-1 truncate text-sm font-semibold leading-tight text-[#aebdd0]">{roleLabel}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 md:py-[14px]">
        <ul className="space-y-1">
          {uniqueNavItems.map((item) => {
            const Icon = navIconMap[item.id as keyof typeof navIconMap] ?? LayoutGrid;
            const active = item.id === activeNavId;

            return (
              <li key={item.id}>
                <a
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex h-12 items-center gap-4 rounded-xl px-4 text-[17px] font-bold transition md:h-[60px] md:rounded-[17px] md:px-5 md:text-[18px]",
                    active
                      ? "bg-[#385779] text-white"
                      : "text-[#b4c1d3] hover:bg-white/[0.07] hover:text-white"
                  )}
                  href={item.href}
                  onClick={onNavigate}
                >
                  <Icon className={cn("size-6 shrink-0 md:size-[26px]", active ? "text-white" : "text-[#afbed0]")} strokeWidth={1.8} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className={cn(
                      "absolute left-8 top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-[#ff2c62] px-1.5 py-0.5 text-[11px] font-extrabold text-white"
                    )}>
                      {item.badge}
                    </span>
                  ) : null}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-3 py-4 md:py-[13px]">
        <button
          className={cn(
            "flex h-12 w-full items-center gap-4 rounded-xl px-4 text-[17px] font-bold text-[#b4c1d3] transition hover:bg-white/[0.07] hover:text-white md:h-[60px] md:rounded-[17px] md:px-5 md:text-[18px]"
          )}
          onClick={onLogout}
          type="button"
        >
          <LogOut className="size-6" strokeWidth={1.8} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
