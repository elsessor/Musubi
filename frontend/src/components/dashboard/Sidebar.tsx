import { Button } from "@/components/ui/Button";
import type { DashboardNavItem } from "@/types/dashboard";
import {
  BuildingIcon,
  CalendarIcon,
  ChartIcon,
  ChevronIcon,
  GridIcon,
  LogoutIcon,
  SidebarLogoIcon,
  SettingsIcon,
  UsersIcon
} from "@/components/dashboard/DashboardIcons";
import { cn } from "@/utils/cn";

type SidebarProps = {
  userName: string;
  roleLabel: string;
  navItems: DashboardNavItem[];
  activeNavId: string;
  onLogout: () => void;
};

const navIconMap = {
  dashboard: GridIcon,
  events: CalendarIcon,
  organization: BuildingIcon,
  analytics: ChartIcon,
  notifications: UsersIcon,
  settings: SettingsIcon
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

export function Sidebar({ userName, roleLabel, navItems, activeNavId, onLogout }: SidebarProps) {
  return (
    <aside className="relative flex h-full w-[278px] flex-col bg-[#1e293b] text-white shadow-[8px_0_32px_rgba(15,23,42,0.08)]">
      <div className="border-b border-white/8 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-blue-500 shadow-[0_6px_20px_rgba(59,130,246,0.35)]">
            <SidebarLogoIcon className="size-4 text-white" />
          </div>
          <div>
            <p className="text-lg font-semibold leading-none">Musubi</p>
            <p className="mt-1 text-xs font-medium text-slate-300">Campus Organizations</p>
          </div>
        </div>
      </div>

      <div className="border-b border-white/8 px-6 py-5">
        <div className="flex items-center gap-3">
          <AvatarFallback name={userName} />
          <div>
            <p className="text-sm font-semibold leading-none">{userName}</p>
            <p className="mt-1 text-xs font-medium text-slate-300">{roleLabel}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = navIconMap[item.id as keyof typeof navIconMap] ?? GridIcon;
            const active = item.id === activeNavId;

            return (
              <li key={item.id}>
                <a
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                    active
                      ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                      : "text-slate-300 hover:bg-white/6 hover:text-white"
                  )}
                  href={item.href}
                >
                  <Icon className={cn("size-4", active ? "text-white" : "text-slate-300")} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/8 px-4 py-4">
        <Button
          className="w-full justify-start gap-3 rounded-2xl bg-transparent px-4 text-left text-slate-300 hover:bg-white/6 hover:text-white"
          onClick={onLogout}
          variant="ghost"
        >
          <LogoutIcon className="size-4" />
          Logout
        </Button>
      </div>

      <button
        aria-label="Collapse sidebar"
        className="absolute right-[-12px] top-1/2 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-soft lg:flex"
        type="button"
      >
        <ChevronIcon className="size-4" />
      </button>
    </aside>
  );
}