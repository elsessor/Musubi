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
  role: "Admin" | "Student Leader" | "Organization Member";
  roleLabel: string;
  mobileOpen: boolean;
  collapsed?: boolean;
  navItems: DashboardNavItem[];
  activeNavId: string;
  onLogout: () => void;
  onNavigate: () => void;
  onToggleCollapse?: () => void;
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
      "flex size-12 shrink-0 items-center justify-center rounded-full text-base font-extrabold text-white",
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
  collapsed = false,
  navItems,
  activeNavId,
  onLogout,
  onNavigate,
  onToggleCollapse
}: SidebarProps) {
  const uniqueNavItems = navItems.filter(
    (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index
  );

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col bg-[#213f68] text-white shadow-xl transition-all duration-300 md:z-30 md:translate-x-0 md:shadow-none",
        mobileOpen && "translate-x-0",
        collapsed ? "w-20 md:w-20" : "w-72 max-w-[85vw] -translate-x-full md:w-[354px] md:max-w-none"
      )}
    >
      {/* Toggle Button on Sidebar Border */}
      {onToggleCollapse ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden md:flex absolute top-1/2 -right-3.5 -translate-y-1/2 size-7 rounded-full bg-white text-slate-600 shadow-md border border-slate-200 items-center justify-center hover:bg-slate-100 transition-all cursor-pointer z-50"
        >
          {collapsed ? (
            <ChevronRight className="size-4 text-slate-600" />
          ) : (
            <ChevronLeft className="size-4 text-slate-600" />
          )}
        </button>
      ) : null}

      {/* Top Header Logo */}
      <div className={cn(
        "flex min-h-[100px] items-center border-b border-white/10 py-5 md:min-h-[108px]",
        collapsed ? "justify-center px-2" : "px-5"
      )}>
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#2868ed] shadow-[0_10px_24px_rgba(20,80,192,0.3)]">
            <Zap className="size-6 text-white" strokeWidth={2.25} />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-[18px] font-extrabold leading-tight tracking-[-0.02em]">
                {role === "Admin" ? "AI Workflow & Task Orchestr" : "Musubi"}
              </p>
              <p className="mt-1 text-[16px] font-semibold leading-tight text-[#aebdd0]">
                {role === "Admin" ? "Admin Panel" : "Campus Organizations"}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* User Profile Header */}
      <div className={cn(
        "flex min-h-[104px] items-center border-b border-white/10 py-5 md:min-h-[115px]",
        collapsed ? "justify-center px-2" : "px-5"
      )}>
        <div className="flex items-center gap-4 min-w-0">
          <AvatarFallback name={userName} role={role} />
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-base font-extrabold leading-tight">{userName}</p>
              <p className="mt-1 truncate text-sm font-semibold leading-tight text-[#aebdd0]">{roleLabel}</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Navigation List */}
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
                    "group relative flex h-12 items-center gap-4 rounded-xl text-[17px] font-bold transition md:h-[60px] md:rounded-[17px] md:text-[18px]",
                    active
                      ? "bg-[#385779] text-white"
                      : "text-[#b4c1d3] hover:bg-white/[0.07] hover:text-white",
                    collapsed ? "justify-center px-0" : "px-4 md:px-5"
                  )}
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={cn("size-6 shrink-0 md:size-[26px]", active ? "text-white" : "text-[#afbed0]")} strokeWidth={1.8} />
                  {!collapsed ? <span className="flex-1 truncate">{item.label}</span> : null}

                  {item.badge ? (
                    <span
                      className={cn(
                        "inline-flex min-w-5 items-center justify-center rounded-full bg-[#ff2c62] px-1.5 py-0.5 text-[11px] font-extrabold text-white",
                        collapsed ? "absolute top-2 right-2 min-w-4 h-4 p-0 text-[10px]" : "absolute left-8 top-0.5 md:relative md:left-0 md:top-0"
                      )}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout Footer */}
      <div className="border-t border-white/10 px-3 py-4 md:py-[13px]">
        <button
          className={cn(
            "flex h-12 w-full items-center gap-4 rounded-xl text-[17px] font-bold text-[#b4c1d3] transition hover:bg-white/[0.07] hover:text-white md:h-[60px] md:rounded-[17px] md:text-[18px]",
            collapsed ? "justify-center px-0" : "px-4 md:px-5"
          )}
          onClick={onLogout}
          type="button"
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="size-6 shrink-0" strokeWidth={1.8} />
          {!collapsed ? <span>Logout</span> : null}
        </button>
      </div>
    </aside>
  );
}
