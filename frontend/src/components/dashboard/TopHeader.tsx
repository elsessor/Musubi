import { BellIcon } from "@/components/dashboard/DashboardIcons";

type TopHeaderProps = {
  name: string;
  organizationName: string;
  academicYear: string;
  greetingDate: string;
  notificationCount: number;
};

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  return (
    <div className="relative flex size-10 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white shadow-sm">
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
  notificationCount
}: TopHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-6 border-b border-slate-200 bg-white px-6 py-5 lg:px-8">
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
          className="relative flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:bg-slate-50"
          type="button"
        >
          <BellIcon className="size-5" />
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
            {notificationCount}
          </span>
        </button>

        <Avatar name={name} />
      </div>
    </header>
  );
}