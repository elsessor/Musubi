import type { ReactNode } from "react";

type IconProps = {
  className?: string;
};

function BaseIcon({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

export function SidebarLogoIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path
        d="M13 2L4 14h7l-1 8 10-13h-7l1-7z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </BaseIcon>
  );
}

export function GridIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <rect height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" width="6" x="3" y="3" />
      <rect height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" width="6" x="15" y="3" />
      <rect height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" width="6" x="3" y="15" />
      <rect height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" width="6" x="15" y="15" />
    </BaseIcon>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <rect height="16" rx="2" stroke="currentColor" strokeWidth="1.8" width="16" x="4" y="5" />
      <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </BaseIcon>
  );
}

export function BuildingIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path
        d="M5 19V5h14v14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M8 8h2M8 12h2M14 8h2M14 12h2M10 19v-5h4v5" stroke="currentColor" strokeWidth="1.8" />
    </BaseIcon>
  );
}

export function ChartIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M5 19V5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M5 19h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M8 15v-3M12 15V8M16 15v-6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </BaseIcon>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path
        d="M12 8.2a3.8 3.8 0 100 7.6 3.8 3.8 0 000-7.6z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M19 12a7.6 7.6 0 00-.08-.98l1.62-1.25-1.56-2.7-1.93.77a7.3 7.3 0 00-1.7-.98l-.3-2.05h-3.12l-.3 2.05c-.6.2-1.18.53-1.7.98l-1.93-.77-1.56 2.7 1.62 1.25a7.6 7.6 0 000 1.96l-1.62 1.25 1.56 2.7 1.93-.77c.52.45 1.1.78 1.7.98l.3 2.05h3.12l.3-2.05c.6-.2 1.18-.53 1.7-.98l1.93.77 1.56-2.7-1.62-1.25c.05-.33.08-.66.08-.98z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
    </BaseIcon>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path
        d="M15 17H9m7-5V9a4 4 0 10-8 0v3c0 1.8-.6 2.8-1.4 3.8-.4.5-.1 1.2.6 1.2h10.6c.7 0 1-.7.6-1.2C16.6 14.8 16 13.8 16 12z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </BaseIcon>
  );
}

export function TargetIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" fill="currentColor" r="1.2" />
    </BaseIcon>
  );
}

export function BriefcaseIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path
        d="M9 7V6a1 1 0 011-1h4a1 1 0 011 1v1M4 9h16v8a2 2 0 01-2 2H6a2 2 0 01-2-2V9z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M4 12h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </BaseIcon>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path
        d="M15 19v-1a4 4 0 00-8 0v1M16.5 12.5a3 3 0 10-4.5-2.6M8.5 12.5a3 3 0 114.5-2.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </BaseIcon>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v4l3 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </BaseIcon>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path
        d="M20 7l-9 9-4-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </BaseIcon>
  );
}

export function SparkIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path
        d="M13 2l1.2 4.5L19 8l-4.8 1.5L13 14l-1.2-4.5L7 8l4.8-1.5L13 2zM6 14l.8 2.8L10 18l-3.2 1.2L6 22l-.8-2.8L2 18l3.2-1.2L6 14z"
        fill="currentColor"
      />
    </BaseIcon>
  );
}

export function LogoutIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M10 17l1.5-1.5M3 12h11" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path
        d="M8 5h6a2 2 0 012 2v10a2 2 0 01-2 2H8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </BaseIcon>
  );
}

export function ChevronIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </BaseIcon>
  );
}