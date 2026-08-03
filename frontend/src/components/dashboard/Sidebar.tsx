"use client";

import {
  BarChart2,
  Bell,
  Briefcase,
  ChevronLeft,
  ChevronRight,
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
  roleLabel: string;
  navItems: DashboardNavItem[];
  activeNavId: string;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
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

function AvatarFallback({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  return (
    <div className="flex size-10 items-center justify-center rounded-full bg-slate-600 text-sm font-semibold text-white">
      {initials}
    </div>
  );
}

export function Sidebar({
  userName,
  roleLabel,
  navItems,
  activeNavId,
  onLogout,
  collapsed,
  onToggleCollapse
}: SidebarProps) {
  const uniqueNavItems = navItems.filter(
    (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index
  );

  const sidebarWidthClass = collapsed ? "w-[84px]" : "w-[280px]";

  return (
    <aside className={`fixed inset-y-0 left-0 z-30 flex flex-col overflow-visible bg-[#1e293b] text-white shadow-[8px_0_32px_rgba(15,23,42,0.12)] transition-[width] duration-300 ${sidebarWidthClass}`}>
      <div className={`border-b border-white/10 py-5 ${collapsed ? "px-4" : "px-6"}`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500 shadow-[0_10px_28px_rgba(59,130,246,0.32)]">
            <Zap className="size-5 text-white" />
          </div>
          {!collapsed ? (
            <div>
              <p className="text-lg font-semibold leading-none">Musubi</p>
              <p className="mt-1 text-xs font-medium text-slate-300">Campus Organizations</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className={`border-b border-white/10 py-5 ${collapsed ? "px-4" : "px-6"}`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
          <AvatarFallback name={userName} />
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-none">{userName}</p>
              <p className="mt-1 truncate text-xs font-medium text-slate-300">{roleLabel}</p>
            </div>
          ) : null}
        </div>
      </div>

      <nav className={`flex-1 py-4 ${collapsed ? "px-2" : "px-3"}`}>
        <ul className="space-y-1.5">
          {uniqueNavItems.map((item) => {
            const Icon = navIconMap[item.id as keyof typeof navIconMap] ?? LayoutGrid;
            const active = item.id === activeNavId;

            return (
              <li key={item.id}>
                <a
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center rounded-lg py-3 text-sm font-medium transition",
                    collapsed ? "justify-center px-0" : "gap-3 px-4",
                    active
                      ? "bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                      : "text-slate-300 hover:bg-white/6 hover:text-white"
                  )}
                  href={item.href}
                >
                  <Icon className={cn("size-4", active ? "text-white" : "text-slate-300")} />
                  {!collapsed ? <span className="flex-1">{item.label}</span> : null}
                  {item.badge ? (
                    <span className={cn(
                      "inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-semibold text-white",
                      collapsed ? "absolute right-1 top-1" : ""
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

      <div className={`border-t border-white/10 ${collapsed ? "p-3" : "p-4"}`}>
        <button
          className={cn(
            "flex w-full items-center rounded-lg py-3 text-sm font-medium text-slate-300 transition hover:bg-white/6 hover:text-white",
            collapsed ? "justify-center px-0" : "gap-3 px-4"
          )}
          onClick={onLogout}
          type="button"
        >
          <LogOut className="size-4" />
          {!collapsed ? <span>Logout</span> : null}
        </button>
      </div>

      <button
        aria-label="Collapse sidebar"
        className="absolute right-0 top-1/2 z-40 flex size-8 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-[0_8px_20px_rgba(15,23,42,0.12)]"
        onClick={onToggleCollapse}
        type="button"
      >
        {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
      </button>
    </aside>
  );
}